import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Param,
  Delete,
  ParseUUIDPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { UserResponseDto } from './dto/response/user-response.dto';
import { UserSessionResponseDto } from './dto/response/user-session-response.dto';
import { RegisterDto } from '../auth/dto/request/register.dto';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from './enums/user-role.enum';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.register(dto, { ip, userAgent });
  }

  @Get(':id/profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const isOwner = currentUser.userId === id;
    const isAdmin =
      currentUser.role === UserRole.SUPER_ADMIN ||
      currentUser.role === UserRole.ADMIN;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Acesso negado aos dados de outro usuário.');
    }
    return this.usersService.getUserProfile(id);
  }

  @Get(':id/sessions')
  @UseGuards(JwtAuthGuard)
  async getSessions(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserSessionResponseDto[]> {
    const isOwner = currentUser.userId === id;
    const isAdmin =
      currentUser.role === UserRole.SUPER_ADMIN ||
      currentUser.role === UserRole.ADMIN;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Acesso negado às sessões de outro usuário.');
    }
    return this.usersService.getUserSessions(id);
  }

  @Delete(':userId/sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  async revokeSession(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ revoked: boolean }> {
    const isOwner = currentUser.userId === userId;
    const isAdmin =
      currentUser.role === UserRole.SUPER_ADMIN ||
      currentUser.role === UserRole.ADMIN;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Acesso negado para revogar sessões de outro usuário.');
    }
    const revoked = await this.usersService.revokeSession(sessionId, userId);
    return { revoked };
  }
}

