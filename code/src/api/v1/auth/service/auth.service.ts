import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';

import { AuthRepository } from '../repository/auth.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly config: ConfigService,
  ) {}

  async verifyCredentials(login: string, password: string) {
    const user = await this.authRepository.login(login, this.hashPassword(password));

    if (!user) {
      throw new RpcException({
        statusCode: 401,
        code: 'invalid_credentials',
        message: 'Unauthorized',
      });
    }

    return user;
  }

  private hashPassword(password: string): string {
    const secret = this.config.get<string>('LEGACY_PASSWORD_HMAC_SECRET');

    if (!secret) {
      throw new Error('LEGACY_PASSWORD_HMAC_SECRET is required until password credential migration is completed');
    }

    return crypto.createHmac('sha512', secret).update(password).digest('hex');
  }
}
