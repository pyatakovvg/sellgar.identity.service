import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { FindSessionDto } from './dto/find-session.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { RefreshSessionDto } from './dto/refresh-session.dto';
import { RestoreSessionDto } from './dto/restore-session.dto';
import { RemoveSessionDto } from './dto/remove-session.dto';

import { SessionEntity } from '../session.entity';

import { SessionService } from '../service/session.service';
import { SessionControllerInterface } from './session-controller.interface';

@Controller()
export class SessionController implements SessionControllerInterface {
  constructor(private readonly sessionService: SessionService) {}

  @MessagePattern({ cmd: 'identity.session.find' })
  async find(@Payload() dto: FindSessionDto): Promise<SessionEntity | null> {
    return await this.sessionService.find(dto);
  }

  @MessagePattern({ cmd: 'identity.session.create' })
  async create(@Payload() dto: CreateSessionDto): Promise<SessionEntity> {
    const lastSession = await this.sessionService.find({
      userUuid: dto.userUuid,
      fingerprint: dto.fingerprint,
    });

    if (lastSession) {
      if (!!lastSession.isRevoked) {
        throw new Error('Session is revoked');
      }

      return await this.sessionService.restore({
        sessionUuid: lastSession.uuid,
        fingerprint: lastSession.fingerprint,
      });
    }
    return await this.sessionService.create(dto);
  }

  @MessagePattern({ cmd: 'identity.session.refresh' })
  async refresh(@Payload() dto: RefreshSessionDto): Promise<SessionEntity> {
    return await this.sessionService.refresh(dto);
  }

  @MessagePattern({ cmd: 'identity.session.restore' })
  async restore(@Payload() dto: RestoreSessionDto): Promise<SessionEntity> {
    return await this.sessionService.restore(dto);
  }

  @MessagePattern({ cmd: 'identity.session.remove' })
  async remove(@Payload() dto: RemoveSessionDto): Promise<SessionEntity> {
    return await this.sessionService.remove(dto);
  }
}
