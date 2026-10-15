import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
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

  @Get('sessions')
  async listActiveSessions() {
    return this.usersService.listActiveSessions();
  }

  @Patch(':id/role')
  @Roles(UserRole.SUPER_ADMIN)
  async updateUserRole(
    @CurrentUser() adminUser: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) targetUserId: string,
    @Body('role') role: UserRole,
  ) {
    return this.usersService.updateUserRole(adminUser, targetUserId, role);
  }

  @Patch(':id/status')
  async updateUserStatus(
    @CurrentUser() adminUser: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) targetUserId: string,
    @Body('is_active') isActive: boolean,
  ) {
    return this.usersService.updateUserStatus(adminUser, targetUserId, isActive);
  }

  @Delete('sessions/:id')
  async revokeSession(
    @CurrentUser() adminUser: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) sessionId: string,
  ) {
    return this.usersService.revokeSession(adminUser, sessionId);
  }
}
