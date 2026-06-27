import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreateRefreshTokenDto } from './dto/create-refresh-token.dto';
import { VerifyRefreshTokenDto } from './dto/verify-refresh-token.dto';

import { RefreshTokenModel } from '../refresh-token.model';
import { RefreshTokenEntity } from '../refresh-token.entity';

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(RefreshTokenModel) private readonly refreshTokenModel: Repository<RefreshTokenModel>,
  ) {}

  async create(dto: CreateRefreshTokenDto): Promise<RefreshTokenEntity> {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const upsertedRefreshToken = await runner.manager
        .createQueryBuilder()
        .insert()
        .into(RefreshTokenModel)
        .values(dto)
        .orUpdate(['token', 'expires_at'], ['session_uuid'])
        .execute();

      const result = await runner.manager
        .createQueryBuilder(RefreshTokenModel, 'refreshToken')
        .where('refreshToken.uuid = :uuid', { uuid: upsertedRefreshToken.identifiers[0].uuid })
        .getOneOrFail();

      runner.commitTransaction();

      const instanceResult = plainToInstance(RefreshTokenEntity, result);

      await validateOrReject(instanceResult);

      return instanceResult;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async verify(dto: VerifyRefreshTokenDto) {
    console.info('Verify refresh token:', dto);
    const result = await this.dataSource
      .createQueryBuilder(RefreshTokenModel, 'refreshToken')
      .where('refreshToken.is_revoked = :state', { state: false })
      .andWhere('refreshToken.token = :token', { token: dto.token })
      .andWhere('refreshToken.sessionUuid = :sessionUuid', { sessionUuid: dto.sessionUuid })
      .getOne();

    console.info('Refreshed token:', result);

    if (!result) {
      return {
        data: { status: 'ERROR' },
      };
    }

    if (new Date(result.expiresAt) < new Date()) {
      return {
        data: {
          status: 'EXPIRED',
        },
      };
    }

    return {
      data: {
        status: 'VERIFY',
        refreshToken: result,
      },
    };
  }
}
