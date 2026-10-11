import {
  Controller,
  Post,
  Get,
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

  private setAuthCookies(res: Response, accessToken: string, refreshToken?: string) {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production' &&
      this.configService.get<string>('COOKIE_SECURE') !== 'false';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });

    if (refreshToken) {
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/api/v1/auth/refresh',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
  }

  // --- Google OAuth 2.0 ---

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Redireciona para o consentimento do Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const googleProfile = req.user as GoogleProfile;
    const meta = this.extractMeta(req);

    const authResult = await this.authService.handleGoogleCallback(
      googleProfile,
      meta,
    );

    // Se o usuário possui 2FA ativo, redireciona com o token temporário de desafio
    if (authResult.require_2fa && authResult.temp_token) {
      return res.redirect(
        `${this.frontendUrl}/auth/2fa?tempToken=${encodeURIComponent(authResult.temp_token)}`,
      );
    }

    // Configura cookies seguros antes do redirecionamento
    if (authResult.access_token && authResult.refresh_token) {
      this.setAuthCookies(res, authResult.access_token, authResult.refresh_token);
    }

    // Redirecionamento seguro para a aplicação cliente com os tokens
    const redirectUrl = new URL(`${this.frontendUrl}/auth/callback`);
    redirectUrl.searchParams.set('token', authResult.access_token || '');
    redirectUrl.searchParams.set('refreshToken', authResult.refresh_token || '');

    return res.redirect(redirectUrl.toString());
  }

  // --- Autenticação Local e Rotação ---

  @Get('register')
  getRegisterRedirect(@Res() res: Response) {
    return res.redirect(`${this.frontendUrl}/register`);
  }

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register(dto, this.extractMeta(req));
    if (result.access_token && result.refresh_token) {
      this.setAuthCookies(res, result.access_token, result.refresh_token);
    }
    return result;
  }

  @Get('login')
  getLoginRedirect(@Res() res: Response) {
    return res.redirect(`${this.frontendUrl}/login`);
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
      this.setAuthCookies(res, result.access_token, result.refresh_token);
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
      this.setAuthCookies(res, result.access_token, result.refresh_token);
    }
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean; message: string }> {
    this.clearAuthCookies(res);
    return { success: true, message: 'Sessão encerrada e cookies limpos com sucesso.' };
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
  ): Promise<{ success: boolean }> {
    return this.authService.enable2fa(userId, dto);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  async disable2fa(
    @CurrentUser('userId') userId: string,
    @Body('token') token: string,
  ): Promise<{ success: boolean }> {
    return this.authService.disable2fa(userId, token);
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
      this.setAuthCookies(res, result.access_token, result.refresh_token);
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
  ): Promise<{ revoked: boolean }> {
    return this.authService.revokeSession(userId, sessionId);
  }

  @Post('sessions/revoke-others')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async revokeOthers(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ revokedCount: number }> {
    return this.authService.revokeOtherSessions(user.userId, user.sessionId);
  }

  // --- Perfil e Ciclo de Vida ---

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ success: boolean }> {
    return this.authService.changePassword(user.userId, user.sessionId, dto);
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  async deleteAccount(
    @CurrentUser('userId') userId: string,
    @Body() dto: DeleteAccountDto,
  ): Promise<{ deleted: boolean }> {
    return this.authService.deleteAccount(userId, dto);
  }
}
