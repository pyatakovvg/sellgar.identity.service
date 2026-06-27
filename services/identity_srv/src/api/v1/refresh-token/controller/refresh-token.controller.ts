import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { GenerateRefreshTokenDto } from './dto/generate-refresh-token.dto';
import { VerifyRefreshTokenDto } from './dto/verify-refresh-token.dto';

import { RefreshTokenService } from '../service/refresh-token.service';

@Controller()
export class RefreshTokenController {
  constructor(private readonly refreshTokenService: RefreshTokenService) {}

  @MessagePattern({ cmd: 'identity.refresh-token.create' })
  generate(@Payload() dto: GenerateRefreshTokenDto) {
    return this.refreshTokenService.generate(dto);
  }
  @MessagePattern({ cmd: 'identity.refresh-token.verify' })
  verify(@Payload() dto: VerifyRefreshTokenDto) {
    return this.refreshTokenService.verify(dto);
  }
}
