# План развития

## Закрытые задания пользователя

**TASK-001 — Инициализация + Дизайн-система: ЗАКРЫТ.** Критерии и фактические проверки: [TASK-001.md](TASK-001.md).

**TASK-002 — Prisma схема (все модули сразу): ЗАКРЫТ.** Все модели и enums, составные tenant FK, миграция на PostgreSQL и документация связей: [TASK-002.md](TASK-002.md), [modules/database.md](modules/database.md).

**TASK-003 — Shared типы + utils + error handling: ЗАКРЫТ.** Общие контракты, Result helpers, форматтеры, генерация ID и Prisma singleton: [TASK-003.md](TASK-003.md), [architecture.md](architecture.md).

**TASK-004 — Auth + RBAC (NextAuth v5): ЗАКРЫТ.** Credentials/JWT, live Membership, пять ролей, серверные проверки и usePermissions: [TASK-004.md](TASK-004.md).

**TASK-005 — Layout Shell (Sidebar + Header): ЗАКРЫТ.** Группы меню, collapse, Header/theme, active indicator и route fade: [TASK-005.md](TASK-005.md).

**CHECKPOINT-01 — Foundation TASK-001–005: ПРОЙДЕН.** Сборка без ошибок, запуск/login/dashboard, темы, поведение Sidebar и отсутствие hex-совпадений: [CHECKPOINT-01.md](CHECKPOINT-01.md). Полная проверка БД/бизнес-операций ниже — отдельный будущий этап.

Другие задания пользователя пока не закрывались. Нумерация остальных пунктов ниже — предварительная очередь развития ранее созданного каркаса, а не подтверждённое завершение будущих пользовательских задач.

## Текущий этап — запускаемый ERP Template

- TASK-001: строгий Next.js-каркас, tokens, Geist, общие primitives, layout и документация.
- TASK-002: нормализованная Prisma схема всех модулей, AUTH, workspace, миграция и совместимость с прежним DocType-слоем. DocType, Result, tenant-scoped repository, audit и версии присутствуют в исходном каркасе; текущий UI пока использует этот слой.
- TASK-003: shared Result/PaginatedResponse/SortConfig/FilterConfig, errors, utils и серверный Prisma singleton. Таблицы, формы, фильтры, поиск, CSV и состояния уже присутствуют в исходном каркасе; серверная пагинация остаётся будущей задачей.
- TASK-004: NextAuth v5 Credentials/JWT, права SUPER_ADMIN/ADMIN/MANAGER/AGENT/READONLY и usePermissions. Kanban CRM/проектов, статусы и доступный выбор этапа присутствуют в исходном каркасе.
- TASK-005: общий Sidebar/Header, четыре группы меню, collapse/slide indicator/route fade, синхронизация тем. Счета и поступления, ограничения сумм и аудит присутствуют в исходном каркасе.
- TASK-006: dashboard, аналитика по периоду, темы, мобильное меню и вход.

Реализованы исходники, миграция и bootstrap; фактические результаты проверок фиксируются в `verification.md`.

## CHECKPOINT-DB — PostgreSQL и границы доступа (будущий)

Только в этой явно назначенной задаче создавать автоматические тесты. До внешнего production-развёртывания проверить:

1. Миграция с нуля, повторный deploy и seed без изменения существующего аккаунта.
2. Два workspace, пять ролей, чтение и мутации чужих идентификаторов, отзыв Membership.
3. Неверный пароль, cookie flags, истёкшая/отозванная сессия, отсутствие демофолбэка.
4. Частичная и полная оплата, переплата, повтор reference, два параллельных платежа и rollback аудита.
5. Stale version при изменении, удалении и платеже; защита оплаченных счетов.
6. Некорректный JSON, неверные даты, дробные/отрицательные копейки, безопасный CSV.
7. Мобильная навигация, keyboard/focus, reduced motion, две темы, empty/error states.

## Следующие задачи

- TASK-007: управление участниками, безопасный workspace switch, отдельные права на HR/зарплату.
- TASK-008: rate limiting и блокировки входа, восстановление пароля, управление сессиями.
- TASK-009: серверная пагинация/поиск, SQL dashboard aggregation, ограничения объёмов.
- TASK-010: строки счёта, налоги, Payment allocations, возвраты и бухгалтерский ledger.
- TASK-011: склады, movements/reservations и транзакционные остатки.
- TASK-012: кадровые документы, отпуска и payroll по требованиям бизнеса.
- TASK-013: event outbox, workflow engine, пользовательские DocType.
- CHECKPOINT-002: доменные интеграционные проверки, нагрузка и восстановление из backup.
