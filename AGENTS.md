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
