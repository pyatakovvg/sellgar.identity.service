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

## Session context посетителя

Session issue/renew и active verify дополнительно возвращают ownerUuid и expiresAt
(ISO timestamp). Identity — единственный владелец этого соответствия: сейчас для
аккаунта ownerUuid=userUuid, одинаковый во всех его сессиях. Admin consumers
сохраняют прежние поля и продолжают работать.

Внутренний `identity.session.check { sessionUuid }` проверяет только `client_gw`
сессию для Cart sockets и возвращает `{ data: { status, sessionId?, userId?,
ownerUuid?, expiresAt? }, meta: {} }`. Нет cookie/secret/hash в ответе. При активной
сессии renewal window не требует менять ticket посреди ее короткой lease; revoked
или expired не допускаются. Проверка не является публичным HTTP endpoint.
Logout с прежним секретом в пределах установленного grace отзывает ту же сессию
после проверки fingerprint/clientType/gateway.

Гостевой режим использует ту же Session: user_uuid nullable, owner_uuid обязателен.
identity.session.issueGuest выдаёт сессию client_gw/web без создания User и Cart.
Гостевой owner стабилен при renew; срок GUEST_SESSION_IDLE_TIMEOUT_MS по умолчанию
30 дней. verify/check пассивны. Sign-in получает текущий sessionSecret только от
проверенного gateway; после успешной проверки пароля одна транзакция создаёт
аккаунтную сессию, отзывает гостя и пишет identity.owner.closed.v1 в outbox.
Неверный пароль ничего не меняет. Область замены аккаунта включает gateway/clientType.

Worker завершает истёкших гостей и публикует lifecycle-события с повтором в
AMQP_EVENTS_EXCHANGE. Identity не зависит от Cart: каждый потребитель применяет
свою политику завершения владельца. Logout аккаунта не публикует owner.closed.
Применить GuestSessions1794870000000 перед новым runtime. При отсутствии ts-node
после yarn build:identity_srv использовать
`node node_modules/typeorm/cli.js -d dist/data-source.js migration:run`.
