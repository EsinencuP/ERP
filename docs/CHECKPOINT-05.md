# CHECKPOINT-05 — финальная приёмка TASK-026—TASK-030

Дата: 20.10.2026. **Техническая приёмка: PASS.** Git commit/push/PR/merge/tag — завершающая стадия после проверок, подтверждаемая состоянием GitHub.

## Среда

Windows host, Node 24, Next.js 15.5.28 и Prisma 6.19.3. Реальный Docker Compose project erp-task027: postgres:16-alpine (PostgreSQL 16.15), app на 127.0.0.1:3002, БД на 127.0.0.1:5434. Использован сохранённый изолированный sample volume TASK-027; внешняя БД и локальная PostgreSQL 17 не затронуты. Docker Engine работает в Codex-Docker WSL, удерживаемом отдельным hidden helper на время проверки.

Изменения TASK-028—030 — документация и MIT LICENSE; src/prisma/Dockerfile/compose/package-lock не изменены. Проверенный Docker runtime соответствует исходникам приложения, для которых выполнен новый host build. Он не объявляется новым внешним deployment.

## Команды и статические проверки

| Требование | Результат / доказательство |
| --- | --- |
| npm run build | PASS, production compilation, lint/type validation, 31 UI pages и API routes |
| npx tsc --noEmit | PASS, exit 0 |
| npx prisma validate | PASS: schema valid |
| npx prisma db seed | PASS на изолированной БД 5434 через process DATABASE_URL override; existing sample no-op, edits/passwords preserved |
| docker compose up | PASS; `up -d --wait` с --env-file .data/task027-compose.env --project-name erp-task027; postgres/app healthy, migration exit 0 |
| console.log в production src | 0 совпадений |
| `: any` в src | 0 совпадений |
| `#[0-9a-fA-F]` в src/components | 0 совпадений |
| Inter в src | 0 совпадений |
| loading/error | 31/31 page.tsx имеют loading.tsx; error.tsx в root/auth/dashboard |
| Developer Guide | Все 15 разделов, 10 законов; локальные ссылки существуют |
| Код шаблона модуля | Prisma generation и strict tsc шести извлечённых TS examples: PASS; fixtures вне app source |
| git diff --check | PASS перед commit |

Prisma 6 предупреждает о будущем удалении package.json#prisma в Prisma 7; это существующее предупреждение, не ошибка. Major upgrade в release документации не выполнялся. Новый seed на чистой БД и rollback/idempotency отдельно проверены TASK-027; в этом checkpoint повторно проверен сохранённый образец.

## Полный поток и повторная проверка TASK-024

1. Вход admin@erp.dev / Admin123! через настоящий Credentials UI. Authenticated `/api/health` → HTTP 200, Result ok/status ready/mode postgresql.
2. Users table: Avatar, Name, Email, Role, Status, Last login, Actions. Собственная запись Protected.
3. Создание invitation email + AGENT, отзыв ссылки и повторное приглашение. Новый участник checkpoint05-member@example.invalid принял ссылку в отдельной browser context, вошёл и появился в таблице.
4. ADMIN изменил AGENT → READONLY. Старая сессия отозвана: health 401/UNAUTHORIZED. Новый вход прошёл с обновлённой ролью.
5. Deactivate → Inactive, отзыв новой сессии 401/UNAUTHORIZED; Reactivate → Active. Записи и audit сохранены.
6. AGENT не получил доступ к Users/Audit routes. READONLY отправил прямые Next-Action запросы getMembers/getAuditLog/updateMember/createInvitation: все четыре вернули FORBIDDEN. Отключение кнопок не являлось единственной защитой.
7. ADMIN Audit viewer показал ровно 100 последних событий, включая invitations/membership changes. Before/after доступны, проверенный snapshot не содержит password/secret/tokenHash/passwordHash.
8. Authenticated desktop smoke: `/`, CRM contacts, Finance invoices/dashboard, Inventory catalog/dashboard, HR/leaves, Projects/overview и Settings — HTTP 200, заполненные данные без page overflow.
9. Invoice PDF из Docker: HTTP 200, application/pdf, `%PDF-`, 10105 байт в RU. P&L CSV: HTTP 200, text/csv UTF-8 и русские заголовки/период.

## UI и доступность

- Theme toggle изменил light → dark и computed background; смена Settings language → ru сохранила русский после навигации.
- На 375 × 812 проверены Users, HR, Projects и Dashboard: scrollWidth=375, внешнего горизонтального переполнения нет. Широкие таблицы прокручиваются внутри контейнера.
- Mobile Sidebar открывается как Dialog/Sheet и закрывается Esc. Meta+K открывает настоящую cmdk palette; Meta+N на Users открывает Invite dialog. Esc закрывает palette/dialog.
- Для 190 видимых headings/controls/tables на Dashboard/Users/Inventory/HR/Projects проверено наличие собственной entrance animation или анимированного предка. Общие panel/route/primitives используют централизованные motion rules.
- prefers-reduced-motion=reduce дал animation-duration 0.00001s; после проверки эмуляция возвращена в обычный режим.
- Browser console: 0 errors / 0 warnings в проверенном потоке. Снимки mobile просмотрены визуально.

Снимки: [Users EN](screenshots/checkpoint05-members.png), [Users RU 375px](screenshots/checkpoint05-members-mobile-ru.png), [Audit](screenshots/checkpoint05-audit.png), [Cmd+K 375px](screenshots/checkpoint05-mobile-palette.png).

## Очистка и границы

Созданные только для checkpoint invitation/member/session/audit fixtures удалены из verification volume по точным email/workspace/ID guards. Образец после очистки: Contact 20, Deal 10, Invoice 5, Product 15, Warehouse 3, Employee 8, Project 3, Task 18, Payment 2, Expense 3, StockMovement 12, AuditLog 113. Подлинные данные sample и его seed marker сохранены; входы штатно обновляли last login/session registry.

Новые test-файлы в production source не добавлялись. Одноразовые проверки выполнялись в рамках явно назначенного CHECKPOINT-05. Пределы системы, включая auth beta, отсутствие rate limiting/field-level HR ACL/email transport и fixed Task dueDate +03:00, остаются в Developer Guide и архитектуре. Этот PASS не подтверждает доступность внешнего production-хостинга.
