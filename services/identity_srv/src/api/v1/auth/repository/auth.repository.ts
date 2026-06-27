import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { DataSource } from 'typeorm';

import { AuthEntity } from '../auth.entity';
import { UserModel } from '../../user/user.model';

@Injectable()
export class AuthRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async login(login: string, password: string) {
    const result = await this.dataSource
      .createQueryBuilder(UserModel, 'user')
      .where('user.login = :login', { login })
      .andWhere('user.password = :password', { password })
      .andWhere('user.isBlocked = :isBlocked', { isBlocked: false })
      .getOneOrFail();

    const resultInstance = plainToInstance(AuthEntity, result);

    await validateOrReject(resultInstance);

    return result;
  }
}
