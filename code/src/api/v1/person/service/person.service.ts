import { Injectable } from '@nestjs/common';

import { PersonRepository } from '../repository/person.repository';

@Injectable()
export class PersonService {
  constructor(private readonly userRepository: PersonRepository) {}

  getByUuid(uuid: string) {
    return this.userRepository.getByUuid(uuid);
  }

  getByUserUuid(userUuid: string) {
    return this.userRepository.getByUserUuid(userUuid);
  }
}
