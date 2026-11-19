/// <reference types="jest" />

import { RpcException } from '@nestjs/microservices';

import { AuthService } from './auth.service';

const LOGIN = 'zemlya911@mail.ru';
const PASSWORD = 'Password-1';
const PASSWORD_HASH =
  '4164f2c6824f153600f2a460a727647b48a7f469c31dd613e1285f1bf89ee47df82545fba14120fbbc1a8a6ca4bcdd874def36616682e87e546ade3939ace431';

describe('AuthService', () => {
  const authRepository = {
    login: jest.fn(),
  };

  const config = {
    get: jest.fn((key: string) => {
      if (key === 'LEGACY_PASSWORD_HMAC_SECRET') {
        return 'password_salt';
      }

      return undefined;
    }),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(authRepository as never, config as never);
  });

  it('checks credentials with the configured legacy password HMAC', async () => {
    const user = { uuid: '9ed7d1a4-91eb-402a-8028-1654aeb259f5' };

    authRepository.login.mockResolvedValue(user);

    await expect(service.verifyCredentials(LOGIN, PASSWORD)).resolves.toBe(user);
    expect(authRepository.login).toHaveBeenCalledWith(LOGIN, PASSWORD_HASH);
  });

  it('throws an unauthorized RPC error for invalid credentials', async () => {
    authRepository.login.mockResolvedValue(null);

    await service.verifyCredentials(LOGIN, PASSWORD).then(
      () => {
        throw new Error('Expected credentials verification to fail');
      },
      (error: unknown) => {
        expect(error).toBeInstanceOf(RpcException);
        expect((error as RpcException).getError()).toEqual({
        statusCode: 401,
        code: 'invalid_credentials',
          message: 'Unauthorized',
        });
      },
    );
  });

  it('requires the legacy password HMAC secret', async () => {
    config.get.mockReturnValueOnce(undefined);

    await expect(service.verifyCredentials(LOGIN, PASSWORD)).rejects.toThrow(
      'LEGACY_PASSWORD_HMAC_SECRET is required until password credential migration is completed',
    );
  });
});
