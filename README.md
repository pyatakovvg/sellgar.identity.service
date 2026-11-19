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

## Структура и запуск

```text
code/                   Nest source, package.json, Yarn lock, .env.example
Dockerfile              Node 24 build/test and non-root production image
.github/                image CI, release button and isolated smoke
helm/values.app.yaml    common application values and Secret references
helm/dev/values.yaml    development .env ConfigMap, one replica
helm/prod/values.yaml   production overrides (not deployed yet)
```

Из `code/`:

```bash
cp .env.example .env
node .yarn/releases/yarn-4.18.0.cjs install --immutable
node .yarn/releases/yarn-4.18.0.cjs test --runInBand
node .yarn/releases/yarn-4.18.0.cjs build:identity_srv
node node_modules/typeorm/cli.js -d dist/data-source.js migration:run
node .yarn/releases/yarn-4.18.0.cjs start:identity_srv.prod
```

Необходимы PostgreSQL и RabbitMQ. Доменные команды остаются RMQ; внутренний
`GET /health` на PORT (default 8080) проверяет базу и RMQ consumer. Отключение
брокера/базы возвращает 503. Внешнего HTTP API/Ingress у сервиса нет.

## CI и Kubernetes

Push в development/release/*: build image → isolated smoke → GHCR publish.
Smoke применяет все шесть миграций на пустой базе, повторяет migration:run,
проверяет guest issue/verify/fingerprint binding/renew/check/revoke через RMQ,
non-root запуск с read-only filesystem и mounted `.env`, затем проверяет
снятие readiness при отключении тестового RabbitMQ. Рабочие данные не используются.

Release/* вливается в master; workflow Release to production запускается вручную
с ID успешной release-сборки. Продвигается тот же digest, без пересборки; workflow
готовит production manifest и back-merge PR master → development. Подключение этого
manifest к prod Argo CD — отдельный этап; production сейчас не развёрнут.

ConfigMap `.env` монтируется в `/app/.env` при запуске. Секреты БД, брокера и
Identity передаются из Kubernetes Secret через environment; в образе их нет.
Отдельная база/владелец `identity_srv` создаются оператором CloudNativePG из
infrastructure desired state. Перед Deployment запускается migration Sync Job;
TypeORM synchronize не используется. Baseline создаёт отсутствовавшие в старом
наборе миграций базовые таблицы, сохраняя уже существующие установки.

Argo CD Application, image digest и закреплённые revisions chart/values находятся
в `sellgar.infrastructure/environments/dev/services/identity-service/`.

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
