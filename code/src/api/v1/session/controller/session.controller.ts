import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { FindSessionDto } from './dto/find-session.dto';
import { RemoveSessionDto } from './dto/remove-session.dto';
import { VerifySessionDto } from './dto/verify-session.dto';
import { RenewSessionDto } from './dto/renew-session.dto';

import { SessionCreateDto } from '../service/dto/session-create.dto';

import { SessionService } from '../service/session.service';
import { SessionControllerInterface } from './session-controller.interface';
import { IssueGuestSessionDto } from './dto/issue-guest-session.dto';
import { CheckSessionDto } from './dto/check-session.dto';

@Controller()
export class SessionController implements SessionControllerInterface {
  constructor(private readonly sessionService: SessionService) {}

  @MessagePattern({ cmd: 'identity.session.find' })
  async find(@Payload() dto: FindSessionDto) {
    return await this.sessionService.find(dto);
  }

  @MessagePattern({ cmd: 'identity.session.issue' })
  async issue(@Payload() dto: SessionCreateDto) {
    return await this.sessionService.create(dto);
  }

  @MessagePattern({ cmd: 'identity.session.issueGuest' })
  issueGuest(@Payload() dto: IssueGuestSessionDto) {
    return this.sessionService.issueGuest(dto);
  }

  @MessagePattern({ cmd: 'identity.session.verify' })
  async verify(@Payload() dto: VerifySessionDto) {
    return await this.sessionService.verify(dto);
  }

  @MessagePattern({ cmd: 'identity.session.check' })
  check(@Payload() dto: CheckSessionDto) {
    return this.sessionService.check(dto.sessionUuid);
  }

  @MessagePattern({ cmd: 'identity.session.renew' })
  async renew(@Payload() dto: RenewSessionDto) {
    return await this.sessionService.renew(dto);
  }

  @MessagePattern({ cmd: 'identity.session.revoke' })
  async revoke(@Payload() dto: RemoveSessionDto) {
    return await this.sessionService.remove(dto);
  }
}
