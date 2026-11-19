import { MigrationInterface, QueryRunner } from 'typeorm';

export class GuestSessions1794870000000 implements MigrationInterface {
  name = 'GuestSessions1794870000000';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE session ADD COLUMN owner_uuid uuid`);
    await runner.query(`UPDATE session SET owner_uuid=user_uuid`);
    await runner.query(
      `ALTER TABLE session ALTER COLUMN owner_uuid SET NOT NULL, ALTER COLUMN user_uuid DROP NOT NULL`,
    );
    await runner.query(`ALTER TABLE session ADD CONSTRAINT session_owner_account_check
      CHECK (user_uuid IS NULL OR owner_uuid=user_uuid)`);
    await runner.query(`CREATE UNIQUE INDEX session_guest_owner_uindex ON session(owner_uuid) WHERE user_uuid IS NULL`);
    await runner.query(
      `CREATE INDEX session_guest_expiry_idx ON session(expires_at) WHERE user_uuid IS NULL AND status='active'`,
    );
    await runner.query(`CREATE TABLE session_owner_outbox (
      uuid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_uuid uuid NOT NULL UNIQUE,
      reason varchar(128) NOT NULL,
      occurred_at timestamptz NOT NULL DEFAULT now(),
      published_at timestamptz,
      locked_until timestamptz,
      next_attempt_at timestamptz NOT NULL DEFAULT now(),
      attempts integer NOT NULL DEFAULT 0
    )`);
    await runner.query(`CREATE INDEX session_owner_outbox_pending_idx ON session_owner_outbox(next_attempt_at)
      WHERE published_at IS NULL`);
  }

  async down(runner: QueryRunner): Promise<void> {
    // A downgrade must not silently remove guest identities or their pending lifecycle events.
    await runner.query(`DO $$ BEGIN
      IF EXISTS(SELECT 1 FROM session WHERE user_uuid IS NULL)
        OR EXISTS(SELECT 1 FROM session_owner_outbox WHERE published_at IS NULL)
      THEN RAISE EXCEPTION 'Guest sessions must be retired before downgrade'; END IF;
    END $$`);
    await runner.query(`DROP TABLE session_owner_outbox`);
    await runner.query(`DROP INDEX session_guest_expiry_idx`);
    await runner.query(`DROP INDEX session_guest_owner_uindex`);
    await runner.query(`ALTER TABLE session DROP CONSTRAINT session_owner_account_check,
      DROP COLUMN owner_uuid, ALTER COLUMN user_uuid SET NOT NULL`);
  }
}
