/// <reference types="jest" />

import { SessionService } from './session.service';

const USER_ID = '9ed7d1a4-91eb-402a-8028-1654aeb259f5';
const SESSION_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const NOW = new Date('2026-06-22T00:00:00.000Z');

describe('SessionService', () => {
  const sessionRepository = {
    find: jest.fn(),
    create: jest.fn(),
    get: jest.fn(),
    getByPreviousSecret: jest.fn(),
    renew: jest.fn(),
    remove: jest.fn(),
    expire: jest.fn(),
  };

  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        SESSION_SECRET_HASH_KEY: 'session.secret.hash.key',
        FINGERPRINT_STORAGE_SECRET: 'fingerprint.storage.secret.key',
        SESSION_RENEW_REQUIRED_AFTER_MS: '300000',
        SESSION_RENEW_GRACE_AFTER_MS: '30000',
        SESSION_EXPIRES_AFTER_MS: '86400000',
      };

      return values[key];
    }),
  };

  let service: SessionService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    jest.clearAllMocks();
    sessionRepository.getByPreviousSecret.mockResolvedValue(null);
    service = new SessionService(sessionRepository as never, config as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('replaces an active session for the same user and fingerprint before creating a new one', async () => {
    sessionRepository.find.mockResolvedValue(makeSession({ uuid: SESSION_ID }));
    sessionRepository.create.mockImplementation(async (dto) =>
      makeSession({
        uuid: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
        userUuid: dto.userUuid,
        fingerprintHash: dto.fingerprintHash,
        secretHash: dto.secretHash,
        renewRequiredAt: dto.renewRequiredAt,
        expiresAt: dto.expiresAt,
      }),
    );

    const result = await service.create({
      userUuid: USER_ID,
      device: 'Chrome (GNU/Linux)',
      fingerprint: 'raw-fingerprint',
      clientType: 'web',
      gateway: 'admin_gw',
      authMethod: 'password',
      assuranceLevel: 'medium',
    });

    expect(sessionRepository.remove).toHaveBeenCalledWith({
      uuid: SESSION_ID,
      revokeReason: 'replaced',
    });
    expect(sessionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userUuid: USER_ID,
        fingerprintHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        secretHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        renewRequiredAt: new Date('2026-06-22T00:05:00.000Z'),
        expiresAt: new Date('2026-06-23T00:00:00.000Z'),
      }),
    );
    expect(result).toEqual({
      uuid: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
      userId: USER_ID,
      sessionSecret: expect.any(String),
    });
  });

  it('verifies an active session bound to secret and fingerprint', async () => {
    sessionRepository.get.mockResolvedValue(makeSession());

    await expect(verify()).resolves.toEqual({
      data: {
        status: 'active',
        userId: USER_ID,
      },
      meta: {},
    });

    expect(sessionRepository.get).toHaveBeenCalledWith(
      expect.objectContaining({
        secretHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        fingerprintHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        clientType: 'web',
        gateway: 'admin_gw',
      }),
    );
    expect(sessionRepository.getByPreviousSecret).not.toHaveBeenCalled();
  });

  it('accepts the previous session secret during the renew grace window', async () => {
    sessionRepository.get.mockResolvedValue(null);
    sessionRepository.getByPreviousSecret.mockResolvedValue(makeSession());

    await expect(verify()).resolves.toEqual({
      data: {
        status: 'active',
        userId: USER_ID,
      },
      meta: {},
    });

    expect(sessionRepository.getByPreviousSecret).toHaveBeenCalledWith(
      expect.objectContaining({
        secretHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        fingerprintHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        clientType: 'web',
        gateway: 'admin_gw',
      }),
      NOW,
    );
    expect(sessionRepository.expire).not.toHaveBeenCalled();
    expect(sessionRepository.renew).not.toHaveBeenCalled();
  });

  it('expires a previous-secret session when the absolute window is over', async () => {
    sessionRepository.get.mockResolvedValue(null);
    sessionRepository.getByPreviousSecret.mockResolvedValue(
      makeSession({
        expiresAt: new Date('2026-06-21T23:59:59.000Z'),
      }),
    );

    await expect(verify()).resolves.toEqual({
      data: {
        status: 'expired',
      },
      meta: {},
    });
    expect(sessionRepository.expire).toHaveBeenCalledWith(SESSION_ID);
  });

  it('returns renew_required without changing the session from verify', async () => {
    sessionRepository.get.mockResolvedValue(
      makeSession({
        renewRequiredAt: new Date('2026-06-21T23:59:59.000Z'),
      }),
    );

    await expect(verify()).resolves.toEqual({
      data: {
        status: 'renew_required',
      },
      meta: {},
    });
    expect(sessionRepository.renew).not.toHaveBeenCalled();
  });

  it('expires an active session when the absolute window is over', async () => {
    sessionRepository.get.mockResolvedValue(
      makeSession({
        expiresAt: new Date('2026-06-21T23:59:59.000Z'),
      }),
    );

    await expect(verify()).resolves.toEqual({
      data: {
        status: 'expired',
      },
      meta: {},
    });
    expect(sessionRepository.expire).toHaveBeenCalledWith(SESSION_ID);
  });

  it('returns invalid when no session matches the presented fingerprint and secret', async () => {
    sessionRepository.get.mockResolvedValue(null);

    await expect(verify()).resolves.toEqual({
      data: {
        status: 'invalid',
      },
      meta: {},
    });
  });

  it('renews an active bound session by rotating the session secret', async () => {
    sessionRepository.get.mockResolvedValue(makeSession());
    sessionRepository.renew.mockResolvedValue(makeSession());

    const result = await service.renew({
      sessionSecret: 'current-session-secret',
      fingerprint: 'raw-fingerprint',
      clientType: 'web',
      gateway: 'admin_gw',
    });

    expect(sessionRepository.renew).toHaveBeenCalledWith(
      SESSION_ID,
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.stringMatching(/^[a-f0-9]{64}$/),
      new Date('2026-06-22T00:05:00.000Z'),
      new Date('2026-06-23T00:00:00.000Z'),
      expect.stringMatching(/^[a-f0-9]{64}$/),
      new Date('2026-06-22T00:00:30.000Z'),
    );
    expect(result).toEqual({
      uuid: SESSION_ID,
      userId: USER_ID,
      sessionSecret: expect.any(String),
    });
  });

  it('revokes only the session matching secret, fingerprint, client type and gateway', async () => {
    sessionRepository.remove.mockResolvedValue(makeSession());

    await service.remove({
      sessionSecret: 'current-session-secret',
      fingerprint: 'raw-fingerprint',
      clientType: 'web',
      gateway: 'admin_gw',
    });

    expect(sessionRepository.remove).toHaveBeenCalledWith({
      secretHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      fingerprintHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      clientType: 'web',
      gateway: 'admin_gw',
      revokeReason: 'manual',
    });
  });

  function verify() {
    return service.verify({
      sessionSecret: 'current-session-secret',
      fingerprint: 'raw-fingerprint',
      clientType: 'web',
      gateway: 'admin_gw',
    });
  }

  function makeSession(overrides: Record<string, unknown> = {}) {
    return {
      uuid: SESSION_ID,
      userUuid: USER_ID,
      device: 'Chrome (GNU/Linux)',
      fingerprintHash: 'stored-fingerprint-hash',
      secretHash: 'stored-secret-hash',
      clientType: 'web',
      gateway: 'admin_gw',
      authMethod: 'password',
      assuranceLevel: 'medium',
      status: 'active',
      isRevoked: false,
      renewRequiredAt: new Date('2026-06-22T00:05:00.000Z'),
      expiresAt: new Date('2026-06-23T00:00:00.000Z'),
      createdAt: NOW,
      updatedAt: NOW,
      ...overrides,
    };
  }
});
