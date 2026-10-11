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
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { UserResponseDto } from './dto/response/user-response.dto';
import { UserSessionResponseDto } from './dto/response/user-session-response.dto';
import { RegisterDto } from '../auth/dto/request/register.dto';
import { AuthService } from '../auth/auth.service';

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
  async getProfile(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<UserResponseDto> {
    return this.usersService.getUserProfile(id);
  }

  @Get(':id/sessions')
  async getSessions(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<UserSessionResponseDto[]> {
    return this.usersService.getUserSessions(id);
  }

  @Delete(':userId/sessions/:sessionId')
  async revokeSession(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
  ): Promise<{ revoked: boolean }> {
    const revoked = await this.usersService.revokeSession(sessionId, userId);
    return { revoked };
  }
}
