# @service/identity

`services/identity_srv` - доменный сервис идентификации. Он владеет пользователями, персонами, auth, access/refresh tokens и сессиями.

## Что здесь находится

- `src/main.ts` - Nest bootstrap как RMQ microservice command consumer.
- `src/app.module.ts` - `ConfigModule`, PostgreSQL через TypeORM и `ApiV1Module`.
- `src/api/v1/auth` - авторизация и refresh flow.
- `src/api/v1/user` - пользовательская модель и операции.
- `src/api/v1/person` - персональные данные.
- `src/api/v1/session` - сессии и их repository/service/controller слои.
- `src/api/v1/access-token` и `src/api/v1/refresh-token` - выпуск и проверка токенов.

## Правила изменений

- Этот сервис является владельцем identity-данных; gateway должны адаптировать его контракт, а не дублировать бизнес-логику.
- При изменении сущностей TypeORM проверяйте связанные `model`, `entity`, `repository`, `service` и DTO.
- Изменения auth/token/session должны сверяться с `gateways/admin`, `gateways/client` и `gateways/mobile`.
- RMQ queue берется из `AMQP_IDENTITY_SRV_COMMAND_QUEUE`; не меняйте его без согласования потребителей.

## Проверка

Основная проверка: `yarn workspace @service/identity run build`.

## Владелец корзины и приватные сокеты

Issue/renew/active verify возвращают ownerUuid и expiresAt. Для существующего
аккаунта ownerUuid определяется здесь как userUuid; consumers не выводят его
самостоятельно. Гость имеет отдельный стабильный ownerUuid и userUuid=null; фиктивный User не создаётся.
Это общий session context посетителя, независимый от Cart.
Внутренний `identity.session.check { sessionUuid }` предназначен Socket Gateway:
читает только client_gw-сессию, проверяет revoke/expiry и возвращает тот же principal
без secret/hash. Не требует renewal внутри короткой socket lease. HTTP его не
публикует; ticket предварительно проверяется Socket Gateway. Logout с предыдущим
секретом в renew grace отзывает ту же связанную сессию.


## Гостевые сессии

- identity.session.issueGuest доступен для storefront client_gw/web; сессия не создаёт корзину.
- Session.ownerUuid хранится явно. Issue/verify/renew/check возвращают userId=null гостю, ownerUuid остаётся стабильным.
- Guest TTL: GUEST_SESSION_IDLE_TIMEOUT_MS, default 30 дней. Renew обновляет срок; verify/check его не продлевают.
- Sign-in проверяет пароль до изменения сессий. Выпуск аккаунта, отзыв прежнего гостя и запись owner.closed выполняются одной транзакцией; область замены аккаунта включает gateway/clientType.
- Отзыв и истечение гостя пишут identity.owner.closed.v1 в session_owner_outbox. Worker завершает истёкшие сессии и публикует события с повтором; бизнес-политики принадлежат consumers. Отзыв аккаунтной сессии не закрывает владельца.
- AMQP_EVENTS_EXCHANGE обязателен. Consumer durable queue/binding разворачивается до первого события.
- Migration: GuestSessions1794870000000. synchronize не включать. Без локального ts-node: после build выполнить node node_modules/typeorm/cli.js -d dist/data-source.js migration:run.
