import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropLegacySessionColumns1718452000000 implements MigrationInterface {
  name = 'DropLegacySessionColumns1718452000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "session"
        DROP COLUMN IF EXISTS fingerprint,
        DROP COLUMN IF EXISTS idle_expires_at,
        DROP COLUMN IF EXISTS absolute_expires_at
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "session"
        ADD COLUMN IF NOT EXISTS fingerprint varchar(256),
        ADD COLUMN IF NOT EXISTS idle_expires_at timestamp,
        ADD COLUMN IF NOT EXISTS absolute_expires_at timestamp
    `);
  }
}
