# sellgar.identity.service

`sellgar.identity.service` - backend service, который владеет identity/auth/session контуром Sellgar.

Сервис принимает команды через RabbitMQ, работает с PostgreSQL и отвечает за:

- пользователей;
- персональные данные пользователя;
- логин;
- refresh/access token lifecycle;
- session lifecycle;
- восстановление и удаление сессий.

## Зона ответственности

Identity service владеет доменной моделью identity и временем жизни session/token данных.

Он не должен владеть:

- HTTP cookie transport admin gateway;
- UI/BFF DTO для admin frontend;
- MinIO/object storage;
- установкой RabbitMQ в операционной системе;
- общей dev-инфрой workspace.

Gateway может хранить transport cookie, но валидность сессии и token lifecycle остаются в этом сервисе.

## Текущая структура

Репозиторий схлопнут в одиночный package:

```text
.
├── package.json
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

## Установка

Из корня репозитория:

```bash
yarn install
```

Репозиторий использует Yarn 3.6.1 и `nodeLinker: node-modules`.

Требуемая версия Node.js: 24+.

## Локальный запуск

Подготовить env:

```bash
cp .env.example .env
```

Для запуска нужны внешние зависимости:

- RabbitMQ;
- PostgreSQL с базой `identity_srv`.

Запуск:

```bash
yarn start:dev
```

Production-like старт после сборки:

```bash
yarn build
yarn start
```

## Проверки

Минимальная проверка перед commit:

```bash
yarn build
```

GitHub Actions запускает:

```bash
yarn install --immutable
yarn build
```

## Dev infrastructure

В этом repo намеренно нет:

- `docker-compose.yaml` для MinIO/RabbitMQ/Postgres;
- OS-level install scripts для RabbitMQ;
- GitLab CI.

RabbitMQ и PostgreSQL должны запускаться из общей dev-инфры `sellgar.workspace` или вручную в локальном окружении. MinIO не является зависимостью identity service.

## Документация для агентов

Архитектурные ограничения, текущий аудит и порядок безопасных изменений описаны в `AGENTS.md`.
