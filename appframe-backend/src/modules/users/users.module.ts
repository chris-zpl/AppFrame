import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserSession } from './entities/user-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserSession])],
  exports: [TypeOrmModule],
})
export class UsersModule {}
