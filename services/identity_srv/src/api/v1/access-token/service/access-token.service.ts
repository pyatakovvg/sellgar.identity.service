import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { VerifyAccessTokenDto } from './dto/verify-access-token.dto';
import { GenerateAccessTokenDto } from './dto/generate-access-token.dto';

import { UserService } from '../../user/service/user.service';

@Injectable()
export class AccessTokenService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  generate(dto: GenerateAccessTokenDto): string {
    const payload = { sub: dto.uuid, pub: dto.userUuid };

    return this.jwtService.sign(payload, {
      secret: this.config.get('ACCESS_TOKEN_SECRET'),
      expiresIn: this.config.get('EXPIRES_IN_ACCESS_TOKEN'),
      algorithm: 'HS256',
    });
  }

  async verify(dto: VerifyAccessTokenDto) {
    try {
      const data = this.jwtService.verify(dto.token, { secret: this.config.get('ACCESS_TOKEN_SECRET') });
      const user = await this.userService.getByUuid(data.pub);

      console.info('User:', user);

      return { data: { status: 'VERIFY', user }, meta: {} };
    } catch (e) {
      if (e instanceof TokenExpiredError) {
        return { data: { status: 'EXPIRED' }, meta: {} };
      }
      return { data: { status: 'ERROR' }, meta: {} };
    }
  }
}
