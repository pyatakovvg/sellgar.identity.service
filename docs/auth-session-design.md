# Стратегия авторизации и сессий

Документ фиксирует целевую стратегию разработки `identity_srv` и gateway-адаптеров. Это рабочий документ, по которому ведем перепроектирование авторизации и сессий.

## Статус решения

Принято целевое решение: система строится вокруг универсальной серверной сессии, а не вокруг access/refresh token flow.

Любой способ входа должен приводить к одному результату:

```txt
credential strategy -> verified principal -> session.issue -> gateway получает session credential
```

Способ входа не должен создавать отдельную модель авторизации. Пароль, телефон/OTP и будущие social providers являются разными credential strategies, но после успешной проверки они используют единый механизм сессий.

## Бизнес-потребности

Текущий scope:

- авторизация через логин и пароль;
- авторизация по номеру телефона и OTP;
- установка сессии для web и mobile клиентов;
- мультидевайс: несколько независимых активных сессий у одного пользователя;
- управление сессиями: список, текущая сессия, отзыв одной сессии, отзыв всех сессий;
- logout текущей сессии.

Будущий scope:

- авторизация через почтовые/social providers;
- passkeys/WebAuthn;
- отдельные интеграционные токены для сторонних клиентов, публичных API, machine-to-machine и delegated access.

Система ролей и прав доступа будет проектироваться отдельным документом. В этой стратегии фиксируем только место будущего access-control слоя и не смешиваем его с auth/session.

## Нецели текущего этапа

- Не строим OAuth2 authorization server.
- Не проектируем machine-to-machine доступ.
- Не выдаем access/refresh tokens как базовый механизм для gateway-системы.
- Не поддерживаем старую JSON-cookie модель с `accessToken`, `refreshToken`, `sessionUuid`.
- Не проектируем роли, permissions и scopes в рамках этого документа.
- Не трогаем старые `client/mobile` ветки.

## Архитектурный принцип

Система делится на слои:

```txt
Identity       -> кто пользователь
Credentials    -> как пользователь доказывает личность
Auth Flow      -> какой сценарий входа проходит клиент
Sessions       -> где пользователь авторизован и как gateway это проверяет
Gateways       -> как конкретный клиент передает session credential
Audit/Policy   -> ограничения, лимиты, события безопасности
Access Control -> права доступа, проектируется отдельно
```

Слои не должны подменять друг друга:

- credential не создает сессию напрямую;
- session не хранит пароль, OTP или social identity;
- gateway не проверяет пароль и не владеет секретами авторизации;
- authorization не зашивается в auth strategy.

## Границы сервисов

### `identity_srv`

Владелец security core:

- пользователи и состояние аккаунта;
- credential strategies;
- auth flows и challenges;
- выпуск, проверка, продление и отзыв сессий;
- хранение hash session credential;
- мультидевайс и управление сессиями;
- audit/security events;
- security policy: rate limits, lockout, OTP attempts, session reuse detection.

`identity_srv` не должен полагаться на gateway для принятия решений о валидности credentials или session.

### `admin_gw`

Web adapter:

- принимает HTTP-запросы от web-клиента;
- ставит и очищает сессионную `HttpOnly Secure` cookie без собственного TTL;
- достает session credential из cookie;
- передает request context в `identity_srv`;
- получает verified session context;
- автоматически вызывает `identity.session.renew`, если `identity.session.verify` вернул `renew_required`;
- не знает password/OTP/session hashing secrets;
- не управляет временем жизни сессии: `renew_required_at` и `expires_at` принадлежат только `identity_srv`;
- не хранит access/refresh token secrets.

### `mobile_gw`

Будущий mobile adapter:

- принимает HTTP-запросы от мобильных клиентов;
- достает session credential из `Authorization: Bearer`;
- передает device context в `identity_srv`;
- получает verified session context;
- не реализует отдельную auth-бизнес-логику.

## Универсальная сессия

Сессия является единой для web и mobile. Отличается только способ доставки session credential.

Важно разделять идентификатор и секрет:

```txt
session.id          // внутренний идентификатор сессии, не используется как секрет
session.secret      // raw opaque credential, отдается клиенту один раз
session.secret_hash // хранится в БД
```

Клиент никогда не должен использовать `session.id` как доказательство владения сессией. Доказательство владения - только raw `session.secret`.

### Web delivery

```txt
Cookie: admin.sid=<session_secret>
```

Cookie параметры:

- `HttpOnly`;
- `Secure`;
- `SameSite=Lax` или `Strict` после проверки UX;
- `Path=/`;
- без user payload, ролей, прав, access token, refresh token и JSON session object.

### Mobile delivery

```txt
Authorization: Bearer <session_secret>
```

Это не OAuth access token. Это opaque session credential для нашей gateway-системы.

Mobile должен хранить credential только в защищенном хранилище платформы:

- iOS Keychain;
- Android Keystore / EncryptedSharedPreferences.

## Session lifecycle

Целевые команды `identity_srv`:

```txt
identity.session.issue
identity.session.verify
identity.session.renew
identity.session.revoke
identity.session.revokeAll
identity.session.list
```

### `session.issue`

Создает сессию после успешного auth flow.

Вход:

```ts
{
  userId: string;
  clientType: 'web' | 'mobile';
  gateway: 'admin_gw' | 'mobile_gw';
  device: {
    deviceId?: string;
    userAgent?: string;
    deviceName?: string;
    ip?: string;
  };
  authMethod: 'password' | 'phone_otp' | 'external_provider';
  assuranceLevel: 'low' | 'medium' | 'high';
}
```

Выход:

```ts
{
  sessionId: string;
  sessionSecret: string;
  renewRequiredAt: string;
  expiresAt: string;
}
```

В БД хранится только hash/HMAC от `sessionSecret` и HMAC от fingerprint, который передал gateway.

### `session.verify`

Проверяет session credential и возвращает normalized session context.

Вход:

```ts
{
  sessionSecret: string;
  gateway: 'admin_gw' | 'mobile_gw';
  clientType: 'web' | 'mobile';
  fingerprint: string;
}
```

Выход:

```ts
{
  status: 'active' | 'renew_required' | 'expired' | 'revoked' | 'invalid';
  userId?: string;
}
```

### `session.renew`

Заменяет refresh-token модель.

Поведение:

- проверяет текущий `sessionSecret`;
- проверяет `active` статус;
- проверяет `clientType`, `gateway` и fingerprint через строгий AND;
- проверяет `expiresAt`;
- обновляет `renewRequiredAt`;
- обновляет `expiresAt` на текущее время + полный срок жизни;
- ротирует `sessionSecret`;
- возвращает новый `sessionSecret`.

Ротация:

- старый secret инвалидируется сразу;
- старый secret после ротации не отслеживается отдельной историей;
- запрос со старым secret получает `401`.

### `session.revoke`

Отзывает текущую или указанную сессию.

Поведение:

- ставит `status = revoked`;
- пишет `revokedAt`;
- фиксирует audit event;
- для web gateway дополнительно очищает cookie;
- для mobile gateway credential перестает проходить `session.verify`.

### `session.revokeAll`

Отзывает все активные сессии пользователя.

Решение "оставлять текущую сессию активной или нет" должно быть явным параметром:

```ts
{
  userId: string;
  exceptSessionId?: string;
}
```

### `session.list`

Возвращает список сессий пользователя для UI управления сессиями.

Ответ не должен содержать raw `sessionSecret` или `secretHash`.

## Хранение сессий

Целевая модель:

```txt
session
  id
  user_id
  secret_hash
  client_type
  gateway
  device
  fingerprint_hash
  auth_method
  assurance_level
  status
  created_at
  renew_required_at
  expires_at
  revoked_at
  revoke_reason
```

Допустимые статусы:

```txt
active
revoked
expired
```

Устройство можно хранить отдельной сущностью:

```txt
device
  id
  user_id
  type
  name
  fingerprint_hash
  last_ip
  last_user_agent
  last_seen_at
```

Fingerprint является обязательной частью binding сессии. Gateway считает fingerprint по своей стратегии и передает результат в `identity_srv`; `identity_srv` дополнительно хранит HMAC от fingerprint и проверяет связку `sessionSecret + fingerprint + gateway + clientType`.

Первичная миграция для перехода к этой модели зафиксирована как TypeORM migration:
`services/identity_srv/src/migrations/1718450000000-session-first-auth.ts`.

Правило миграции:

- старые сессии без `session_secret` отзываются;
- новые сессии получают `secret_hash`;
- `refresh_token` таблица на первом этапе не удаляется из БД, но больше не используется web/admin flow;
- удаление legacy token-таблиц должно быть отдельным решением после проверки потребителей.

## Credentials

Credential strategy отвечает только за доказательство личности. Она не выпускает session credential.

### Password

Цель:

- Argon2id;
- per-password salt внутри encoded hash;
- опциональный pepper только в `identity_srv`;
- gateway не знает password secret.

Целевые поля:

```txt
password_credential
  user_id
  password_hash
  password_algo
  password_updated_at
  status
```

`PASSWORD_SALT` как общий secret в нескольких сервисах не является целевой моделью.

### Phone OTP

OTP - challenge, а не пароль.

Целевые поля:

```txt
phone_credential
  user_id
  phone_e164
  verified_at
  status

otp_challenge
  id
  phone_e164
  code_hash
  status
  attempts
  expires_at
  resend_available_at
```

Обязательные правила:

- TTL;
- одноразовость;
- лимит попыток;
- resend cooldown;
- rate limit по phone/ip/device;
- audit events на отправку, ошибку и успех.

### External providers

Пока не реализуем, но учитываем как будущий credential provider.

Целевая модель:

```txt
external_identity
  user_id
  provider
  provider_subject
  email
  email_verified
  linked_at
```

Внешний provider только подтверждает identity. После callback система выпускает нашу `session`.

## Auth Flow

Auth flow оркестрирует сценарий входа.

Целевая модель:

```txt
auth_flow
  id
  method
  status
  user_id
  client_type
  gateway
  assurance_level
  created_at
  expires_at
```

Статусы:

```txt
started
challenge_required
verified
failed
expired
cancelled
```

Пример password flow:

```txt
auth.start(method=password)
credentials.password.verify
session.issue
```

Пример phone OTP flow:

```txt
auth.start(method=phone_otp)
challenge.otp.send
challenge.otp.verify
session.issue
```

Пример external provider flow:

```txt
auth.start(method=external_provider)
provider.redirect
provider.callback
external_identity.resolve
session.issue
```

## Gateway contracts

### Web endpoints в `admin_gw`

Целевые HTTP endpoints:

```txt
POST /v1/auth/password/sign-in
POST /v1/auth/otp/start
POST /v1/auth/otp/verify
GET  /v1/auth/profile
GET  /v1/auth/sessions
DELETE /v1/auth/sessions/:sessionId
POST /v1/auth/sign-out
POST /v1/auth/sign-out-all
```

`admin_gw` работает с cookie `admin.sid`.
Cookie является только транспортом session credential и ставится как session cookie без `Max-Age`/`Expires`.
Время жизни session credential контролирует только `identity_srv` через `SESSION_RENEW_REQUIRED_AFTER_MS` и `SESSION_EXPIRES_AFTER_MS`.
Для web-клиента отдельный публичный renew endpoint не нужен: защищенный endpoint проходит через session guard, guard получает `renew_required`, вызывает `identity.session.renew`, ставит новый `Set-Cookie` и продолжает исходный запрос.
Gateway обязан уметь воспроизвести fingerprint для каждого auth/session запроса. Набор входных параметров fingerprint является ответственностью конкретного gateway.

### Mobile endpoints в будущем `mobile_gw`

```txt
POST /v1/mobile/auth/password/sign-in
POST /v1/mobile/auth/otp/start
POST /v1/mobile/auth/otp/verify
GET  /v1/mobile/auth/profile
GET  /v1/mobile/auth/sessions
POST /v1/mobile/auth/session/renew
DELETE /v1/mobile/auth/sessions/:sessionId
POST /v1/mobile/auth/sign-out
POST /v1/mobile/auth/sign-out-all
```

`mobile_gw` работает с `Authorization: Bearer <session_secret>`.

## Audit и security policy

Минимальный набор событий:

```txt
auth.password.success
auth.password.failed
auth.otp.sent
auth.otp.failed
auth.otp.verified
session.issued
session.verified
session.renewed
session.revoked
session.expired
```

Security policy:

- login throttling;
- lockout после серии ошибок;
- OTP attempts limit;
- OTP resend cooldown;
- session renew window;
- session expiration window;
- session secret rotation;
- revoke on suspected reuse;
- запрет логирования raw credentials, session secret, OTP, password, cookie.

## Access control

Права доступа проектируются отдельно.

В этом документе фиксируется только граница:

- session отвечает за факт авторизованного клиента;
- access-control отвечает за разрешение действия;
- роли и права не хранятся в session credential;
- gateway может использовать verified session context как вход для будущего access check.

Будущий контракт может выглядеть так:

```txt
identity.access.check(subject, action, resource, scope)
```

Но схема ролей, permissions и scopes не входит в текущий этап.

## Этапы разработки

### Этап 0. Зафиксировать стратегию

Цель:

- принять session-first подход;
- отказаться от access/refresh token flow как основы;
- зафиксировать web/mobile gateway boundaries;
- зафиксировать, что social providers являются credential strategies, а не отдельной auth-системой.

Готово, когда:

- этот документ принят как целевой;
- старый token-first дизайн не используется для новых задач.

### Этап 1. Подготовить session model

Работы:

- добавить поля `secret_hash`, `fingerprint_hash`, `client_type`, `gateway`, `status`, `renew_required_at`, `expires_at`, `revoked_at`, `revoke_reason`;
- отделить `session.id` от session credential;
- добавить генерацию opaque session secret;
- хранить только hash/HMAC от secret;
- убрать зависимость web-auth от access/refresh token сущностей.
- подготовить и выполнить TypeORM migration `SessionFirstAuth1718450000000`.

Готово, когда:

- `identity.session.issue` создает сессию с raw secret в ответе и hash в БД;
- raw secret не логируется и не хранится в БД;
- старый `sessionUuid + accessToken + refreshToken` контракт не используется web flow.
- старые сессии после миграции отозваны и не проходят `session.verify`.

### Этап 2. Перевести `admin_gw` на cookie session

Работы:

- заменить JSON cookie на `admin.sid=<session_secret>`;
- заменить `JwtAuthGuard` на session guard;
- guard вызывает `identity.session.verify`;
- sign-out вызывает `identity.session.revoke` и чистит cookie;
- убрать auth secrets из `admin_gw` env.

Готово, когда:

- web sign-in ставит только `admin.sid`;
- profile работает через `session.verify`;
- logout отзывает session;
- повторный запрос с отозванной cookie получает `401`.

### Этап 3. Реализовать `session.renew`

Работы:

- добавить `renew_required_at` и `expires_at`;
- добавить renew command;
- добавить обязательную rotation session secret при renew;
- не хранить историю старых sid на первом этапе: старый sid после ротации получает `401`.

Готово, когда:

- активная сессия продлевается без повторного логина;
- истекшая absolute session не продлевается;
- отозванная сессия не продлевается;
- reuse старого rotated secret приводит к отказу и audit event.

### Этап 4. Привести password credential к целевой модели

Работы:

- добавить password credential слой;
- перейти на Argon2id;
- убрать `PASSWORD_SALT` как общий salt;
- оставить pepper только в `identity_srv`, если он нужен;
- сделать creation/seed path для первого администратора.

Готово, когда:

- password verification выполняется только в `identity_srv`;
- gateway не содержит password secret;
- новые пароли сохраняются в целевом формате;
- live sign-in работает на новом credential format.

### Этап 5. Добавить управление сессиями

Работы:

- `session.list`;
- revoke конкретной сессии;
- revoke всех сессий пользователя;
- определить поведение `revokeAll` относительно текущей сессии.

Готово, когда:

- пользователь видит свои активные сессии;
- может завершить текущую сессию;
- может завершить другую сессию;
- может завершить все сессии.

### Этап 6. Добавить phone OTP

Работы:

- phone credential;
- OTP challenge;
- provider abstraction для отправки;
- TTL, attempts, resend cooldown, rate limit;
- после успешного OTP вызывается тот же `session.issue`.

Готово, когда:

- phone OTP создает такую же session, как password flow;
- OTP нельзя переиспользовать;
- неверный OTP ограничен по попыткам;
- audit events пишутся.

### Этап 7. Mobile Gateway Foundation

Цель:

- подготовить mobile adapter без привязки к старым `client/mobile` веткам;
- использовать тот же session core, что и web;
- не вводить отдельную mobile auth-систему.

Работы:

- спроектировать `mobile_gw` adapter;
- принимать `Authorization: Bearer <session_secret>`;
- использовать `identity.session.verify`;
- использовать `identity.session.renew`;
- передавать device context в `identity_srv`;
- зафиксировать хранение session credential в защищенном хранилище мобильной платформы;
- не добавлять access/refresh token flow в core.

Готово, когда:

- mobile flow использует ту же session model;
- `mobile_gw` не содержит credential/session бизнес-логики;
- revoke/renew/list работают одинаково для web и mobile;
- старые mobile ветки не участвуют в реализации.

### Этап 8. Подготовить future external providers

Работы:

- добавить интерфейс external provider strategy;
- добавить модель `external_identity`;
- описать callback flow;
- не реализовывать конкретного provider без отдельного решения.

Готово, когда:

- future social/email provider можно добавить без изменения session layer;
- provider flow приводит к `session.issue`.

## Проверочные сценарии

Минимальный live сценарий для web:

```txt
password sign-in
-> Set-Cookie admin.sid
-> profile проходит через session.verify
-> при наступлении renew_required_at profile получает renew_required внутри guard
-> guard вызывает session.renew, получает новый session secret и ставит новый Set-Cookie
-> sessions list показывает текущую session
-> sign-out отзывает session
-> profile с той же cookie возвращает 401
```

Негативные сценарии:

```txt
неверный пароль -> отказ, session не создается
заблокированный user -> отказ, session не создается
отозванная session -> verify возвращает invalid/revoked
наступил renew_required_at -> verify возвращает renew_required, guard вызывает renew
истекшая expires_at session -> renew/verify отказывает
старый sid после renew -> 401
```

## Внешние ориентиры

При спорных решениях сверяемся с:

- OWASP Session Management Cheat Sheet;
- OWASP Authentication Cheat Sheet;
- OWASP Password Storage Cheat Sheet;
- OWASP Authorization Cheat Sheet;
- NIST SP 800-63B;
- RFC 8252 для будущих native/mobile external provider flows;
- OAuth 2.0 Security Best Current Practice только для будущих token/delegated сценариев, не как база текущей session-first системы.

## Текущее решение в одной строке

Строим универсальную server-side session platform: разные способы входа и разные gateway только доставляют или создают session credential, а вся проверка, продление, отзыв и управление сессиями централизованы в `identity_srv`.
