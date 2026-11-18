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

  it('delegates account replacement and guest closure to one repository transaction', async () => {
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

    expect(sessionRepository.remove).not.toHaveBeenCalled();
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
      ownerUuid: USER_ID,
      expiresAt: '2026-06-23T00:00:00.000Z',
      sessionSecret: expect.any(String),
    });
  });

  it('verifies an active session bound to secret and fingerprint', async () => {
    sessionRepository.get.mockResolvedValue(makeSession());

    await expect(verify()).resolves.toEqual({
      data: {
        sessionId: SESSION_ID,
        status: 'active',
        userId: USER_ID,
        ownerUuid: USER_ID,
        expiresAt: '2026-06-23T00:00:00.000Z',
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
        sessionId: SESSION_ID,
        status: 'active',
        userId: USER_ID,
        ownerUuid: USER_ID,
        expiresAt: '2026-06-23T00:00:00.000Z',
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

    await expect(verify()).resolves.toMatchObject({
      data: { status: 'renew_required', sessionId: SESSION_ID, userId: USER_ID, ownerUuid: USER_ID },
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
      ownerUuid: USER_ID,
      expiresAt: '2026-06-23T00:00:00.000Z',
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

  it('issues a real guest session without finding or creating a user', async () => {
    sessionRepository.create.mockImplementation(async (dto) => makeSession({ ...dto }));
    const result = await service.issueGuest({
      device: 'Browser',
      fingerprint: 'browser',
      clientType: 'web',
      gateway: 'client_gw',
    });
    expect(result.userId).toBeNull();
    expect(result.ownerUuid).toMatch(/^[a-f0-9-]{36}$/);
    expect(result.expiresAt).toBe('2026-07-22T00:00:00.000Z');
    expect(sessionRepository.find).not.toHaveBeenCalled();
    expect(sessionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userUuid: null, authMethod: 'guest' }),
    );
  });

  it('rejects guest issuance for admin even on the internal bus', async () => {
    await expect(
      service.issueGuest({ device: 'Browser', fingerprint: 'browser', clientType: 'web', gateway: 'admin_gw' }),
    ).rejects.toBeDefined();
    expect(sessionRepository.create).not.toHaveBeenCalled();
  });

  it('preserves the guest owner through verification, passive socket checks and renewal', async () => {
    const ownerUuid = 'b54e15ce-2a22-464f-8507-0f9122300db1';
    const guest = makeSession({ userUuid: null, ownerUuid, gateway: 'client_gw' });
    sessionRepository.get.mockResolvedValue(guest);
    sessionRepository.renew.mockResolvedValue(guest);
    await expect(verify()).resolves.toMatchObject({ data: { userId: null, ownerUuid } });
    await expect(service.check(SESSION_ID)).resolves.toMatchObject({ data: { userId: null, ownerUuid } });
    expect(sessionRepository.renew).not.toHaveBeenCalled();
    await expect(
      service.renew({ sessionSecret: 'secret', fingerprint: 'fp', clientType: 'web', gateway: 'client_gw' }),
    ).resolves.toMatchObject({ userId: null, ownerUuid });
    expect(sessionRepository.renew.mock.calls[0][4]).toEqual(new Date('2026-07-22T00:00:00.000Z'));
  });

  it('passes only the hashed current credential into the atomic sign-in transition', async () => {
    sessionRepository.create.mockImplementation(async (dto) => makeSession({ ...dto }));
    await service.create({
      userUuid: USER_ID,
      device: 'Browser',
      fingerprint: 'fp',
      clientType: 'web',
      gateway: 'client_gw',
      authMethod: 'password',
      assuranceLevel: 'medium',
      sessionSecret: 'guest-secret',
    });
    expect(sessionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUuid: USER_ID,
        replacedSessionSecretHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(sessionRepository.remove).not.toHaveBeenCalled();
  });

  function verify() {
    return service.verify({
      sessionSecret: 'current-session-secret',
      fingerprint: 'raw-fingerprint',
      clientType: 'web',
      gateway: 'admin_gw',
    });
  }

  it('returns the normalized owner only for an active client session during socket checks', async () => {
    sessionRepository.get.mockResolvedValue(
      makeSession({ gateway: 'client_gw', renewRequiredAt: new Date('2026-06-21') }),
    );
    await expect(service.check(SESSION_ID)).resolves.toMatchObject({
      data: { status: 'active', ownerUuid: USER_ID, userId: USER_ID, sessionId: SESSION_ID },
    });
    expect(sessionRepository.get).toHaveBeenCalledWith({ uuid: SESSION_ID, gateway: 'client_gw' });
    sessionRepository.get.mockResolvedValue(makeSession({ status: 'revoked', isRevoked: true }));
    await expect(service.check(SESSION_ID)).resolves.toEqual({ data: { status: 'revoked' }, meta: {} });
  });

  it('revokes a renewed session when logout carries its previous secret within grace', async () => {
    sessionRepository.remove.mockResolvedValueOnce(null).mockResolvedValueOnce(makeSession({ status: 'revoked' }));
    sessionRepository.getByPreviousSecret.mockResolvedValue(makeSession());
    await service.remove({ sessionSecret: 'previous', fingerprint: 'fp', clientType: 'web', gateway: 'client_gw' });
    expect(sessionRepository.remove).toHaveBeenLastCalledWith(
      expect.objectContaining({ uuid: SESSION_ID, gateway: 'client_gw', revokeReason: 'manual' }),
    );
  });

  function makeSession(overrides: Record<string, unknown> = {}) {
    return {
      uuid: SESSION_ID,
      userUuid: USER_ID,
      ownerUuid: USER_ID,
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
