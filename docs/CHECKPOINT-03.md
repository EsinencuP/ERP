# CHECKPOINT-03 — Finance + Inventory, TASK-011–017

19 октября 2026. **Пройден.** Проверялась production-сборка Next.js 15.5.28 с ERP_DEMO_MODE=false, настоящим Auth.js и изолированной PostgreSQL 17.10 на localhost:5433/erp. Внешний production не изменялся.

## Автоматические проверки

- `npm run build` — успешно после последнего изменения UI.
- `npx tsc --noEmit` — успешно; дополнительная строгая проверка unused также прошла.
- `npx prisma validate`, `npx prisma migrate status` — успешно, 8 миграций применены.
- Prisma diff БД → schema — различий нет.
- `npm run check:finance-inventory` — **9/9 pass**, без пропусков (8 групп сценариев и общий test).
- `git diff --check` — успешно.

Повторяемые интеграции: [scripts/checkpoint-finance-inventory.test.mjs](../scripts/checkpoint-finance-inventory.test.mjs). Запускать после build при работающем локальном production server на 127.0.0.1:3001, с ERP_DEMO_MODE=false, AUTH_TRUST_HOST=true, AUTH_URL=http://127.0.0.1:3001 и отдельным временным AUTH_SECRET. Скрипт отказывается работать с удалённой БД/сервером, создаёт два уникальных workspace и четыре роли. По умолчанию удаляет свои данные в finally. CHECKPOINT_KEEP_FIXTURES=true оставляет только успешные fixtures для браузерной проверки; их требуется удалить после неё. Временный пароль относится только к синтетическим пользователям example.invalid. Скрипт намеренно вызывает ошибки DB constraints/audit, чтобы проверить откат; соответствующие серверные сообщения ожидаемы.

## Подтверждённые результаты

Invoice CRUD: создание, изменение/удаление draft, уникальная последовательная нумерация INV-YYYY-NNNN, stale version и strict input. 1.5 × 10001 = subtotal 15002; налог 20% = 3000; total 18002 копейки. После изменения — total 29628. Workflow SENT → частичная оплата → PAID, запрет редактирования issued и переплаты. PDF endpoint возвращает настоящий PDF с кириллицей, правильными суммами, MIME/attachment; unauth 401, READONLY/AGENT 403, чужой ADMIN 404. PDF отрендерен Poppler и осмотрен: [образец](screenshots/checkpoint-03-invoice.png).

Finance KPI: Revenue/Paid MTD = 32128, Outstanding = 27500, Overdue = 7500 копеек; six-month series, status counts, top client и сумма AR aging совпадают с платежами. Expense create/update/delete, category filter, safe receipt URL и версии работают. P&L включает только полностью оплаченный счёт: 29628 − 2000 = 27628; partial payment исключён. CSV возвращает BOM и точные 296.28 / 20.00 / 276.28, проверяет право экспорта и период.

Inventory: Warehouse CRUD; IN/OUT/ADJUSTMENT/TRANSFER; дробные количества; перенос сохраняет суммарный запас и создаёт две связанные строки. Два конкурентных OUT с одной версией дают ровно один успех. Недостаточный запас отклоняется. Ledger содержит 6 ожидаемых строк для основного товара. DB запрещает UPDATE/DELETE движения и неполную пару TRANSFER. Искусственная ошибка аудита откатывает баланс, version, ledger и audit вместе.

Dashboard: 7 активных товаров, low = 3, out = 1 до контрольного списания; точные значения RUB 504, USD 999, EUR 18014398509481986 копеек. Проверены округление 0.005 × 100 до 1 копейки, огромная цена, отсутствие StockItem, MinStock, исключение inactive Product и включение inactive Warehouse. Поиск/статус/страницы не меняют глобальные KPI. Контрольный OUT даёт low = 2, out = 2, RUB 304. Tenant/RBAC проверены через реальные cookies и Server Actions; подмена workspace и неверные фильтры отклонены.

## Браузер и очистка

Обе темы, desktop/mobile, readonly/foreign/empty/no-match, фильтры, navigation → ledger, reduced motion, обновление KPI/sidebar после IN проверены. Mobile document width = 390 px, без общего overflow. Нормальные переходы без console errors/warnings. При остановленной PostgreSQL refresh скрывает данные и показывает ошибку сервиса; прямой action возвращает STORAGE без data. Подробности и скриншоты: [TASK-017.md](TASK-017.md). Предыдущие подробные UI-проверки: TASK-011–016.

Все созданные CHECKPOINT-03 записи удалены, оставшихся workspace с checkpoint03-prefix — 0. Предыдущие пользовательские данные сохранены. Оба SQL trigger stock_movement_immutable / stock_transfer_pair включены. Проверочные cookies очищены, Next.js и PostgreSQL остановлены. Локальные временные PDF/metadata находятся в игнорируемой .data; секреты и данные БД не входят в коммит.

Критерии пользовательского CHECKPOINT-03 выполнены. Нагрузочная проверка, backup/restore, налоговый учёт и бухгалтерская оценка запасов остаются отдельными задачами из roadmap.
