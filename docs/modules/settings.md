# Settings — TASK-024

Preferences: `/settings`; ADMIN+: `/settings/users`, `/settings/audit`. Данные только PostgreSQL, явный demo сообщает CONFIGURATION.

## Server Actions

- `getMembers({search?,role?,status?,page?})`: 20 участников/страницу, Avatar/Name/Email/Role/Status/Last login, поиск literal Unicode case-fold.
- `getInvitations()`: 20 последних приглашений без секретов.
- `updateMember({userId,version,role,isActive})`: current workspace only; self/SUPER_ADMIN/last-admin guards; tenant sessions revoked.
- `createInvitation({email,role})`: 7 дней, token показывается один раз; активный дубликат запрещён, истёкший отзывается с аудитом.
- `deleteInvitation({id,version})`: отзыв PENDING, без удаления истории.
- `createInvitedMembership({token,name,password})`: public email-bound redemption; существующий аккаунт подтверждает пароль, новый — имя/12+ символов. Membership + accepted invitation + audit в одной транзакции.
- `getAuditLog()`: последние 100 событий текущего workspace, безопасные before/after; секретные ключи скрываются.

Все действия возвращают Result; version/serialization conflict требует refresh без автоматического повтора. Неопределённый ответ мутации блокирует повтор до обновления. EN/RU copy; пользовательские имена/email/title не переводятся. lastLoginAt — успешный вход в это пространство; неизвестная история не выдумывается.

Нет email transport, MFA, rate limiting, password recovery, отдельного session manager и полного workspace switch. TASK-025 добавляет DB App Configuration/Context/notification toggles.

Currency: единственная базовая EUR; пользователь подтвердил 1 EUR = 93 RUB. Подробности миграции/округления — architecture.md.


## TASK-025 — Application configuration

- `getAppConfiguration()`: authenticated tenant read; companyName, PNG logo, fixed EUR, IANA timezone, dateFormat, notification flags, version. Missing row — version 0 until first save, not a write on read. Errors never become defaults.
- `updateAppConfiguration({...fields,version})`: ADMIN+, strict DTO (no tenant/extra keys), PNG signature/dimension bounds, timezone Intl/PostgreSQL validation. Serializable create/update + Workspace.name + audit; stale version rejected.
- `ConfigurationProvider` hydrates the dashboard app; `useConfiguration` and `useAppFormat` consume live preferences. Public components have presentation defaults without accessing private tenant settings.
- `/settings` exposes a read-only view to other roles and explicit demo. Currency stays EUR. Notification toggles filter created/updated/deleted/payment events in the actual Header panel; audit unaffected.
- PDF branding/date format, shared client date renderers, finance report boundaries/MTD and CSV timezone use these settings. Calendar DATE values do not shift. Historical invoice issuer snapshot remains unchanged.
