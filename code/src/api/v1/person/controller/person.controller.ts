import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { GetPersonDto } from './dto/get-person.dto';

import { PersonService } from '../service/person.service';

import { PersonEntity } from '../person.entity';

@Controller()
export class PersonController {
  constructor(private readonly authService: PersonService) {}

  @MessagePattern({ cmd: 'identity.person.get:userUuid' })
  async getByUserUuid(@Payload() dto: GetPersonDto): Promise<PersonEntity> {
    return await this.authService.getByUserUuid(dto.userUuid);
  }
}
