import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { HealthService } from './health.service';

describe('Identity readiness', () => {
  const database = { query: jest.fn() };
  let health: HealthService;

  beforeEach(() => {
    database.query.mockReset().mockResolvedValue([{ '?column?': 1 }]);
    health = new HealthService(database as unknown as DataSource);
  });

  it('rejects readiness until the command consumer connects', async () => {
    await expect(health.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects readiness after the consumer disconnects', async () => {
    health.setBrokerConnected(true);
    await expect(health.check()).resolves.toMatchObject({ status: 'ok' });
    health.setBrokerConnected(false);
    await expect(health.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects readiness when the database cannot be queried', async () => {
    health.setBrokerConnected(true);
    database.query.mockRejectedValue(new Error('Database connection lost'));
    await expect(health.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
