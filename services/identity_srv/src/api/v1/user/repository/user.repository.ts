import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { UserModel } from '../user.model';
import { UserEntity } from '../user.entity';
import { PersonModel } from '../../person/person.model';

@Injectable()
export class UserRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(UserModel) private readonly userModel: Repository<UserModel>,
  ) {}

  async getByUuid(uuid: string) {
    try {
      const result = await this.dataSource
        .createQueryBuilder()
        .select(['user.uuid', 'user.login', 'user.isBlocked', 'user.createdAt', 'user.updatedAt'])
        .from(UserModel, 'user')
        .where('user.uuid = :uuid', { uuid })
        .getOne();

      const resultInstance = plainToInstance(UserEntity, result);

      await validateOrReject(resultInstance);

      return resultInstance;
    } catch (err) {
      console.error(12367, err);
    }
  }
}
