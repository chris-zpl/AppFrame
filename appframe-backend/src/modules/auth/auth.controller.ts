import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Req,
  Res,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  ParseUUIDPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/request/register.dto';
import { LoginDto } from './dto/request/login.dto';
import { RefreshTokenDto } from './dto/request/refresh-token.dto';
import { Enable2faDto } from './dto/request/enable-2fa.dto';
import { Verify2faDto } from './dto/request/verify-2fa.dto';
import { ChangePasswordDto } from './dto/request/change-password.dto';
import { DeleteAccountDto } from './dto/request/delete-account.dto';
import { UpdateProfileDto } from './dto/request/update-profile.dto';
import { ForgotPasswordDto } from './dto/request/forgot-password.dto';
import { ResetPasswordDto } from './dto/request/reset-password.dto';

import { AuthResponseDto } from './dto/response/auth-response.dto';
import { Generate2faResponseDto } from './dto/response/generate-2fa-response.dto';
import { ActiveSessionResponseDto } from './dto/response/active-session-response.dto';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser } from './interfaces/jwt-payload.interface';
import { GoogleProfile } from './strategies/google.strategy';

@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  private readonly frontendUrl: string;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
  }

  private extractMeta(req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return { ip, userAgent };
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken?: string,
    rememberMe: boolean = false,
  ) {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production' &&
      this.configService.get<string>('COOKIE_SECURE') !== 'false';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      ...(rememberMe ? { maxAge: 15 * 60 * 1000 } : {}),
    });

    if (refreshToken) {
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        ...(rememberMe ? { maxAge: 30 * 24 * 60 * 60 * 1000 } : {}),
      });
    }
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
  }

  // --- Google OAuth 2.0 ---

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Redireciona para o consentimento do Google
  }

  @Get('google/connect')
  @UseGuards(JwtAuthGuard)
  async googleConnect(
    @CurrentUser('userId') userId: string,
    @Res() res: Response,
  ) {
    const { url } = this.authService.getGoogleConnectUrl(userId);
    return res.redirect(url);
  }

  @Get('google/connect-url')
  @UseGuards(JwtAuthGuard)
  async getGoogleConnectUrl(@CurrentUser('userId') userId: string) {
    return this.authService.getGoogleConnectUrl(userId);
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const googleProfile = req.user as GoogleProfile;
    const meta = this.extractMeta(req);
    const stateParam = (req.query?.state as string) || '';

    // 1. Verifica se a requisição originou de um fluxo de vinculação de conta (Settings)
    const linkUserId = this.authService.verifyGoogleLinkState(stateParam);
    if (linkUserId) {
      const linkResult = await this.authService.linkGoogleAccount(
        linkUserId,
        googleProfile,
        meta,
      );

      if (!linkResult.success || !linkResult.user) {
        return res.redirect(
          `${this.frontendUrl}/settings?error=${encodeURIComponent(
            linkResult.error || 'Falha ao vincular conta Google.',
          )}`,
        );
      }

      return res.redirect(`${this.frontendUrl}/settings?google_linked=true`);
    }

    // 2. Se stateParam tinha a intenção de vincular conta Google mas expirou ou é inválido
    if (this.authService.isGoogleLinkState(stateParam)) {
      return res.redirect(
        `${this.frontendUrl}/settings?error=${encodeURIComponent(
          'A solicitação de vinculação da conta Google expirou ou é inválida. Por favor, tente novamente.',
        )}`,
      );
    }

    // 3. Fluxo de autenticação Google: extrai preferência de rememberMe
    const rememberMe = this.authService.verifyGoogleLoginState(stateParam) ?? false;

    const authResult = await this.authService.handleGoogleCallback(
      googleProfile,
      meta,
      rememberMe,
    );

    // Se o usuário possui 2FA ativo, redireciona com o token temporário de desafio e o flag de rememberMe
    if (authResult.require_2fa && authResult.temp_token) {
      return res.redirect(
        `${this.frontendUrl}/auth/2fa?tempToken=${encodeURIComponent(authResult.temp_token)}&rememberMe=${rememberMe}`,
      );
    }

    // Configura cookies seguros antes do redirecionamento
    if (authResult.access_token && authResult.refresh_token) {
      this.setAuthCookies(
        res,
        authResult.access_token,
        authResult.refresh_token,
        rememberMe,
      );
    }

    // Redirecionamento seguro para a aplicação cliente apenas com rememberMe (autenticação via cookies HttpOnly)
    const redirectUrl = new URL(`${this.frontendUrl}/auth/callback`);
    redirectUrl.searchParams.set('rememberMe', String(rememberMe));

    return res.redirect(redirectUrl.toString());
  }

  // --- Autenticação Local e Rotação ---

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    return this.authService.register(dto, this.extractMeta(req));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(dto, this.extractMeta(req));
    if (result.access_token && result.refresh_token) {
      this.setAuthCookies(
        res,
        result.access_token,
        result.refresh_token,
        Boolean(result.remember_me ?? dto.rememberMe),
      );
    }
    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const token = req.cookies?.['refresh_token'] || dto?.refreshToken;
    if (!token) {
      throw new UnauthorizedException('Refresh token não encontrado nos cookies ou payload.');
    }
    const result = await this.authService.refreshTokens({ refreshToken: token }, this.extractMeta(req));
    if (result.access_token && result.refresh_token) {
      this.setAuthCookies(
        res,
        result.access_token,
        result.refresh_token,
        Boolean(result.remember_me),
      );
    }
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean; message: string }> {
    await this.authService.logout(user);
    this.clearAuthCookies(res);
    return { success: true, message: 'Sessão encerrada e removida com sucesso.' };
  }

  // --- Segundo Fator de Autenticação (2FA) ---

  @Post('2fa/generate')
  @UseGuards(JwtAuthGuard)
  async generate2fa(
    @CurrentUser('userId') userId: string,
  ): Promise<Generate2faResponseDto> {
    return this.authService.generate2faSecret(userId);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  async enable2fa(
    @CurrentUser('userId') userId: string,
    @Body() dto: Enable2faDto,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    return this.authService.enable2fa(userId, dto, this.extractMeta(req));
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  async disable2fa(
    @CurrentUser('userId') userId: string,
    @Body('token') token: string,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    return this.authService.disable2fa(userId, token, this.extractMeta(req));
  }

  @Get('2fa/recovery-codes')
  @UseGuards(JwtAuthGuard)
  async getRecoveryCodes(
    @CurrentUser('userId') userId: string,
  ): Promise<{ recovery_codes: string[] }> {
    return this.authService.getRecoveryCodes(userId);
  }

  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  async verify2fa(
    @Body() dto: Verify2faDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.verify2faChallenge(dto, this.extractMeta(req));
    if (result.access_token && result.refresh_token) {
      this.setAuthCookies(
        res,
        result.access_token,
        result.refresh_token,
        Boolean(result.remember_me),
      );
    }
    return result;
  }

  // --- Perfil Atual ---

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(
    @CurrentUser('userId') userId: string,
  ) {
    return this.authService.getProfile(userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateProfileDto,
    @Req() req: Request,
  ) {
    return this.authService.updateProfile(userId, dto, this.extractMeta(req));
  }

  @Post('google/unlink')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async unlinkGoogle(
    @CurrentUser('userId') userId: string,
    @Req() req: Request,
  ) {
    return this.authService.unlinkGoogle(userId, this.extractMeta(req));
  }

  // --- Gerenciamento de Sessões ---

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async listSessions(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ActiveSessionResponseDto[]> {
    return this.authService.getSessions(user.userId, user.sessionId);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  async revokeSession(
    @CurrentUser('userId') userId: string,
    @Param('id', new ParseUUIDPipe()) sessionId: string,
    @Req() req: Request,
  ): Promise<{ revoked: boolean }> {
    return this.authService.revokeSession(userId, sessionId, this.extractMeta(req));
  }

  @Post('sessions/revoke-others')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async revokeOthers(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<{ revokedCount: number }> {
    return this.authService.revokeOtherSessions(user.userId, user.sessionId, this.extractMeta(req));
  }

  // --- Perfil e Ciclo de Vida ---

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    return this.authService.changePassword(user.userId, user.sessionId, dto, this.extractMeta(req));
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  async deleteAccount(
    @CurrentUser('userId') userId: string,
    @Body() dto: DeleteAccountDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ deleted: boolean }> {
    const result = await this.authService.deleteAccount(userId, dto);
    this.clearAuthCookies(res);
    return result;
  }

  // --- Redefinição de Senha (Fluxo Público) ---

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.requestPasswordReset(dto.email, this.extractMeta(req));
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.resetPassword(dto, this.extractMeta(req));
  }
}
