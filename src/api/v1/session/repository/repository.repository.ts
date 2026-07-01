import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { FindSessionDto } from './dto/find-session.dto';
import { SessionHasDto } from './dto/session-has.dto';
import { SessionCreateDto } from './dto/session-create.dto';
import { SessionUpdateDto } from './dto/session-update.dto';
import { SessionRemoveDto } from './dto/session-remove.dto';

import { SessionModel } from '../session.model';
import { SessionEntity } from '../session.entity';

const SESSION_SELECT = [
  'session.uuid',
  'session.userUuid',
  'session.device',
  'session.fingerprintHash',
  'session.secretHash',
  'session.previousSecretHash',
  'session.previousSecretAcceptedUntil',
  'session.clientType',
  'session.gateway',
  'session.authMethod',
  'session.assuranceLevel',
  'session.status',
  'session.isRevoked',
  'session.renewRequiredAt',
  'session.expiresAt',
  'session.revokedAt',
  'session.revokeReason',
  'session.createdAt',
  'session.updatedAt',
];

@Injectable()
export class SessionRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async find(dto: FindSessionDto): Promise<SessionEntity | null> {
    const result = await this.dataSource
      .createQueryBuilder()
      .select(SESSION_SELECT)
      .from(SessionModel, 'session')
      .where('session.user_uuid = :userUuid', { userUuid: dto.userUuid })
      .andWhere('session.fingerprint_hash = :fingerprintHash', { fingerprintHash: dto.fingerprintHash })
      .andWhere('session.status = :status', { status: 'active' })
      .andWhere('session.is_revoked = :isRevoked', { isRevoked: false })
      .getOne();

    if (!result) {
      return null;
    }

    const resultInstance = plainToInstance(SessionEntity, result);

    await validateOrReject(resultInstance);

    return resultInstance;
  }

  async get(dto: SessionHasDto): Promise<SessionEntity | null> {
    try {
      const builder = this.dataSource
        .createQueryBuilder()
        .select(SESSION_SELECT)
        .from(SessionModel, 'session')
        .where('1 = 1');

      if (!this.hasGetSelector(dto)) {
        return null;
      }

      if (dto.uuid) {
        builder.andWhere('session.uuid = :uuid', { uuid: dto.uuid });
      }
      if (dto.secretHash) {
        builder.andWhere('session.secretHash = :secretHash', { secretHash: dto.secretHash });
      }
      if (dto.userUuid) {
        builder.andWhere('session.userUuid = :userUuid', { userUuid: dto.userUuid });
      }
      if (dto.device) {
        builder.andWhere('session.device = :device', { device: dto.device });
      }
      if (dto.fingerprintHash) {
        builder.andWhere('session.fingerprintHash = :fingerprintHash', { fingerprintHash: dto.fingerprintHash });
      }
      if (dto.clientType) {
        builder.andWhere('session.clientType = :clientType', { clientType: dto.clientType });
      }
      if (dto.gateway) {
        builder.andWhere('session.gateway = :gateway', { gateway: dto.gateway });
      }

      const result = await builder.getOne();

      if (!result) {
        return null;
      }

      const resultInstance = plainToInstance(SessionEntity, result);

      await validateOrReject(resultInstance);

      return resultInstance;
    } catch {
      return null;
    }
  }

  async getByPreviousSecret(dto: SessionHasDto, now: Date): Promise<SessionEntity | null> {
    try {
      if (!dto.secretHash || !dto.fingerprintHash || !dto.clientType || !dto.gateway) {
        return null;
      }

      const result = await this.dataSource
        .createQueryBuilder()
        .select(SESSION_SELECT)
        .from(SessionModel, 'session')
        .where('session.previousSecretHash = :secretHash', { secretHash: dto.secretHash })
        .andWhere('session.previousSecretAcceptedUntil >= :now', { now })
        .andWhere('session.fingerprintHash = :fingerprintHash', { fingerprintHash: dto.fingerprintHash })
        .andWhere('session.clientType = :clientType', { clientType: dto.clientType })
        .andWhere('session.gateway = :gateway', { gateway: dto.gateway })
        .andWhere('session.status = :status', { status: 'active' })
        .andWhere('session.isRevoked = :isRevoked', { isRevoked: false })
        .getOne();

      if (!result) {
        return null;
      }

      const resultInstance = plainToInstance(SessionEntity, result);

      await validateOrReject(resultInstance);

      return resultInstance;
    } catch {
      return null;
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
          fingerprintHash: dto.fingerprintHash,
          secretHash: dto.secretHash,
          clientType: dto.clientType,
          gateway: dto.gateway,
          authMethod: dto.authMethod,
          assuranceLevel: dto.assuranceLevel,
          status: 'active',
          isRevoked: false,
          renewRequiredAt: dto.renewRequiredAt,
          expiresAt: dto.expiresAt,
        })
        .execute();

      const result = await runner.manager
        .createQueryBuilder(SessionModel, 'session')
        .select(SESSION_SELECT)
        .where('session.uuid = :uuid', { uuid: insertedSession.identifiers[0].uuid })
        .getOneOrFail();

      await runner.commitTransaction();

      const resultInstance = plainToInstance(SessionEntity, result);

      await validateOrReject(resultInstance);

      return resultInstance;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
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
          fingerprintHash: dto.fingerprintHash,
          secretHash: dto.secretHash,
          clientType: dto.clientType,
          gateway: dto.gateway,
          authMethod: dto.authMethod,
          assuranceLevel: dto.assuranceLevel,
          renewRequiredAt: dto.renewRequiredAt,
          expiresAt: dto.expiresAt,
        })
        .where('uuid = :uuid', { uuid: dto.uuid })
        .execute();

      const result = await runner.manager
        .createQueryBuilder(SessionModel, 'session')
        .select(SESSION_SELECT)
        .where('session.uuid = :uuid', { uuid: updatedSession.raw[0].uuid })
        .getOneOrFail();

      await runner.commitTransaction();

      const resultInstance = plainToInstance(SessionEntity, result);

      await validateOrReject(resultInstance);

      return resultInstance;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async renew(
    uuid: string,
    currentSecretHash: string,
    fingerprintHash: string,
    renewRequiredAt: Date,
    expiresAt: Date,
    secretHash: string,
    previousSecretAcceptedUntil: Date,
  ): Promise<SessionEntity | null> {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const updatedSession = await runner.manager
        .createQueryBuilder()
        .update(SessionModel)
        .set({
          renewRequiredAt,
          expiresAt,
          secretHash,
          previousSecretHash: currentSecretHash,
          previousSecretAcceptedUntil,
        })
        .where('uuid = :uuid', { uuid })
        .andWhere('secret_hash = :currentSecretHash', { currentSecretHash })
        .andWhere('fingerprint_hash = :fingerprintHash', { fingerprintHash })
        .andWhere('status = :status', { status: 'active' })
        .andWhere('is_revoked = :isRevoked', { isRevoked: false })
        .execute();

      if (!updatedSession.affected) {
        await runner.rollbackTransaction();

        return null;
      }

      const result = await runner.manager
        .createQueryBuilder(SessionModel, 'session')
        .select(SESSION_SELECT)
        .where('session.uuid = :uuid', { uuid })
        .getOneOrFail();

      await runner.commitTransaction();

      const resultInstance = plainToInstance(SessionEntity, result);

      await validateOrReject(resultInstance);

      return resultInstance;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async remove(dto: SessionRemoveDto): Promise<SessionEntity | null> {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const builder = runner.manager
        .createQueryBuilder()
        .update(SessionModel)
        .set({
          status: 'revoked',
          isRevoked: true,
          revokedAt: new Date(),
          revokeReason: dto.revokeReason ?? 'manual',
        });

      if (dto.uuid) {
        builder.where('uuid = :uuid', { uuid: dto.uuid });
      } else if (dto.secretHash) {
        builder.where('secret_hash = :secretHash', { secretHash: dto.secretHash });
      } else if (dto.userUuid && dto.fingerprintHash) {
        builder
          .where('user_uuid = :userUuid', { userUuid: dto.userUuid })
          .andWhere('fingerprint_hash = :fingerprintHash', {
            fingerprintHash: dto.fingerprintHash,
          });
      } else {
        throw new Error('Session revoke selector is required');
      }

      if (dto.clientType) {
        builder.andWhere('client_type = :clientType', { clientType: dto.clientType });
      }
      if (dto.gateway) {
        builder.andWhere('gateway = :gateway', { gateway: dto.gateway });
      }
      if (dto.fingerprintHash) {
        builder.andWhere('fingerprint_hash = :fingerprintHash', { fingerprintHash: dto.fingerprintHash });
      }

      await builder.execute();

      const resultBuilder = runner.manager.createQueryBuilder(SessionModel, 'session').select(SESSION_SELECT);

      if (dto.uuid) {
        resultBuilder.where('session.uuid = :uuid', { uuid: dto.uuid });
      } else if (dto.secretHash) {
        resultBuilder.where('session.secretHash = :secretHash', { secretHash: dto.secretHash });
      } else {
        resultBuilder
          .where('session.user_uuid = :userUuid', { userUuid: dto.userUuid })
          .andWhere('session.fingerprintHash = :fingerprintHash', { fingerprintHash: dto.fingerprintHash });
      }

      if (dto.clientType) {
        resultBuilder.andWhere('session.clientType = :clientType', { clientType: dto.clientType });
      }
      if (dto.gateway) {
        resultBuilder.andWhere('session.gateway = :gateway', { gateway: dto.gateway });
      }
      if (dto.fingerprintHash) {
        resultBuilder.andWhere('session.fingerprintHash = :fingerprintHash', { fingerprintHash: dto.fingerprintHash });
      }

      const session = await resultBuilder.getOne();

      await runner.commitTransaction();

      if (!session) {
        return null;
      }

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

  async expire(uuid: string): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .update(SessionModel)
      .set({
        status: 'expired',
        isRevoked: true,
        revokedAt: new Date(),
        revokeReason: 'expired',
      })
      .where('uuid = :uuid', { uuid })
      .andWhere('status = :status', { status: 'active' })
      .execute();
  }

  private hasGetSelector(dto: SessionHasDto): boolean {
    return Boolean(dto.uuid || dto.secretHash || dto.userUuid || dto.device || dto.fingerprintHash);
  }
}
