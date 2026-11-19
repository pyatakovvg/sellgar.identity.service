import { MigrationInterface, QueryRunner } from 'typeorm';

export class SessionBindingRenewWindow1718451000000 implements MigrationInterface {
  name = 'SessionBindingRenewWindow1718451000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "session"
        ADD COLUMN IF NOT EXISTS fingerprint_hash varchar(128),
        ADD COLUMN IF NOT EXISTS renew_required_at timestamp,
        ADD COLUMN IF NOT EXISTS expires_at timestamp
    `);

    await queryRunner.query(`
      UPDATE "session"
      SET
        fingerprint_hash = COALESCE(fingerprint_hash, md5(COALESCE(fingerprint, gen_random_uuid()::text))),
        renew_required_at = COALESCE(renew_required_at, idle_expires_at, now()),
        expires_at = COALESCE(expires_at, absolute_expires_at, now()),
        status = CASE
          WHEN status = 'active' THEN 'revoked'
          ELSE COALESCE(status, 'revoked')
        END,
        is_revoked = true,
        revoked_at = COALESCE(revoked_at, now()),
        revoke_reason = COALESCE(revoke_reason, 'session-binding-migration')
      WHERE fingerprint_hash IS NULL
         OR renew_required_at IS NULL
         OR expires_at IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "session"
        ALTER COLUMN fingerprint_hash SET NOT NULL,
        ALTER COLUMN renew_required_at SET NOT NULL,
        ALTER COLUMN expires_at SET NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS session_binding_verify_idx
        ON "session" (secret_hash, fingerprint_hash, gateway, client_type, status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS session_user_fingerprint_active_idx
        ON "session" (user_uuid, fingerprint_hash, gateway, client_type, status)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS session_user_fingerprint_active_idx');
    await queryRunner.query('DROP INDEX IF EXISTS session_binding_verify_idx');

    await queryRunner.query(`
      ALTER TABLE "session"
        DROP COLUMN IF EXISTS expires_at,
        DROP COLUMN IF EXISTS renew_required_at,
        DROP COLUMN IF EXISTS fingerprint_hash
    `);
  }
}
