import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { AuthLoginDto } from './dto/auth-login.dto';

import { AuthService } from '../service/auth.service';
import { SessionService } from '../../session/service/session.service';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  @MessagePattern({ cmd: 'identity.auth.signIn' })
  async signIn(@Payload() dto: AuthLoginDto) {
    const user = await this.authService.verifyCredentials(dto.login, dto.password);

    return await this.sessionService.create({
      userUuid: user.uuid,
      device: dto.device,
      fingerprint: dto.fingerprint,
      clientType: dto.clientType,
      gateway: dto.gateway,
      authMethod: 'password',
      assuranceLevel: 'medium',
    });
  }
}
