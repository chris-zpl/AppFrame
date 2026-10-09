import {
  Controller,
  Get,
  Param,
  Delete,
  ParseUUIDPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UserResponseDto } from './dto/response/user-response.dto';
import { UserSessionResponseDto } from './dto/response/user-session-response.dto';

@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
