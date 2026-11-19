import { MigrationInterface, QueryRunner } from 'typeorm';

export class SessionFirstAuth1718450000000 implements MigrationInterface {
  name = 'SessionFirstAuth1718450000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "session"
        ADD COLUMN IF NOT EXISTS secret_hash varchar(128),
        ADD COLUMN IF NOT EXISTS client_type varchar(32),
        ADD COLUMN IF NOT EXISTS gateway varchar(64),
        ADD COLUMN IF NOT EXISTS auth_method varchar(64),
        ADD COLUMN IF NOT EXISTS assurance_level varchar(32),
        ADD COLUMN IF NOT EXISTS status varchar(32),
        ADD COLUMN IF NOT EXISTS idle_expires_at timestamp,
        ADD COLUMN IF NOT EXISTS absolute_expires_at timestamp,
        ADD COLUMN IF NOT EXISTS revoked_at timestamp,
        ADD COLUMN IF NOT EXISTS revoke_reason varchar(128)
    `);

    await queryRunner.query(`
      UPDATE "session"
      SET
        secret_hash = COALESCE(secret_hash, md5(gen_random_uuid()::text || clock_timestamp()::text)),
        client_type = COALESCE(client_type, 'web'),
        gateway = COALESCE(gateway, 'admin_gw'),
        auth_method = COALESCE(auth_method, 'password'),
        assurance_level = COALESCE(assurance_level, 'medium'),
        status = 'revoked',
        is_revoked = true,
        idle_expires_at = COALESCE(idle_expires_at, now()),
        absolute_expires_at = COALESCE(absolute_expires_at, now()),
        revoked_at = COALESCE(revoked_at, now()),
        revoke_reason = COALESCE(revoke_reason, 'session-first-migration')
      WHERE secret_hash IS NULL
         OR client_type IS NULL
         OR gateway IS NULL
         OR auth_method IS NULL
         OR assurance_level IS NULL
         OR status IS NULL
         OR idle_expires_at IS NULL
         OR absolute_expires_at IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "session"
        ALTER COLUMN secret_hash SET NOT NULL,
        ALTER COLUMN client_type SET NOT NULL,
        ALTER COLUMN gateway SET NOT NULL,
        ALTER COLUMN auth_method SET NOT NULL,
        ALTER COLUMN assurance_level SET NOT NULL,
        ALTER COLUMN status SET NOT NULL,
        ALTER COLUMN idle_expires_at SET NOT NULL,
        ALTER COLUMN absolute_expires_at SET NOT NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS session_secret_hash_uindex
        ON "session" (secret_hash)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS session_user_status_idx
        ON "session" (user_uuid, status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS session_client_gateway_status_idx
        ON "session" (client_type, gateway, status)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS session_client_gateway_status_idx');
    await queryRunner.query('DROP INDEX IF EXISTS session_user_status_idx');
    await queryRunner.query('DROP INDEX IF EXISTS session_secret_hash_uindex');

    await queryRunner.query(`
      ALTER TABLE "session"
        DROP COLUMN IF EXISTS revoke_reason,
        DROP COLUMN IF EXISTS revoked_at,
        DROP COLUMN IF EXISTS absolute_expires_at,
        DROP COLUMN IF EXISTS idle_expires_at,
        DROP COLUMN IF EXISTS status,
        DROP COLUMN IF EXISTS assurance_level,
        DROP COLUMN IF EXISTS auth_method,
        DROP COLUMN IF EXISTS gateway,
        DROP COLUMN IF EXISTS client_type,
        DROP COLUMN IF EXISTS secret_hash
    `);
  }
}
