import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { firstValueFrom, timeout } from 'rxjs';

import { SessionRepository } from '../repository/repository.repository';

export const IDENTITY_EVENTS = 'IDENTITY_EVENTS';

@Injectable()
export class SessionLifecycleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionLifecycleService.name);

  private timer?: ReturnType<typeof setInterval>;

  private running?: Promise<void>;

  private stopping = false;

  constructor(
    @InjectDataSource() private readonly database: DataSource,
    private readonly sessions: SessionRepository,
    @Inject(IDENTITY_EVENTS) private readonly events: ClientProxy,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.flush(), 1000);
    void this.flush();
  }

  async onModuleDestroy(): Promise<void> {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    await this.running;
    await this.events.close();
  }

  flush(): Promise<void> {
    if (this.stopping) return Promise.resolve();

    this.running ??= this.publishPending()
      .catch(() => {
        // Do not log credentials or broker URLs from transport errors.
        this.logger.error('Identity session lifecycle delivery failed; pending events will be retried');
      })
      .finally(() => {
        this.running = undefined;
      });
    return this.running;
  }

  private async publishPending(): Promise<void> {
    await this.sessions.expireGuests();
    const [events] = await this.database.query(`
      WITH pending AS (
        SELECT uuid FROM session_owner_outbox
        WHERE published_at IS NULL AND next_attempt_at <= now()
          AND (locked_until IS NULL OR locked_until < now())
        ORDER BY occurred_at LIMIT 50 FOR UPDATE SKIP LOCKED
      ) UPDATE session_owner_outbox SET locked_until=now()+interval '60 seconds',attempts=attempts+1
        WHERE uuid IN (SELECT uuid FROM pending) RETURNING *
    `);
    for (const event of events) {
      if (this.stopping) break;

      try {
        await firstValueFrom(
          this.events
            .emit('identity.owner.closed.v1', {
              eventUuid: event.uuid,
              eventType: 'identity.owner.closed.v1',
              schemaVersion: 1,
              producer: 'identity_srv',
              ownerUuid: event.owner_uuid,
              occurredAt: new Date(event.occurred_at).toISOString(),
              reason: event.reason,
            })
            .pipe(timeout(5000)),
        );
        await this.database.query(
          'UPDATE session_owner_outbox SET published_at=now(),locked_until=NULL WHERE uuid=$1',
          [event.uuid],
        );
      } catch {
        this.logger.warn(`Owner lifecycle event ${event.uuid} will be retried`);
        await this.database.query(
          `UPDATE session_owner_outbox SET locked_until=NULL,
            next_attempt_at=now()+least(attempts,60)*interval '1 second' WHERE uuid=$1`,
          [event.uuid],
        );
      }
    }
  }
}
