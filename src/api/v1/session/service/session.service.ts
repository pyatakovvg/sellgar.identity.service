import { Injectable } from '@nestjs/common';

import { SessionEntity } from '../session.entity';

import { FindSessionDto } from './dto/find-session.dto';
import { SessionCreateDto } from './dto/session-create.dto';
import { SessionRefreshDto } from './dto/session-refresh.dto';
import { RestoreSessionDto } from './dto/restore-session.dto';
import { RemoveSessionDto } from './dto/remove-session.dto';

import { SessionRepository } from '../repository/repository.repository';
import { AccessTokenService } from '../../access-token/service/access-token.service';
import { RefreshTokenService } from '../../refresh-token/service/refresh-token.service';

@Injectable()
export class SessionService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly accessTokenService: AccessTokenService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async find(dto: FindSessionDto): Promise<SessionEntity | null> {
    return await this.sessionRepository.find({
      userUuid: dto.userUuid,
      fingerprint: dto.fingerprint,
    });
  }

  async create(dto: SessionCreateDto): Promise<SessionEntity> {
    const newSession = await this.sessionRepository.create({ ...dto });

    const refreshToken = await this.refreshTokenService.generate({
      sessionUuid: newSession.uuid,
      fingerprint: dto.fingerprint,
    });

    const accessToken = this.accessTokenService.generate({
      uuid: newSession.uuid,
      userUuid: newSession.userUuid,
    });

    return {
      ...newSession,
      accessToken,
      refreshToken,
    };
  }

  async refresh(dto: SessionRefreshDto): Promise<SessionEntity> {
    const session = await this.sessionRepository.get({
      uuid: dto.sessionUuid,
      fingerprint: dto.fingerprint,
    });

    console.log('Current session', session);

    if (!session) {
      return null;
    }

    const refreshToken = await this.refreshTokenService.verify({
      sessionUuid: session.uuid,
      token: dto.refreshToken,
    });

    if (!refreshToken) {
      return null;
    }

    const accessToken = this.accessTokenService.generate({
      uuid: session.uuid,
      userUuid: session.userUuid,
    });

    return {
      ...session,
      accessToken,
    };
  }

  async restore(dto: RestoreSessionDto): Promise<SessionEntity> {
    const session = await this.sessionRepository.get({
      uuid: dto.sessionUuid,
      fingerprint: dto.fingerprint,
    });

    if (!session) {
      return null;
    }

    const refreshToken = await this.refreshTokenService.generate({
      sessionUuid: session.uuid,
      fingerprint: dto.fingerprint,
    });

    const accessToken = this.accessTokenService.generate({
      uuid: session.uuid,
      userUuid: session.userUuid,
    });

    return { ...session, accessToken, refreshToken };
  }

  async remove(dto: RemoveSessionDto) {
    return await this.sessionRepository.remove(dto);
  }
}
