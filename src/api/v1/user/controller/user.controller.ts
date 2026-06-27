import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { GetUserDto } from './dto/get-user.dto';

import { UserService } from '../service/user.service';

import { UserEntity } from '../user.entity';

@Controller()
export class UserController {
  constructor(private readonly authService: UserService) {}

  @MessagePattern({ cmd: 'identity.user.get' })
  async getByUserUuid(@Payload() dto: GetUserDto): Promise<UserEntity> {
    return await this.authService.getByUuid(dto.uuid);
  }
}
