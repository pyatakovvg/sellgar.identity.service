import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { PersonEntity } from '../person.entity';
import { PersonModel } from '../person.model';

@Injectable()
export class PersonRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getByUserUuid(userUuid: string) {
    console.log('Person by user uuid:', userUuid);
    const result = await this.dataSource
      .createQueryBuilder()
      .select([
        'person.uuid',
        'person.name',
        'person.surname',
        'person.patronymic',
        'person.birthday',
        'person.sex',
        'person.createdAt',
        'person.updatedAt',
      ])
      .from(PersonModel, 'person')
      .where('person.user_uuid = :userUuid', { userUuid })
      .getOneOrFail();

    console.log('Person by user uuid result:', result);

    const resultInstance = plainToInstance(PersonEntity, result);

    await validateOrReject(resultInstance);

    return resultInstance;
  }

  async getByUuid(uuid: string) {
    const result = await this.dataSource
      .createQueryBuilder()
      .select([
        'person.uuid',
        'person.name',
        'person.surname',
        'person.patronymic',
        'person.birthday',
        'person.sex',
        'person.createdAt',
        'person.updatedAt',
      ])
      .from(PersonModel, 'person')
      .where('person.uuid = :uuid', { uuid })
      .getOneOrFail();

    const resultInstance = plainToInstance(PersonEntity, result);

    await validateOrReject(resultInstance);

    return resultInstance;
  }
}
