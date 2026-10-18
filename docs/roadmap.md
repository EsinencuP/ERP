# План развития

## Закрытые задания пользователя

**TASK-001 — Инициализация + Дизайн-система: ЗАКРЫТ.** Критерии и фактические проверки: [TASK-001.md](TASK-001.md).

**TASK-002 — Prisma схема (все модули сразу): ЗАКРЫТ.** Все модели и enums, составные tenant FK, миграция на PostgreSQL и документация связей: [TASK-002.md](TASK-002.md), [modules/database.md](modules/database.md).

**TASK-003 — Shared типы + utils + error handling: ЗАКРЫТ.** Общие контракты, Result helpers, форматтеры, генерация ID и Prisma singleton: [TASK-003.md](TASK-003.md), [architecture.md](architecture.md).

**TASK-004 — Auth + RBAC (NextAuth v5): ЗАКРЫТ.** Credentials/JWT, live Membership, пять ролей, серверные проверки и usePermissions: [TASK-004.md](TASK-004.md).

**TASK-005 — Layout Shell (Sidebar + Header): ЗАКРЫТ.** Группы меню, collapse, Header/theme, active indicator и route fade: [TASK-005.md](TASK-005.md).

**CHECKPOINT-01 — Foundation TASK-001–005: ПРОЙДЕН.** Сборка без ошибок, запуск/login/dashboard, темы, поведение Sidebar и отсутствие hex-совпадений: [CHECKPOINT-01.md](CHECKPOINT-01.md). Полная проверка БД/бизнес-операций ниже — отдельный будущий этап.

**TASK-006 — CRM Server Actions + queries: ЗАКРЫТ.** Нормализованные Contact/Deal/Activity, Zod DTO, пагинация/фильтры, Kanban queries, серверный RBAC, атомарный аудит и версии: [TASK-006.md](TASK-006.md), [modules/crm.md](modules/crm.md).

**TASK-007 — CRM Contacts Table (TanStack Table): ЗАКРЫТ.** Server Component initialData, нормализованные контакты, серверные поиск/фильтры/сортировка, выбор между страницами, атомарные bulk и MANAGER+ CSV: [TASK-007.md](TASK-007.md).

**TASK-008 — CRM Deal Pipeline (Kanban DnD): ЗАКРЫТ.** `/crm/pipeline`, шесть SortableContext, карточки с owner/activity/probability, optimistic move через updateDealStage, rollback и восстановление после сети: [TASK-008.md](TASK-008.md).

**TASK-009 — CRM Contact Detail + Activity Feed: ЗАКРЫТ.** `/crm/contacts/[id]`, header/actions, пять типов активности, фильтр и пагинация timeline, Contact Info/Deals, сохраняемые tags, версии и аудит: [TASK-009.md](TASK-009.md).

**TASK-010 — CRM Forms: ЗАКРЫТ.** Общая non-modal ContactFormSheet для create/edit, RHF/Zod onBlur, Cmd/Ctrl+Enter, Esc, Sonner, обработка конфликтов и сети: [TASK-010.md](TASK-010.md).

**CHECKPOINT-02 — CRM TASK-006–010: ПРОЙДЕН.** Production build/typecheck, 9/9 интеграционных тестов и браузерные table/kanban/detail/forms/RBAC, обе темы и mobile: [CHECKPOINT-02.md](CHECKPOINT-02.md).

Другие задания пользователя пока не закрывались. Нумерация остальных пунктов ниже — предварительная очередь развития ранее созданного каркаса, а не подтверждённое завершение будущих пользовательских задач.

## Текущий этап — запускаемый ERP Template

- TASK-001: строгий Next.js-каркас, tokens, Geist, общие primitives, layout и документация.
- TASK-002: нормализованная Prisma схема всех модулей, AUTH, workspace, миграция и совместимость с прежним DocType-слоем. DocType, Result, tenant-scoped repository, audit и версии присутствуют в исходном каркасе; текущий UI пока использует этот слой.
- TASK-003: shared Result/PaginatedResponse/SortConfig/FilterConfig, errors, utils и серверный Prisma singleton. Таблицы, формы, фильтры, поиск, CSV и состояния уже присутствуют в исходном каркасе; серверная пагинация остаётся будущей задачей.
- TASK-004: NextAuth v5 Credentials/JWT, права SUPER_ADMIN/ADMIN/MANAGER/AGENT/READONLY и usePermissions. Kanban CRM/проектов, статусы и доступный выбор этапа присутствуют в исходном каркасе.
- TASK-005: общий Sidebar/Header, четыре группы меню, collapse/slide indicator/route fade, синхронизация тем. Счета и поступления, ограничения сумм и аудит присутствуют в исходном каркасе.
- TASK-006: нормализованный CRM Server API с пагинацией Contact/Deal и колонок Kanban, мутациями и транзакционным аудитом. Текущий Document UI сохранён через явно названные совместимые действия; его перевод на новый API выполняется отдельно. Dashboard/аналитика присутствуют в исходном каркасе.
- TASK-007: `/crm/contacts`, TanStack Table v8, начальная серверная страница, выбор id/version между страницами, bulk delete/reassign и полный фильтрованный экспорт.
- TASK-008: нормализованная воронка Deal на DnD Kit с шестью этапами, пагинацией каждой колонки, optimistic update и безопасным rollback.
- TASK-009: отдельная карточка контакта, добавление и история Activity, связанные сделки и редактируемые теги.
- TASK-010: общие create/edit Contact forms в неблокирующей Sheet с blur validation, shortcuts и toast.

Реализованы исходники, миграция и bootstrap; фактические результаты проверок фиксируются в `verification.md`.

## CHECKPOINT-DB — PostgreSQL и границы доступа (будущий)

Автоматические CRM-интеграции добавлены в CHECKPOINT-02. Полный набор БД/остальных доменов добавлять в отдельном CHECKPOINT. До внешнего production-развёртывания проверить:

1. Миграция с нуля, повторный deploy и seed без изменения существующего аккаунта.
2. Два workspace, пять ролей, чтение и мутации чужих идентификаторов, отзыв Membership.
3. Неверный пароль, cookie flags, истёкшая/отозванная сессия, отсутствие демофолбэка.
4. Частичная и полная оплата, переплата, повтор reference, два параллельных платежа и rollback аудита.
5. Stale version при изменении, удалении и платеже; защита оплаченных счетов.
6. Некорректный JSON, неверные даты, дробные/отрицательные копейки, безопасный CSV.
7. Мобильная навигация, keyboard/focus, reduced motion, две темы, empty/error states.

## Следующие задачи

- Без номера: управление участниками, безопасный workspace switch, отдельные права на HR/зарплату.
- Без номера: rate limiting и блокировки входа, восстановление пароля, управление сессиями.
- Без номера: перевод прежней таблицы сделок на нормализованную модель/пагинацию, серверная пагинация остальных модулей, SQL dashboard aggregation, ограничения объёмов.
- Без номера: строки счёта, налоги, Payment allocations, возвраты и бухгалтерский ledger.
- TASK-011: склады, movements/reservations и транзакционные остатки.
- TASK-012: кадровые документы, отпуска и payroll по требованиям бизнеса.
- TASK-013: event outbox, workflow engine, пользовательские DocType.
- CHECKPOINT-002: доменные интеграционные проверки, нагрузка и восстановление из backup.
