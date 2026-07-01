import 'dotenv/config';
import { DataSource } from 'typeorm';

import { UserModel } from './api/v1/user/user.model';
import { PersonModel } from './api/v1/person/person.model';
import { SessionModel } from './api/v1/session/session.model';

import { SessionFirstAuth1718450000000 } from './migrations/1718450000000-session-first-auth';
import { SessionBindingRenewWindow1718451000000 } from './migrations/1718451000000-session-binding-renew-window';
import { DropLegacySessionColumns1718452000000 } from './migrations/1718452000000-drop-legacy-session-columns';
import { SessionRenewSecretGrace1718453000000 } from './migrations/1718453000000-session-renew-secret-grace';

declare const process: {
  env: Record<string, string | undefined>;
};

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_DATABASE_NAME,
  entities: [UserModel, PersonModel, SessionModel],
  migrations: [
    SessionFirstAuth1718450000000,
    SessionBindingRenewWindow1718451000000,
    DropLegacySessionColumns1718452000000,
    SessionRenewSecretGrace1718453000000,
  ],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
});
