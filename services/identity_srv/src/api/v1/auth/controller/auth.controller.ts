import { Controller } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { AuthLoginDto } from './dto/auth-login.dto';

import { AuthEntity } from '../auth.entity';

import { AuthService } from '../service/auth.service';

import { AuthControllerInterface } from './auth-controller.interface';

@Controller()
export class AuthController implements AuthControllerInterface {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern({ cmd: 'identity.auth.login' })
  async login(@Payload() dto: AuthLoginDto): Promise<AuthEntity> {
    const user = await this.authService.login(dto.login, dto.password);

    const result = plainToInstance(AuthEntity, {
      uuid: user.uuid,
    });

    await validateOrReject(result);

    return result;
  }
}
