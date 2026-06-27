import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SessionModule } from '../session/session.module';

import { AuthRepository } from './repository/auth.repository';
import { AuthService } from './service/auth.service';
import { AuthController } from './controller/auth.controller';

import { UserModel } from '../user/user.model';
import { SessionModel } from '../session/session.model';

@Module({
  imports: [SessionModule, TypeOrmModule.forFeature([UserModel, SessionModel])],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository],
})
export class AuthModule {}
