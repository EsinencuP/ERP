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

**TASK-011 — Finance Invoice CRUD + PDF: ЗАКРЫТ.** Нормализованные счета, inline строки, точные суммы/налог, INV-YYYY-NNNN, workflow/платежи, tenant/RBAC/version/audit и PDF с кириллицей: [TASK-011.md](TASK-011.md).

**TASK-012 — Finance Payments + Dashboard KPIs: ЗАКРЫТ.** Реестр/запись нормализованных платежей, четыре KPI, Line/Donut/HorizontalBar, AR aging, отдельные валюты и Promise.all: [TASK-012.md](TASK-012.md).

**TASK-013 — Finance Expenses: ЗАКРЫТ.** Expense/ExpenseCategory, точные суммы, CRUD на `/finance/expenses`, категории/поиск/валюта/пагинация, ссылка на чек и tenant/RBAC/version/audit: [TASK-013.md](TASK-013.md).

**TASK-014 — Finance P&L Reports: ЗАКРЫТ.** `/finance/reports`, Revenue по полной оплате − Expenses = Net Profit, календарные периоды/Custom, отдельные валюты и защищённый CSV API: [TASK-014.md](TASK-014.md).

**TASK-015 — Inventory Products + Stock Levels: ЗАКРЫТ.** Нормализованный каталог, категории, точные multi-warehouse totals/MinStock/status, CRUD и low/zero stock sidebar badge: [TASK-015.md](TASK-015.md).

**TASK-016 — Inventory Stock Movements + Warehouses: ЗАКРЫТ.** Warehouse CRUD, IN/OUT/ADJUSTMENT/TRANSFER, атомарные versioned balances, immutable ledger и timeline товара: [TASK-016.md](TASK-016.md).

**TASK-017 — Inventory Dashboard + Low Stock Alerts: ЗАКРЫТ.** Четыре KPI, точная стоимость по валютам, таблица пополнения и Reorder suggested: [TASK-017.md](TASK-017.md).

**CHECKPOINT-03 — Finance + Inventory TASK-011–TASK-017: ПРОЙДЕН.** Production build/tsc, 9/9 интеграций, Invoice/PDF/KPI/P&L/stock/immutable ledger и браузер: [CHECKPOINT-03.md](CHECKPOINT-03.md).

**TASK-018 — HR Employee Directory + Org Chart: ЗАКРЫТ.** Нормализованный каталог Grid/List, поиск/фильтры/профили и рекурсивная manager hierarchy с защитой циклов: [TASK-018.md](TASK-018.md).

**TASK-019 — HR Leave Management: ЗАКРЫТ.** PENDING → APPROVED/REJECTED, date-fns weekday count, manager pending sidebar badge, tenant/RBAC/version/audit: [TASK-019.md](TASK-019.md).

**TASK-020 — HR Employee Profile Page: ЗАКРЫТ.** Header/Personal/Contact/Docs, Reporting to, ручной годовой лимит и календарный leave balance: [TASK-020.md](TASK-020.md).

**TASK-021 — Projects Task Kanban + List: ЗАКРЫТ.** Четыре колонки, общий CRM DnD-hook, TanStack List, приоритет/исполнитель/срок и versioned task CRUD: [TASK-021.md](TASK-021.md).

**TASK-022 — Projects Overview: ЗАКРЫТ.** DONE/total progress, точный бюджет по связанным Expense, команда и CSS Grid timeline: [TASK-022.md](TASK-022.md).

**TASK-023 — Main Dashboard KPIs + Charts + Activity: ЗАКРЫТ.** Четыре межмодульных KPI, два графика, пять счетов, audit feed и low-stock banner; server Promise.all/no-store: [TASK-023.md](TASK-023.md).

Актуальный статус TASK-024—030 и CHECKPOINT-04/05 приведён в разделе «Новая очередь пользователя — текущий статус» ниже. Промежуточные пункты следующего раздела сохраняют историю исходного каркаса и его дальнейшего развития.

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
- TASK-011: Invoice CRUD на `/finance`, строки/налоги, нумерация, платежи, workflow и защищённый PDF; прежний реестр сохранён в `/finance/documents`.
- TASK-012: `/finance/payments`, нормализованные финансовые KPI/графики/aging на dashboard, точный CSV и параллельные запросы.
- TASK-013: `/finance/expenses`, нормализованные расходы с категориями, формой/карточкой и серверной таблицей; receipt как HTTP(S)-ссылка.
- TASK-014: `/finance/reports`, точный paid-invoice P&L, периоды по Москве, категории расходов и `/api/reports/export?type=pnl&from=...&to=...`.
- TASK-015: `/inventory`, Product/category, точные остатки по всем складам, per-product thresholds/status и sidebar alerts.
- TASK-016: `/inventory/warehouses`, `/inventory/[id]`, неизменяемые движения, атомарные переносы и журнал по товару.
- TASK-017: `/inventory/dashboard`, глобальные active-product KPI, стоимость по валютам и low/zero-stock список пополнения.
- TASK-018: `/hr` Grid/List Employee directory и профиль, `/hr/org-chart` recursive manager tree; legacy HR сохранён в `/hr/documents`.
- TASK-019: `/hr/leaves`, заявки/рабочие дни/решения менеджера и глобальный pending badge.
- TASK-020: `/hr/[id]`, профиль/контакты/ссылки на документы, ручной годовой лимит и Reporting to.
- TASK-021: `/projects`, нормализованные task Kanban/List и shared CRM DnD; прежний реестр в `/projects/documents`.
- TASK-022: `/projects/overview`, progress/budget/team, настройки проекта и календарный timeline на CSS Grid; расходы с tenant-safe projectId.
- TASK-023: `/`, нормализованная сводка Finance/CRM/Inventory/HR, графики/счета/действия; расширенный Finance обзор в `/finance/dashboard`.

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

**Визуальная экосистема портфолио — 29.10.2026: выполнено.** Светлая молочно-зелёная и тёмная зелёно-графитовая темы приведены к предоставленным референсам Workspace. Общие токены, радиусы, Button/Card и заголовки обновлены, Geist сохранён. Готовое задание для повторного переноса: [VISUAL_ECOSYSTEM.md](VISUAL_ECOSYSTEM.md). Production build, TypeScript, реальные PostgreSQL UI/PDF, обе темы и 375px проверены; результаты — [verification.md](verification.md). Проверки выполнены локально; состояние внешнего deployment подтверждается отдельно.

- Без номера: безопасный workspace switch, отдельные права на HR/зарплату.
- Без номера: rate limiting и блокировки входа, восстановление пароля, управление сессиями.
- Без номера: перевод прежней таблицы сделок на нормализованную модель/пагинацию, серверная пагинация остальных модулей, SQL aggregation остальных operational-модулей, ограничения объёмов.
- Без номера: Payment allocations, налоговый учёт, возвраты и бухгалтерский ledger.
- Без номера: резервы, партии и оценка запасов; склады/движения и транзакционные остатки реализованы TASK-016.
- Без номера: кадровые файлы/доступ, начисления/перенос остатков/праздники и payroll по требованиям бизнеса (предварительный номер TASK-012 заменён пользовательской задачей Finance Payments).
- Без номера: event outbox, workflow engine, пользовательские DocType (предварительный номер TASK-013 заменён пользовательской задачей Finance Expenses).
- CHECKPOINT-002: доменные интеграционные проверки, нагрузка и восстановление из backup.


## Новая очередь пользователя — текущий статус

- TASK-024: **реализовано** — `/settings/users`, `/settings/audit`, email/role invitation links, роли ADMIN+, деактивация/восстановление, last login, последние 100 tenant audit событий. Отчёт: [TASK-024.md](TASK-024.md).
- TASK-025: **реализовано** — tenant Settings singleton, компания/PNG logo/EUR/timezone/date format, глобальный Context, работающие notification toggles. [Отчёт](TASK-025.md).
- CHECKPOINT-04: **пройден** — TASK-018—025, production build/tsc, HR/leave/Projects/Dashboard/Settings/RBAC/audit, 9/9 проверок нового checkpoint; регрессии CRM и Finance/Inventory также 9/9 каждая. [Отчёт](CHECKPOINT-04.md).
- TASK-026: **реализовано** — loading всех UI-страниц, error границы, empty states, mobile Sheet, cmdk/Cmd+K, контекстный Cmd+N, entrance/reduced motion. Build/tsc и браузерная проверка на PostgreSQL: PASS. [Отчёт](TASK-026.md).
- TASK-027: **реализовано** — Faker sample seed, безопасный bootstrap/no-op rerun, Docker app + PostgreSQL 16 + migration/seed jobs; build/tsc/validate, Docker up, вход и PDF проверены. [Отчёт](TASK-027.md).
- TASK-028: **реализовано** — финальная [architecture.md](architecture.md): ADR-001—010, проверенные зависимости модулей, матрицы RBAC, доменные инварианты и процедура нового модуля. Документация сверена с исходниками; build/tsc и проверки ссылок прошли. Релиз и CHECKPOINT-05 — отдельный этап.
- TASK-029: **реализовано** — [contradictions.md](contradictions.md): записи CONTRA-001—009 в требуемом формате, источники решений и процедура регистрации/разрешения новых конфликтов. Открытых подтверждённых конфликтов не выявлено.
- TASK-030: **реализовано** — полный [Developer Guide](../INSTRUCTIONS.md), MIT LICENSE, README и согласованная документация; код шаблона нового модуля проверен отдельно. [Отчёт](TASK-030.md).
- CHECKPOINT-05: **техническая приёмка пройдена** — build/tsc/Prisma/seed/Docker, TASK-024 RBAC, PDF/CSV, EN/RU/themes/mobile/commands/animations. [Доказательства](CHECKPOINT-05.md). Git-публикация dev → main и v1.0.0 выполняется после этих проверок; её результат подтверждается GitHub.

**Локализация EN/RU:** английский по умолчанию, русский через Settings, общие каталоги/форматтеры, ошибки, PDF и CSV. Отчёт: [LOCALIZATION.md](LOCALIZATION.md).

## Уточнение после TASK-030 — пользовательское руководство и public sample

**Выполнено.** INSTRUCTIONS.md теперь инструкция по использованию ERP; технические правила сохранены отдельно в DEVELOPER_GUIDE.md. Руководство опубликовано на /user-guide.html. На Vercel добавлены пять участников к sample admin, история доступа, сделки разных стадий, активности и заполненная таблица CRM. Существующие записи сохраняются; повторный seed — no-op. Проверены local upgrade/fresh/rollback и опубликованные Users/Audit/CRM/прочие модули. [Отчёт](USER_GUIDE_PUBLIC_SAMPLE.md).
