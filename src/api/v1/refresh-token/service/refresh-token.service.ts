import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { GenerateRefreshTokenDto } from './dto/generate-refresh-token.dto';
import { VerifyRefreshTokenDto } from './dto/verify-refresh-token.dto';

import { RefreshTokenRepository } from '../repository/refresh-token.repository';

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  private getExpirationDate(expiresIn: string): Date {
    const now = new Date();
    const expiresAt = new Date(now);
    const value = parseInt(expiresIn);
    const unit = expiresIn.replace(value.toString(), '');

    switch (unit) {
      case 's':
        expiresAt.setSeconds(now.getSeconds() + value);
        break;
      case 'm':
        expiresAt.setMinutes(now.getMinutes() + value);
        break;
      case 'h':
        expiresAt.setHours(now.getHours() + value);
        break;
      case 'd':
        expiresAt.setDate(now.getDate() + value);
        break;
      default:
        throw new Error(`Unknown time unit: ${unit}`);
    }

    return expiresAt;
  }

  async generate(dto: GenerateRefreshTokenDto) {
    const expiresAt = this.getExpirationDate(this.config.get('EXPIRES_IN_REFRESH_TOKEN'));

    const refreshToken = this.jwtService.sign(dto, {
      secret: this.config.get('REFRESH_TOKEN_SECRET'),
      expiresIn: this.config.get('EXPIRES_IN_REFRESH_TOKEN'),
      algorithm: 'HS256',
    });

    const token = crypto.createHash('sha256').update(refreshToken).digest('hex');

    return await this.refreshTokenRepository.create({
      sessionUuid: dto.sessionUuid,
      expiresAt: expiresAt,
      token: token,
    });
  }

  async verify(dto: VerifyRefreshTokenDto) {
    return await this.refreshTokenRepository.verify(dto);
  }
}
