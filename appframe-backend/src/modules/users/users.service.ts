import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserSession } from './entities/user-session.entity';
import { UserResponseDto } from './dto/response/user-response.dto';
import { UserSessionResponseDto } from './dto/response/user-session-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSession)
    private readonly sessionRepository: Repository<UserSession>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { google_id: googleId } });
  }

  /**
   * Retorna perfil seguro garantindo que nenhuma informação sigilosa vaze.
   */
  async getUserProfile(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return UserResponseDto.fromEntity(user);
  }

  /**
   * Retorna histórico de sessões ativas do usuário com dados higienizados.
   */
  async getUserSessions(userId: string): Promise<UserSessionResponseDto[]> {
    const sessions = await this.sessionRepository.find({
      where: { user_id: userId, is_revoked: false },
      order: { last_active_at: 'DESC' },
    });
    return UserSessionResponseDto.fromEntities(sessions);
  }

  async revokeSession(sessionId: string, userId: string): Promise<boolean> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, user_id: userId },
    });
    if (!session) {
      throw new NotFoundException('Sessão não encontrada.');
    }
    session.is_revoked = true;
    await this.sessionRepository.save(session);
    return true;
  }
}
