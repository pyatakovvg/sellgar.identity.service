import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  private brokerConnected = false;

  constructor(private readonly database: DataSource) {}

  setBrokerConnected(connected: boolean): void {
    this.brokerConnected = connected;
  }

  async check(): Promise<{ service: string; status: 'ok' }> {
    if (!this.brokerConnected) {
      throw new ServiceUnavailableException('Identity command consumer is unavailable');
    }

    try {
      await this.database.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Identity database is unavailable');
    }

    return { service: 'sellgar.identity.service', status: 'ok' };
  }
}
