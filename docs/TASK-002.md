# TASK-002 — Prisma схема (все модули сразу)

Статус: **ЗАКРЫТ**. Дата: 18 октября 2026, Europe/Moscow.

## Результат

В `prisma/schema.prisma` определены все 17 запрошенных моделей AUTH, CRM, FINANCE, INVENTORY, HR и PROJECTS, все 13 enums. С Workspace, Membership и совместимыми Document/DocumentPayment схема содержит 21 модель. Описание полей, связей, единиц измерения, удаления и границ ответственности: [modules/database.md](modules/database.md). Обновлены `architecture.md`, инструкции и документы модулей.

У доменных записей есть workspace, версия и timestamps. Составные FK запрещают ссылки на другой workspace; ответственные ссылаются на Membership. Employee имеет self-relation руководителя, Task — родителя в том же проекте. Денежные Decimal(20,0) хранят целые копейки по правилам проекта; количества используют Decimal(20,3). Добавлены индексы, уникальность внутри tenant и 43 SQL CHECK для значений, арифметики, дат и версий.

Миграция `prisma/migrations/20261018065839_init_all_modules/migration.sql` транзакционная. Исходная миграция сохранена. Старые таблицы/колонки не удаляются: UserRole отображается на SQL enum Role, AuditLog — на AuditEvent, DocumentPayment — на прежнюю Payment. Новая нормализованная Payment хранится в invoice_payments. Репозиторий использует новые Prisma delegates, сохраняет совместимость и записывает структурированные ссылки аудита. Авторизация проверяет isActive пользователя и участника; права workspace определяет Membership.role.

## Фактическая проверка

| Проверка | Результат |
| --- | --- |
| `npx prisma format`, `npx prisma validate` | Успешно |
| `npx prisma generate` | Prisma Client 6.19.3 сгенерирован |
| `npx prisma migrate dev --name init_all_modules` | Миграция применена к реальной PostgreSQL 17.10 |
| `npx prisma migrate status` | Обе миграции применены, база актуальна |
| Повторный migrate dev с `--skip-generate` | Already in sync, новых миграций нет |
| Migrate diff datasource → schema с `--exit-code` | No difference detected |
| `npm run typecheck -- --noUnusedLocals --noUnusedParameters` | Успешно |
| `npm run build` | Успешная production-сборка |
| HTTP `/api/health`, действующая PostgreSQL-сессия | 200, status ready, mode postgresql |
| User.isActive=false / Membership.isActive=false / без сессии | 401 / 403 / 401 |
| `/finance` после миграции | Старый счёт 250 ₽, оплаты 100 ₽, остаток 150 ₽ |
| Консоль браузера | 0 ошибок, 0 предупреждений |

Для проверки сохранности в исходной схеме созданы собственные временные User, Membership, Session, Document, Payment и AuditEvent. После миграции через новый Prisma Client подтверждены документ, сумма старого платежа, история аудита, роль ADMIN и связь сессии. Автоматического переноса старых оплат в invoice_payments нет. После проверки удалены только эти временные записи и cookie.

Одноразовая SQL-транзакция с последующим rollback проверила все модули. Decimal сохранил `9007199254740993` без потери точности, остаток — `3.125`. Получены ожидаемые SQLSTATE: 23503 для чужих Contact/Warehouse/manager, ответственного без Membership, родителя задачи из другого проекта и удаления оплаченного Invoice; 23505 для повторного SKU внутри tenant; 23514 для неверного итога Invoice, отрицательных Payment/StockItem, неверного баланса StockMovement, самоназначения руководителем и обратных дат Leave. Одинаковый SKU в разных workspace разрешён. Данные этой транзакции не сохранены.

Визуальный осмотр production-экрана 1440×1000 выполнен через Playwright с выключенным деморежимом: [финансы на PostgreSQL](screenshots/task-002-postgresql-finance.png). На скриншоте только собственные временные записи. Тестовые файлы не создавались; автоматический набор относится к CHECKPOINT.

## Локальная среда и границы

Из-за отсутствия Docker и установленной PostgreSQL использован изолированный portable PostgreSQL 17.10: бинарники и постоянный кластер находятся в игнорируемой `.data/task-002-postgres-*`. Приложение подключалось к нему через существующий локальный DATABASE_URL, только 127.0.0.1:5433. Системная служба не устанавливалась; зависимости приложения и `.env` не менялись. Временный production-сервер 3001 и PostgreSQL после проверки остановлены. Для повторного локального запуска сохранён helper `node --env-file=.env .data/task-002-postgres-server.mjs`; поддерживаемый проектом вариант — PostgreSQL через docker-compose и сохранённые миграции.

Текущий UI продолжает использовать Document/DocumentPayment. Новые доменные таблицы готовы для последующих сервисов; JSON-документы не превращаются автоматически в Contact/Invoice/Product. Межстрочные суммы, запрет переплаты, парность складских переводов, длинные циклы и переходы статусов требуют транзакционных сервисов. SQL FK не заменяют авторизацию чтения. Эти ограничения подробно перечислены в database.md.

CHECKPOINT остаётся нужен для полного bootstrap/login, матрицы ролей и tenant-доступа через API, конкурентных операций, rollback аудита и восстановления. Локальные проверки TASK-002 подтверждают схему, миграцию и совместимость, а не готовность всех бизнес-процессов к production.
