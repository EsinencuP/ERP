# TASK-004 — Auth + RBAC (NextAuth v5)

Статус: **ЗАКРЫТ**. Дата: 18 октября 2026, Europe/Moscow.

## Выполнено

`src/lib/auth.ts` настраивает установленный next-auth 5.0.0-beta.32 с Credentials provider и JWT strategy. JWT callback добавляет id/role и серверный workspace; Session callback передаёт id/role клиенту. Credentials используют Zod и существующие scrypt passwordHash. Фасады createSession/deleteSession сохраняют Result-контракт и перехватывают исключения Auth.js.

Внутренний случайный sessionId находится в защищённом JWT и связан с таблицей Session. При каждом чтении проверяются registry, фиксированный срок 12 часов, активность пользователя/членства и текущая Membership.role. Клиентская session не содержит sessionId/hash/JWT. Logout отзывает registry до очистки cookie; стандартное событие Auth.js signOut также удаляет запись. Смена User.role не обходит членство.

Добавлены `/api/auth/[...nextauth]`, module augmentation, AuthSessionProvider и `src/hooks/usePermissions.ts`: useSession → role, can(permission), isAdmin, isLoading. Loading/unauthenticated/authError не дают прав. Provider обновляет сессию при фокусе и каждые 60 секунд; сервер проверяет её на каждом обращении независимо от состояния UI.

Client-safe PERMISSIONS/hasPermission находятся в permissions.ts и реэкспортируются из auth.ts. Клиент не импортирует серверный auth.ts. По умолчанию SUPER_ADMIN/ADMIN имеют четыре разрешения; MANAGER — удаление/экспорт/просмотр; AGENT и READONLY — просмотр. READONLY не создаёт/изменяет, AGENT не удаляет/экспортирует. Сохраняется дополнительный запрет удаления HR для MANAGER и оплаченных счетов для любой роли. Полная таблица — [architecture.md](architecture.md), раздел Tenant isolation и RBAC.

canViewAll означает все документы выбранного workspace: все пять ролей сохраняют существующее чтение внутри активного членства. SUPER_ADMIN не получает доступ к чужим tenants. canManageUsers подготовлен для будущих endpoints управления участниками; сами endpoints/экран этой задачей не добавлены. Значения матрицы выбраны явно как стартовая политика, поскольку TASK-004 перечислял права без их значений.

Серверные create/update/delete проверяют права. Экспорт модулей и dashboard проходит через новые getExportDocuments/getExportReport с повторной авторизацией, Zod-проверкой и чтением из серверного workspace. UI таблиц/kanban/создания/экспорта использует общие правила. Settings показывает актуальную матрицу пяти ролей.

## Миграция и конфигурация

`prisma/migrations/20261018072336_auth_rbac/migration.sql`: транзакционное переименование Role.VIEWER → READONLY на месте, добавление SUPER_ADMIN и AGENT. User/Membership/defaults сохранены. Prisma create-only в данной CLI-среде отказался от интерактивного изменения enum; вместо пересоздания типа подготовлен явный SQL rename и применён через migrate deploy. Проверочный прежний User/Membership со значением VIEWER после миграции получили READONLY с теми же идентификаторами.

Реальный вход требует AUTH_SECRET (совместимый NEXTAUTH_SECRET также поддерживается); `.env.example` содержит настройку AUTH_URL. Для внешнего production origin должен использовать HTTPS. Старые opaque erp_session cookie не принимаются, требуется повторный вход. Старые registry-строки не превращаются в JWT автоматически. Account/VerificationToken/PrismaAdapter не нужны Credentials/JWT strategy.

Существующий `.env` не менялся. Проверочный секрет генерировался случайно только в памяти процесса, без вывода/сохранения. Явный деморежим остаётся отдельным публичным ADMIN-пространством с согласованной client Session; не используется при отказе PostgreSQL.

## Проверки

- `npm run build` — успешная финальная production-сборка, включая auth route и Prisma Client.
- `npm run typecheck -- --noUnusedLocals --noUnusedParameters` — успешно.
- `npx prisma validate`, `npx prisma migrate status` — успешно, три миграции применены.
- Migrate diff datasource → schema — No difference detected.

Ручные HTTP/SQL проверки на реальной локальной PostgreSQL 17.10:

| Сценарий | Наблюдаемый результат |
| --- | --- |
| Credentials для всех пяти ролей | Session содержит правильные id, Membership.role, workspace; health 200/postgresql |
| Нет сессии, прежняя opaque cookie, неверный пароль | 401 / 401 / session не создана |
| AGENT с User.role=SUPER_ADMIN и ADMIN-членством в другом workspace | Текущая роль AGENT, выбран сервером первый workspace; повышения прав нет |
| Изменение Membership.role на существующем JWT | Следующая session содержит новую роль |
| Отключённое членство / пользователь | Health 403 / 401 |
| Истёкший registry | Health 401 |
| Update session с подменой role/id/workspace | Остаются прежние серверные AGENT/id/workspace |
| READONLY createDeal | Result FORBIDDEN |
| AGENT deleteDeal | Result FORBIDDEN |
| MANAGER deleteEmployee | Result FORBIDDEN |
| READONLY/AGENT getExportDocuments, READONLY getExportReport | Result FORBIDDEN |
| ADMIN export своего документа / dashboard | Успешный Result с данными |
| ADMIN delete/export чужого ID | Result NOT_FOUND; чужой документ не попадает в HTML |
| Logout и повторное использование прежней JWT cookie | Registry удалён, повторный health 401 |
| Остановлена PostgreSQL, JWT ранее действителен | Health 503 с STORAGE; демоданные не возвращены |

Server Actions возвращают свой Result в HTTP/RSC-ответе 200; отказ бизнес-операции подтверждён кодом Result, а не подменён утверждением об HTTP 403. Внутренний registry ID не присутствует в `/api/auth/session`.

Визуально и интерактивно проверены production-экраны:

- Неверный пароль показывает сообщение, корректный Credentials-вход открывает workspace, выход возвращает на login и удаляет session cookie.
- READONLY видит запись и «Просмотр», без кнопок создания/удаления/экспорта: [CRM](screenshots/task-004-readonly.png).
- ADMIN скачивает evo-crm.csv и видит пять строк матрицы: [настройки](screenshots/task-004-permissions.png).
- На финальной сборке READONLY → ADMIN без повторного входа и с useSession refresh показывает кнопки создания/экспорта, обратное изменение их скрывает.
- [Login 390×844](screenshots/task-004-login-mobile.png) не имеет горизонтального переполнения. Local HTTP cookie: HttpOnly=true, SameSite=Lax, Secure=false; проверка HTTPS через реальный reverse proxy остаётся CHECKPOINT.
- Явный demo на отдельном порту возвращает ADMIN/demo и сохраняет рабочие кнопки. На финальных навигациях консоль без ошибок/предупреждений. Во время остановки сервера для пересборки ранее открытая вкладка логировала ожидаемый connection refused при refetch; после запуска ошибки не повторялись.

Автоматические тестовые файлы не создавались. Удалены только собственные временные fixtures: 6 пользователей, 7 членств, 3 документа, 3 workspace и оставшиеся 7 сессий; временные cookie/файл cookie очищены. Новых package-зависимостей нет. Проверочные серверы 3001/3002 и portable PostgreSQL остановлены; миграции и кластер сохранены в прежних местах.

## Границы

canManageUsers не является готовым управлением участниками, canViewAll не реализует assigned-only или field-level доступ к HR. Право экспорта управляет функцией/endpoint и не запрещает ручное копирование разрешённых для чтения данных. Перевод UI на нормализованные доменные модели остаётся отдельным этапом.

Rate limiting, reset/MFA/invitations, UI управления сессиями/ролями/workspace, фоновые cleanup и полный автоматический CHECKPOINT ещё не реализованы. Эти проверки не являются заявлением о готовности к внешнему production.
