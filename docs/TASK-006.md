# TASK-006 — CRM Server Actions + queries

Статус: **ЗАКРЫТ**. Дата: 18 октября 2026.

## Реализация

- CreateContactDTO/UpdateContactDTO/CreateDealDTO/CreateActivityDTO, ContactFilters/DealFilters, сериализуемые Contact/Deal/Activity и DealsByStage.
- Строгие contactSchema/dealSchema/activitySchema и схемы фильтров. Идентификаторы workspace, серверные timestamps и version не принимаются внутри create/update DTO.
- getContacts/getDeals: Result<PaginatedResponse<T>>, pageSize до 100, сортировка по разрешённым полям, поиск и предметные фильтры. Согласованные count/данные через RepeatableRead.
- getDealsByStage: шесть колонок с отдельными total/page/pageSize/totalPages; выборка каждой ограничена pageSize.
- createContact/updateContact/deleteContact/createDeal/updateDealStage/createActivity: Auth.js через getSession, текущая Membership и RBAC, tenant-scoped ссылки, Serializable-транзакция с auditLog.create и JSON before/after. Обновления проверяют/увеличивают version; удаление проверяет version и Restrict.
- Decimal(20,0) передаётся строкой копеек без потери точности; даты сериализуются в ISO, DATE — YYYY-MM-DD. WON/LOST управляют closedAt.
- Успешные Server Actions инвалидируют `/crm` и `/`. Сбой invalidation не выдаётся за откат уже сохранённой транзакции.
- Текущий CRM Document UI использует явно названные getDealDocuments/createDealDocument/updateDealDocument/deleteDealDocument. Контракт нормализованного createDeal не перегружается старым payload.
- Обновлены architecture, roadmap, modules/crm, modules/database, references и verification. Новые зависимости и миграции не требуются.

## Проверки

`npm run typecheck` — 0 ошибок. `npm run build` — успешная production-сборка Next.js 15.5.28 и генерация Prisma Client 6.19.3. `git diff --check` — без ошибок. В новом CRM коде нет explicit any/throw; тестовые файлы вне CHECKPOINT не создавались.

Ручные HTTP Server Action запросы к production-сборке на 127.0.0.1:3001 с реальными Credentials/JWT и PostgreSQL 17.10:

| Сценарий | Результат |
| --- | --- |
| ADMIN/READONLY/AGENT и ADMIN другого workspace | Реальный вход выполнен; роли проверены на сервере |
| Anonymous; READONLY create; AGENT delete | UNAUTHORIZED; FORBIDDEN; FORBIDDEN |
| Смена Membership ADMIN → READONLY после входа | Следующая мутация запрещена без повторного входа |
| Создание/partial update/delete контакта | Defaults, нормализация, очищаемые nullable поля и версии работают |
| Контакт/owner/deal/activity другого workspace | Чужие записи скрыты, назначение чужого owner отклонено |
| Пагинация/сортировка/поиск/фильтры | Верные total/totalPages, ограниченный размер, tenant isolation |
| Завышенный pageSize/неизвестное поле сортировки | VALIDATION |
| Сумма 99999999999999999999 копеек | Точно сохранена/возвращена/записана в audit; небезопасный number отклонён |
| Суммовые/валютные и включающие границы date-фильтры | Верный результат; обратный диапазон/несуществующая дата отклонены |
| Шесть колонок Kanban, пустая колонка/страница, stage-фильтр | Верные counts и bounded data |
| WON → PROPOSAL | closedAt установлен, затем очищен; version увеличивается |
| Stale contact update/delete и stale deal stage | CONFLICT, без лишних мутаций/аудита |
| Два параллельных update одной version | Один commit, один CONFLICT, одно увеличение версии и один audit |
| Activity без контекста/с неверной парой contact/deal | VALIDATION; deal-only выводит contactId и текущего assignee |
| Удаление используемого контакта | CONFLICT, данные сохранены |
| Принудительный отказ INSERT аудита | STORAGE, созданный контакт полностью откатан |
| Before/after и точные денежные snapshots | 11 нормализованных мутаций своего workspace — 11 событий; событие другого tenant отдельно |
| Старые Document действия на PostgreSQL | Create/update/read/delete прошли; нормализованные таблицы не смешиваются с Document |
| Нормализованный API в explicit demo | CONFIGURATION; PostgreSQL не заменяется демоданными |

Браузер: `/crm` открывается, прежние 8 учебных сделок отображаются, форма создания открывается/закрывается. Визуально осмотрены desktop 1440 px и mobile 390 px; ширина документа на мобильном 390 px, прокрутка таблицы локальная. Ошибок pageerror не получено. Снимки: `.playwright-mcp/task006-crm-desktop.png`, `.playwright-mcp/task006-crm-mobile.png` (игнорируемые локальные артефакты).

Собственные четыре пользователя, два workspace, Contact/Deal/Activity/Document, Session и audit-записи удалены после проверки. Временное SQL CHECK для отказа аудита удалено. Остальные данные не изменялись. Реальный проверочный сервер и локальная PostgreSQL остановлены; приложение на 127.0.0.1:3000 оставлено в прежнем явно включённом деморежиме, `.env` не менялся и секреты не сохранялись.

## Границы

Это серверный API нормализованной CRM, не миграция существующего интерфейса/Document-данных. Перевод таблицы/форм/kanban на Contact/Deal/Activity — отдельная задача. Нет автоматического Invoice при выигрыше, идемпотентности create, outbox и дополнительных endpoint-прав на отдельные поля. Полный автоматический набор ролей/нагрузки/гонок остаётся CHECKPOINT.
