# sellgar.identity.service

Этот файл - рабочая инструкция для агентов, которые меняют или аудируют `sellgar.identity.service`.
Обновляй его, когда в пакете появляются новые правила, runtime-контракты, известные проблемы или решения по структуре.

## Назначение пакета

`sellgar.identity.service` - backend service identity/auth/session контура Sellgar.

Сервис владеет:

- `user` - учетная запись пользователя;
- `person` - персональные данные пользователя;
- `auth` - login flow;
- `session` - session lifecycle;
- `access-token` - генерация и проверка access token;
- `refresh-token` - генерация, хранение и проверка refresh token.

Сервис работает как NestJS RMQ microservice и хранит состояние в PostgreSQL через TypeORM.

## Границы ответственности

Identity service должен владеть валидностью сессии и token/session lifecycle.

Он не должен владеть:

- HTTP cookie transport gateway;
- admin-facing HTTP API и UI/BFF DTO;
- product/file domain logic;
- MinIO/object storage;
- установкой RabbitMQ на уровне ОС;
- общей dev-инфрой workspace.

Если меняешь session/token контракт, сначала проверь связанный transport contract в `sellgar.admin.gateway`.

## Текущая структура

```text
.
├── package.json
├── yarn.lock
├── .env.example
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   └── api/
│       └── v1/
│           ├── access-token/
│           ├── auth/
│           ├── person/
│           ├── refresh-token/
│           ├── session/
│           └── user/
└── AGENTS.md
```

Структура схлопнута из бывшего `services/identity_srv` в корень repo. Внутреннюю структуру `src/api/v1/*` не меняй без отдельного архитектурного решения, потому что сервисы Sellgar сейчас сохраняют одинаковый NestJS layout.

## Команды

Запускать из корня этого репозитория:

```bash
yarn install
yarn build
yarn start:dev
yarn start
```

Текущая проверка сборки:

```bash
yarn build
```

## Git и install-артефакты

Репозиторий использует Yarn 3.6.1 с `nodeLinker: node-modules`.

Tracked:

- `.yarn/releases`
- `.yarn/plugins`
- `yarn.lock`

Ignored/local:

- `node_modules/`
- `.yarn/cache/`
- `.yarn/install-state.gz`
- `dist/`

Не коммить `node_modules`, `.yarn/cache`, `.yarn/install-state.gz` без отдельного решения по zero-install стратегии.

## Runtime-контракты

### Config

`ConfigModule.forRoot({ envFilePath: './.env', isGlobal: true })` подключается в `src/app.module.ts`.

`.env.example` описывает текущие обязательные keys:

- `AMQP_IDENTITY_SRV_COMMAND_QUEUE`
- `AMQP_IDENTITY_SRV_EXCHANGE`
- `AMQP_PORT`
- `AMQP_HOSTNAME`
- `AMQP_USERNAME`
- `AMQP_PASSWORD`
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_USERNAME`
- `DATABASE_PASSWORD`
- `DATABASE_DATABASE_NAME`
- `EXPIRES_IN_ACCESS_TOKEN`
- `EXPIRES_IN_REFRESH_TOKEN`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`

### Transport

`src/main.ts` поднимает NestJS RMQ microservice:

- transport: `Transport.RMQ`;
- queue: `AMQP_IDENTITY_SRV_COMMAND_QUEUE`;
- durable queue;
- persistent messages.

HTTP server здесь не является публичным контрактом пакета. Основной runtime contract - RMQ command handlers в `src/api/v1/*/controller`.

### Database

PostgreSQL подключается через TypeORM. Entity auto-loading включен через `autoLoadEntities: true`.

Модели используют `gen_random_uuid()` в Postgres для UUID primary keys. Локальная база должна иметь нужную поддержку UUID generation.

## Архитектурный аудит

Этот аудит рассматривает репозиторий как самостоятельный продуктовый пакет, а не как папку, механически вынутую из старого `sellgar.server`.

### P0 - убрать ложные сигналы о владении и CI

Статус: выполнено. Из repo удалены `.gitlab-ci.yml`, `docker-compose.yaml`, `docker-compose-minio.yaml` и `rabbit.sh`. Вместо GitLab CI добавлен GitHub Actions workflow `.github/workflows/ci.yml`.

1. `.gitlab-ci.yml` был вреден.

   Файл описывал GitLab pipeline для `services/company_srv/**/*`, которого в этом репозитории нет. Репозиторий живет в GitHub, поэтому файл создавал ложное ожидание, что CI уже есть и что пакет связан с `company_srv`.

   Решение: удален. CI перенесен в `.github/workflows/ci.yml` с реальными командами:

   ```bash
   yarn install --immutable
   yarn build
   ```

2. `docker-compose.yaml` и `docker-compose-minio.yaml` не принадлежали identity service.

   В `docker-compose.yaml` RabbitMQ/Postgres были закомментированы, а реально активен только `monorepo_minio`. MinIO не является зависимостью identity service. Два MinIO compose файла с разными credentials создавали ложный storage contract.

   Решение: удалены. Общую локальную инфраструктуру держать на уровне `sellgar.workspace`, а MinIO-specific инфраструктуру - в `sellgar.file.service` или workspace dev-инфре.

3. `rabbit.sh` не должен быть частью пакета.

   Это OS-level install script: `sudo`, apt repositories, `systemctl`, включение RabbitMQ plugin. Такой скрипт не является ни build dependency, ни runtime contract identity service.

   Решение: удален. RabbitMQ документируется как внешняя dev dependency.

### P0 - решить судьбу монорепы внутри отдельного repo

Статус: выполнено. `services/identity_srv` схлопнут в корень repo; root package теперь `@service/identity`, команды запускаются напрямую через `yarn build`, `yarn start:dev`, `yarn start`.

Решение принято потому что:

- workspace-level `sellgar.workspace` уже является точкой сборки нескольких repos через git submodules;
- внутри `sellgar.identity.service` не было второго package, ради которого нужен Yarn workspace;
- root package назывался `root`, а реальные команды проксировались через workspace aliases;
- CI, README, onboarding и IDE получали лишний уровень вложенности.

### P1 - зависимости

Статус: выполнено для очевидно неиспользуемых пакетов.

Оставлены зависимости, которые реально используются текущим кодом:

- `@nestjs/jwt` - access/refresh token services;
- `@nestjs/microservices` - RMQ transport/controllers;
- `@nestjs/typeorm`, `typeorm`, `pg` - PostgreSQL persistence;
- `class-validator`, `class-transformer` - DTO validation;
- NestJS core/platform/config packages.

Удалены из dependency list неиспользуемые пакеты:

- `@mkfyi/nestjs-rmq`;
- `@nestjs/passport`;
- `passport`;
- `passport-jwt`;
- `passport-local`;
- `uuid`;
- related passport/uuid type packages;
- `ts-loader`;
- `source-map-support`.

Если возвращаешь Passport strategy или ручную UUID generation, сначала добавь код и только потом возвращай dependency.
