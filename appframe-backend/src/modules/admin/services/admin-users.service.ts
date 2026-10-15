import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UserSession } from '../../users/entities/user-session.entity';
import { VideoJob } from '../../media/entities/video-job.entity';
import { UserRole } from '../../users/enums/user-role.enum';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';

export interface UserManagementItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  active_sessions_count: number;
  video_jobs_count: number;
  created_at: Date;
}

export interface ActiveSessionItem {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: UserRole;
  ip_address: string | null;
  user_agent: string | null;
  device_name: string | null;
  last_active_at: Date;
  created_at: Date;
  expires_at: Date;
}

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSession)
    private readonly sessionRepository: Repository<UserSession>,
    @InjectRepository(VideoJob)
    private readonly videoJobRepository: Repository<VideoJob>,
  ) {}

  /**
   * Lista todos os usuários cadastrados com suas respectivas métricas.
   */
  async listUsers(): Promise<UserManagementItem[]> {
    const users = await this.userRepository.find({
      order: { created_at: 'DESC' },
    });

    const now = new Date();
    const result: UserManagementItem[] = [];

    for (const u of users) {
      let role = u.role || UserRole.USER;
      if (u.email && u.email.toLowerCase() === 'christian.zimpel@gmail.com') {
        role = UserRole.SUPER_ADMIN;
      }

      const [activeSessionsCount, videoJobsCount] = await Promise.all([
        this.sessionRepository.count({
          where: {
            user_id: u.id,
            is_revoked: false,
            expires_at: MoreThan(now),
          },
        }),
        this.videoJobRepository.count({
          where: { user_id: u.id },
        }),
      ]);

      result.push({
        id: u.id,
        name: u.name,
        email: u.email,
        role,
        is_active: u.is_active !== undefined ? u.is_active : true,
        active_sessions_count: activeSessionsCount,
        video_jobs_count: videoJobsCount,
        created_at: u.created_at,
      });
    }

    return result;
  }

  /**
   * Atualiza a função (role) de um usuário.
   * Regra estrita: Somente o Super Admin pode alterar funções.
   * christian.zimpel@gmail.com é protegido contra alterações.
   */
  async updateUserRole(
    adminUser: AuthenticatedUser,
    targetUserId: string,
    newRole: UserRole,
  ): Promise<{ success: boolean; message: string; role: UserRole }> {
    const isSuperAdmin =
      adminUser.role === UserRole.SUPER_ADMIN ||
      adminUser.email.toLowerCase() === 'christian.zimpel@gmail.com';

    if (!isSuperAdmin) {
      throw new ForbiddenException(
        'Apenas o Super Admin pode alterar permissões e níveis de acesso de usuários.',
      );
    }

    const targetUser = await this.userRepository.findOne({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (targetUser.email && targetUser.email.toLowerCase() === 'christian.zimpel@gmail.com') {
      throw new ForbiddenException('O perfil do Super Admin da plataforma não pode ser alterado.');
    }

    if (newRole === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Apenas christian.zimpel@gmail.com pode deter o perfil Super Admin.');
    }

    targetUser.role = newRole;
    await this.userRepository.save(targetUser);

    return {
      success: true,
      message: `Função do usuário atualizada para ${newRole}.`,
      role: newRole,
    };
  }

  /**
   * Ativa ou desativa uma conta de usuário.
   * Se desativada, revoga imediatamente todas as sessões ativas do usuário.
   */
  async updateUserStatus(
    adminUser: AuthenticatedUser,
    targetUserId: string,
    isActive: boolean,
  ): Promise<{ success: boolean; message: string }> {
    const targetUser = await this.userRepository.findOne({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (targetUser.email && targetUser.email.toLowerCase() === 'christian.zimpel@gmail.com') {
      throw new ForbiddenException('O Super Admin não pode ser desativado.');
    }

    const isSuperAdmin =
      adminUser.role === UserRole.SUPER_ADMIN ||
      adminUser.email.toLowerCase() === 'christian.zimpel@gmail.com';

    // Admins não podem desativar outros Admins
    if (!isSuperAdmin && targetUser.role === UserRole.ADMIN) {
      throw new ForbiddenException('Admins não podem desativar contas de outros administradores.');
    }

    targetUser.is_active = Boolean(isActive);
    await this.userRepository.save(targetUser);

    if (!isActive) {
      // Força logout imediato em todos os dispositivos
      await this.sessionRepository.update(
        { user_id: targetUserId, is_revoked: false },
        { is_revoked: true },
      );
    }

    return {
      success: true,
      message: isActive
        ? 'Conta de usuário ativada com sucesso.'
        : 'Conta desativada e todas as sessões ativas foram desconectadas.',
    };
  }

  /**
   * Lista todas as sessões ativas (logadas) na plataforma.
   */
  async listActiveSessions(): Promise<ActiveSessionItem[]> {
    const now = new Date();
    const sessions = await this.sessionRepository.find({
      where: {
        is_revoked: false,
        expires_at: MoreThan(now),
      },
      relations: ['user'],
      order: { last_active_at: 'DESC' },
    });

    return sessions.map((s) => {
      let role = s.user?.role || UserRole.USER;
      if (s.user?.email && s.user.email.toLowerCase() === 'christian.zimpel@gmail.com') {
        role = UserRole.SUPER_ADMIN;
      }

      return {
        id: s.id,
        user_id: s.user_id,
        user_name: s.user?.name || 'Desconhecido',
        user_email: s.user?.email || 'Sem email',
        user_role: role,
        ip_address: s.ip_address,
        user_agent: s.user_agent,
        device_name: s.device_name,
        last_active_at: s.last_active_at,
        created_at: s.created_at,
        expires_at: s.expires_at,
      };
    });
  }

  /**
   * Revoga e desconecta uma sessão específica imediatamente.
   */
  async revokeSession(
    adminUser: AuthenticatedUser,
    sessionId: string,
  ): Promise<{ success: boolean; message: string }> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['user'],
    });

    if (!session) {
      throw new NotFoundException('Sessão não encontrada ou já expirada.');
    }

    const isSuperAdmin =
      adminUser.role === UserRole.SUPER_ADMIN ||
      adminUser.email.toLowerCase() === 'christian.zimpel@gmail.com';

    if (session.user?.email && session.user.email.toLowerCase() === 'christian.zimpel@gmail.com') {
      if (!isSuperAdmin) {
        throw new ForbiddenException('Você não tem permissão para revogar a sessão do Super Admin.');
      }
    }

    if (!isSuperAdmin && session.user?.role === UserRole.ADMIN) {
      throw new ForbiddenException('Admins só podem desconectar sessões de usuários comuns.');
    }

    session.is_revoked = true;
    await this.sessionRepository.save(session);

    return {
      success: true,
      message: `Sessão do usuário ${session.user?.name || session.user_id} desconectada com sucesso.`,
    };
  }
}
