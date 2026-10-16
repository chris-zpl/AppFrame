import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../../users/enums/user-role.enum';
import { AdminUsersService } from '../services/admin-users.service';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) {}

  @Get()
  async listUsers() {
    return this.usersService.listUsers();
  }

  @Get('audit-logs')
  async getAuditLogs(@Query('userId') userId?: string) {
    return this.usersService.getAuditLogs(userId);
  }

  @Get('sessions')
  async listActiveSessions(@CurrentUser() adminUser: AuthenticatedUser) {
    return this.usersService.listActiveSessions(adminUser);
  }

  @Patch(':id/role')
  @Roles(UserRole.SUPER_ADMIN)
  async updateUserRole(
    @CurrentUser() adminUser: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) targetUserId: string,
    @Body('role') role: UserRole,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket?.remoteAddress || undefined;
    const userAgent = (req.headers['user-agent'] as string) || undefined;
    return this.usersService.updateUserRole(adminUser, targetUserId, role, {
      ipAddress: ip,
      userAgent: userAgent,
    });
  }

  @Patch(':id/status')
  async updateUserStatus(
    @CurrentUser() adminUser: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) targetUserId: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    const isActive =
      body?.is_active !== undefined
        ? Boolean(body.is_active)
        : Boolean(body?.isActive);
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket?.remoteAddress || undefined;
    const userAgent = (req.headers['user-agent'] as string) || undefined;
    return this.usersService.updateUserStatus(adminUser, targetUserId, isActive, {
      ipAddress: ip,
      userAgent: userAgent,
    });
  }

  @Delete('sessions/:id')
  async revokeSession(
    @CurrentUser() adminUser: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) sessionId: string,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket?.remoteAddress || undefined;
    const userAgent = (req.headers['user-agent'] as string) || undefined;
    return this.usersService.revokeSession(adminUser, sessionId, {
      ipAddress: ip,
      userAgent: userAgent,
    });
  }
}
