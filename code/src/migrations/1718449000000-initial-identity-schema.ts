import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialIdentitySchema1718449000000 implements MigrationInterface {
  name = 'InitialIdentitySchema1718449000000';

  async up(runner: QueryRunner): Promise<void> {
    const existing: boolean[] = [];
    for (const table of ['user', 'person', 'session']) {
      existing.push(await runner.hasTable(table));
    }

    // Existing installations predate migrations and already contain these base tables.
    if (existing.every(Boolean)) return;
    if (existing.some(Boolean)) {
      throw new Error('Identity base schema is incomplete; repair it before applying migrations');
    }

    await runner.query(`CREATE TABLE "user" (
      uuid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      login varchar(256) NOT NULL,
      password varchar(256) NOT NULL,
      is_blocked boolean NOT NULL DEFAULT false,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )`);
    await runner.query(`CREATE TYPE person_sex_enum AS ENUM ('MALE', 'FEMALE')`);
    await runner.query(`CREATE TABLE person (
      uuid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name varchar(256) NOT NULL,
      surname varchar(256) NOT NULL,
      patronymic varchar(256) NOT NULL,
      birthday timestamp NOT NULL,
      sex person_sex_enum,
      user_uuid uuid NOT NULL UNIQUE REFERENCES "user"(uuid) ON DELETE CASCADE,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )`);
    await runner.query(`CREATE TABLE session (
      uuid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_uuid uuid NOT NULL REFERENCES "user"(uuid) ON DELETE CASCADE,
      device varchar(256) NOT NULL,
      fingerprint varchar(256),
      is_revoked boolean NOT NULL DEFAULT false,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )`);
  }

  async down(): Promise<void> {
    throw new Error('Initial identity schema cannot be reverted automatically: it may contain pre-existing data');
  }
}
