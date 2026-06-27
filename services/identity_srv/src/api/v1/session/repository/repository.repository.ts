import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { FindSessionDto } from './dto/find-session.dto';
import { SessionHasDto } from './dto/session-has.dto';
import { SessionCreateDto } from './dto/session-create.dto';
import { SessionUpdateDto } from './dto/session-update.dto';
import { SessionRemoveDto } from './dto/session-remove.dto';

import { SessionModel } from '../session.model';
import { SessionEntity } from '../session.entity';
import { RefreshTokenModel } from '@/api/v1/refresh-token/refresh-token.model';

@Injectable()
export class SessionRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(SessionModel) private readonly sessionModel: Repository<SessionModel>,
  ) {}

  async find(dto: FindSessionDto): Promise<SessionEntity | null> {
    const result = await this.dataSource
      .createQueryBuilder()
      .select([
        'session.uuid',
        'session.userUuid',
        'session.device',
        'session.fingerprint',
        'session.isRevoked',
        'session.createdAt',
        'session.updatedAt',
        'refreshToken.uuid',
        'refreshToken.token',
        'refreshToken.isRevoked',
        'refreshToken.expiresAt',
        'refreshToken.createdAt',
      ])
      .from(SessionModel, 'session')
      .leftJoinAndMapOne(
        'session.refreshToken',
        RefreshTokenModel,
        'refreshToken',
        'refreshToken.sessionUuid = session.uuid',
      )
      .where('session.user_uuid = :userUuid', { userUuid: dto.userUuid })
      .andWhere('session.fingerprint = :fingerprint', { fingerprint: dto.fingerprint })
      .getOne();

    console.log('Session find:', result);

    if (!result) {
      return null;
    }

    const resultInstance = plainToInstance(SessionEntity, result);

    await validateOrReject(resultInstance);

    return resultInstance;
  }

  async get(dto: SessionHasDto): Promise<SessionEntity | null> {
    console.log('Session get dto:', dto);
    try {
      const builder = this.dataSource
        .createQueryBuilder()
        .select([
          'session.uuid',
          'session.userUuid',
          'session.device',
          'session.fingerprint',
          'session.isRevoked',
          'session.createdAt',
          'session.updatedAt',
          'refreshToken.uuid',
          'refreshToken.token',
          'refreshToken.isRevoked',
          'refreshToken.expiresAt',
          'refreshToken.createdAt',
        ])
        .from(SessionModel, 'session')
        .leftJoinAndMapOne(
          'session.refreshToken',
          RefreshTokenModel,
          'refreshToken',
          'refreshToken.sessionUuid = session.uuid',
        )
        .where('session.fingerprint = :fingerprint', { fingerprint: dto.fingerprint });

      if (dto.uuid) {
        builder.orWhere('session.uuid = :uuid', { uuid: dto.uuid });
      }
      if (dto.userUuid) {
        builder.orWhere('session.userUuid = :userUuid', { userUuid: dto.userUuid });
      }
      if (dto.device) {
        builder.orWhere('session.device = :device', { device: dto.device });
      }

      const result = await builder.getOneOrFail();

      console.log('Session get:', result);

      if (!result) {
        return null;
      }

      const resultInstance = plainToInstance(SessionEntity, result);

      await validateOrReject(resultInstance);

      return resultInstance;
    } catch (err) {
      console.error(12367, err);
    }
  }

  async create(dto: SessionCreateDto): Promise<SessionEntity> {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const insertedSession = await runner.manager
        .createQueryBuilder()
        .insert()
        .into(SessionModel)
        .values({
          userUuid: dto.userUuid,
          device: dto.device,
          fingerprint: dto.fingerprint,
        })
        .execute();

      const result = await runner.manager
        .createQueryBuilder(SessionModel, 'session')
        .where('session.uuid = :uuid', { uuid: insertedSession.identifiers[0].uuid })
        .getOneOrFail();

      await runner.commitTransaction();

      const resultInstance = plainToInstance(SessionEntity, result);

      await validateOrReject(resultInstance);

      return resultInstance;
    } catch (error) {
      runner.rollbackTransaction();
      throw error;
    } finally {
      runner.release();
    }
  }

  async update(dto: SessionUpdateDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const updatedSession = await runner.manager
        .createQueryBuilder()
        .update(SessionModel)
        .set({
          userUuid: dto.userUuid,
          device: dto.device,
          fingerprint: dto.fingerprint,
        })
        .where('uuid = :uuid', { uuid: dto.uuid })
        .execute();

      const result = await runner.manager
        .createQueryBuilder(SessionModel, 'session')
        .where('session.uuid = :uuid', { uuid: updatedSession.raw[0].uuid })
        .getOneOrFail();

      await runner.commitTransaction();

      const resultInstance = plainToInstance(SessionEntity, updatedSession.raw[0]);

      await validateOrReject(resultInstance);

      return resultInstance;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async remove(dto: SessionRemoveDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const session = await runner.manager
        .createQueryBuilder()
        .select([
          'session.uuid',
          'session.userUuid',
          'session.device',
          'session.fingerprint',
          'session.isRevoked',
          'session.createdAt',
          'session.updatedAt',
          'refreshToken.uuid',
          'refreshToken.token',
          'refreshToken.isRevoked',
          'refreshToken.expiresAt',
          'refreshToken.createdAt',
        ])
        .from(SessionModel, 'session')
        .leftJoinAndMapOne(
          'session.refreshToken',
          RefreshTokenModel,
          'refreshToken',
          'refreshToken.sessionUuid = session.uuid',
        )
        .where('session.user_uuid = :userUuid', { userUuid: dto.userUuid })
        .andWhere('session.fingerprint = :fingerprint', { fingerprint: dto.fingerprint })
        .getOne();

      await runner.manager
        .createQueryBuilder()
        .delete()
        .from(SessionModel)
        .where('session.user_uuid = :userUuid', { userUuid: dto.userUuid })
        .andWhere('session.fingerprint = :fingerprint', { fingerprint: dto.fingerprint })
        .execute();

      await runner.commitTransaction();

      const resultInstance = plainToInstance(SessionEntity, session);

      await validateOrReject(resultInstance);

      return resultInstance;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }
}
