import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SessionController } from './controller/session.controller';
import { SessionService } from './service/session.service';
import { SessionRepository } from './repository/repository.repository';

import { SessionModel } from './session.model';

@Module({
  imports: [TypeOrmModule.forFeature([SessionModel])],
  controllers: [SessionController],
  providers: [SessionService, SessionRepository],
  exports: [SessionService, SessionRepository],
})
export class SessionModule {}
