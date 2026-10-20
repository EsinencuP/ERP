# TASK-025 — Settings App Configuration

Дата: 2026-10-20. `/settings` → Company configuration / Настройки компании.

- Settings singleton — одна запись на workspace с PK/FK workspaceId, version и updatedAt. Миграция сохраняет названия существующих компаний, создаёт начальный audit. Bootstrap создаёт Settings и audit в транзакции; повторный seed не изменяет аккаунт/настройки.
- Company name, локально загружаемый PNG logo (≤256 КБ, ≤1024²), default currency EUR, IANA timezone, четыре пресета date format. Валюта EUR фиксирована предыдущим требованием пользователя.
- ADMIN/SUPER_ADMIN сохраняют. Остальные роли видят read-only. Live actor/tenant проверки, strict DTO, optimistic version, Serializable, атомарные Settings/Workspace.name/AuditLog. При conflict/unknown result нужен reload. Ошибка PostgreSQL или повреждённые settings не заменяются defaults.
- Глобальный ConfigurationProvider над всей dashboard-частью приложения получает DB snapshot из Server Component; Context сразу обновляется после подтверждённого save. В layout configuration и остальные данные читаются параллельно; React.cache дедуплицирует только внутри запроса.
- Sidebar и company dialog используют актуальные companyName/logo. Общие formatter hooks во всех модулях применяют date format/timezone; календарные DATE не смещаются. Сохранённые deadlines задач сохраняют прежнюю календарную семантику, timestamp-представления учитывают выбранный пояс.
- Finance: overdue day, месячные графики, Paid MTD, P&L, payment date filters и CSV используют пояс workspace. Временные границы фильтров учитывают DST; PDF применяет logo/date format. Исторический issuerName сохраняется snapshot, новые счета получают актуальное название компании.
- Переключатели created/updated/deleted/payment реально фильтруют Header notifications и индикатор. Audit сохраняет все события. Operational stock/leave badges остаются бизнес-индикаторами. Email/push transport не имитируется.
- Полные EN/RU подписи, demo read-only, loading/error/empty, manual reload, темы и мобильная форма.

Проверки — [CHECKPOINT-04.md](CHECKPOINT-04.md). Снимки — `screenshots/task025-*.png`.
