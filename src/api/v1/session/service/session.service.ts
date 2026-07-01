import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { FindSessionDto } from './dto/find-session.dto';
import { SessionCreateDto } from './dto/session-create.dto';
import { RemoveSessionDto } from './dto/remove-session.dto';
import { VerifySessionDto } from './dto/verify-session.dto';
import { RenewSessionDto } from './dto/renew-session.dto';

import { SessionRepository } from '../repository/repository.repository';
import { SessionEntity } from '../session.entity';

type SessionIssueResult = {
  uuid: string;
  userId: string;
  sessionSecret: string;
};

type SessionVerifyResult = {
  data: {
    status: 'active' | 'renew_required' | 'invalid' | 'revoked' | 'expired';
    userId?: string;
  };
  meta: Record<string, never>;
};

type SessionRenewResult = {
  uuid: string;
  userId: string;
  sessionSecret: string;
};

@Injectable()
export class SessionService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly config: ConfigService,
  ) {}

  async find(dto: FindSessionDto) {
    return await this.sessionRepository.find({
      userUuid: dto.userUuid,
      fingerprintHash: this.hashFingerprint(dto.fingerprint),
    });
  }

  async create(dto: SessionCreateDto): Promise<SessionIssueResult> {
    const fingerprintHash = this.hashFingerprint(dto.fingerprint);
    const lastSession = await this.find({
      userUuid: dto.userUuid,
      fingerprint: dto.fingerprint,
    });

    if (lastSession) {
      await this.sessionRepository.remove({
        uuid: lastSession.uuid,
        revokeReason: 'replaced',
      });
    }

    const sessionSecret = this.generateSessionSecret();
    const now = new Date();
    const newSession = await this.sessionRepository.create({
      ...dto,
      fingerprintHash,
      secretHash: this.hashSessionSecret(sessionSecret),
      renewRequiredAt: this.addMilliseconds(now, this.getNumberConfig('SESSION_RENEW_REQUIRED_AFTER_MS', 300_000)),
      expiresAt: this.addMilliseconds(now, this.getNumberConfig('SESSION_EXPIRES_AFTER_MS', 86_400_000)),
    });

    return {
      uuid: newSession.uuid,
      userId: newSession.userUuid,
      sessionSecret,
    };
  }

  async verify(dto: VerifySessionDto): Promise<SessionVerifyResult> {
    const secretHash = this.hashSessionSecret(dto.sessionSecret);
    const fingerprintHash = this.hashFingerprint(dto.fingerprint);
    const now = new Date();
    const session = await this.sessionRepository.get({
      secretHash,
      fingerprintHash,
      clientType: dto.clientType,
      gateway: dto.gateway,
    });

    if (session) {
      return this.verifyActiveSession(session, now, false);
    }

    const previousSecretSession = await this.sessionRepository.getByPreviousSecret(
      {
        secretHash,
        fingerprintHash,
        clientType: dto.clientType,
        gateway: dto.gateway,
      },
      now,
    );

    if (previousSecretSession) {
      return this.verifyActiveSession(previousSecretSession, now, true);
    }

    return { data: { status: 'invalid' }, meta: {} };
  }

  async renew(dto: RenewSessionDto): Promise<SessionRenewResult | null> {
    const fingerprintHash = this.hashFingerprint(dto.fingerprint);
    const currentSecretHash = this.hashSessionSecret(dto.sessionSecret);
    const session = await this.sessionRepository.get({
      secretHash: currentSecretHash,
      fingerprintHash,
      clientType: dto.clientType,
      gateway: dto.gateway,
    });

    if (!session || session.isRevoked || session.status !== 'active') {
      return null;
    }

    const now = new Date();

    if (now > session.expiresAt) {
      await this.sessionRepository.expire(session.uuid);

      return null;
    }

    const sessionSecret = this.generateSessionSecret();
    const renewedSession = await this.sessionRepository.renew(
      session.uuid,
      currentSecretHash,
      fingerprintHash,
      this.addMilliseconds(now, this.getNumberConfig('SESSION_RENEW_REQUIRED_AFTER_MS', 300_000)),
      this.addMilliseconds(now, this.getNumberConfig('SESSION_EXPIRES_AFTER_MS', 86_400_000)),
      this.hashSessionSecret(sessionSecret),
      this.addMilliseconds(now, this.getNumberConfig('SESSION_RENEW_GRACE_AFTER_MS', 30_000)),
    );

    if (!renewedSession) {
      return null;
    }

    return {
      uuid: renewedSession.uuid,
      userId: renewedSession.userUuid,
      sessionSecret,
    };
  }

  async remove(dto: RemoveSessionDto) {
    return await this.sessionRepository.remove({
      secretHash: this.hashSessionSecret(dto.sessionSecret),
      fingerprintHash: this.hashFingerprint(dto.fingerprint),
      clientType: dto.clientType,
      gateway: dto.gateway,
      revokeReason: 'manual',
    });
  }

  private generateSessionSecret(): string {
    return crypto.randomBytes(48).toString('base64url');
  }

  private hashSessionSecret(sessionSecret: string): string {
    const secret = this.config.get<string>('SESSION_SECRET_HASH_KEY');

    if (!secret) {
      throw new Error('SESSION_SECRET_HASH_KEY is required');
    }

    return crypto.createHmac('sha256', secret).update(sessionSecret).digest('hex');
  }

  private hashFingerprint(fingerprint: string): string {
    const secret = this.config.get<string>('FINGERPRINT_STORAGE_SECRET');

    if (!secret) {
      throw new Error('FINGERPRINT_STORAGE_SECRET is required');
    }

    return crypto.createHmac('sha256', secret).update(fingerprint).digest('hex');
  }

  private getNumberConfig(key: string, fallback: number): number {
    const value = Number(this.config.get(key));

    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private addMilliseconds(date: Date, milliseconds: number): Date {
    return new Date(date.getTime() + milliseconds);
  }

  private async verifyActiveSession(
    session: SessionEntity,
    now: Date,
    isPreviousSecret: boolean,
  ): Promise<SessionVerifyResult> {
    if (session.isRevoked || session.status !== 'active') {
      return { data: { status: this.toVerifyStatus(session.status, session.isRevoked) }, meta: {} };
    }

    if (now > session.expiresAt) {
      await this.sessionRepository.expire(session.uuid);

      return { data: { status: 'expired' }, meta: {} };
    }

    if (!isPreviousSecret && now >= session.renewRequiredAt) {
      return { data: { status: 'renew_required' }, meta: {} };
    }

    return {
      data: {
        status: 'active',
        userId: session.userUuid,
      },
      meta: {},
    };
  }

  private toVerifyStatus(status: string, isRevoked: boolean): SessionVerifyResult['data']['status'] {
    if (isRevoked) {
      return 'revoked';
    }

    if (status === 'expired') {
      return 'expired';
    }

    if (status === 'revoked') {
      return 'revoked';
    }

    return 'invalid';
  }
}
