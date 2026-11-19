import { MigrationInterface, QueryRunner } from 'typeorm';

export class SessionRenewSecretGrace1718453000000 implements MigrationInterface {
  name = 'SessionRenewSecretGrace1718453000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "session"
        ADD COLUMN IF NOT EXISTS previous_secret_hash varchar(128),
        ADD COLUMN IF NOT EXISTS previous_secret_accepted_until timestamp
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS session_previous_secret_grace_idx
        ON "session" (previous_secret_hash, fingerprint_hash, gateway, client_type, status)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS session_previous_secret_grace_idx');

    await queryRunner.query(`
      ALTER TABLE "session"
        DROP COLUMN IF EXISTS previous_secret_accepted_until,
        DROP COLUMN IF EXISTS previous_secret_hash
    `);
  }
}
