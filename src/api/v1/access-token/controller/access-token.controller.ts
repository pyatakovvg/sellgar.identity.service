import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { VerifyAccessTokenDto } from './dto/verify-access-token.dto';
import { GenerateAccessTokenDto } from './dto/generate-access-token.dto';

import { AccessTokenService } from '../service/access-token.service';

@Controller()
export class AccessTokenController {
  constructor(private readonly accessTokenService: AccessTokenService) {}

  @MessagePattern({ cmd: 'identity.access-token.generate' })
  generate(@Payload() dto: GenerateAccessTokenDto) {
    return this.accessTokenService.generate(dto);
  }

  @MessagePattern({ cmd: 'identity.access-token.verify' })
  verify(@Payload() dto: VerifyAccessTokenDto) {
    return this.accessTokenService.verify(dto);
  }
}
