# TASK-016 — Inventory Stock Movements + Warehouses

Статус: закрыт 19 октября 2026.

Добавлены `/inventory/warehouses` (warehouse CRUD) и `/inventory/[id]` (остатки и timeline товара). Нажатие имени в каталоге открывает карточку. В timeline есть **Date | Type | Qty | Reference**, склад, остаток после операции, фильтр типа и пагинация. Перемещения показаны двумя направлениями с общим transferId. Записи не имеют edit/delete controls или actions.

Склад хранит code/name/address/isActive. Code уникален внутри workspace. Metadata CRUD использует live session/RBAC, version и atomic audit. Любой StockItem блокирует удаление склада, включая нулевой остаток; деактивация сохраняет данные и общий запас товара. Поиск поддерживает кириллицу на C collation, page/count читаются параллельно.

## Движения и неизменяемость

- IN: положительное количество добавляется на склад.
- OUT: положительный ввод списывается; ledger хранит отрицательную quantity.
- ADJUSTMENT: ненулевая signed delta, не целевой остаток.
- TRANSFER: положительное количество, два разных активных склада. API создаёт TRANSFER_OUT/TRANSFER_IN существующего enum с общими UUID transferId/createdAt и равными противоположными quantity.

Product также должен быть активным. Форма читает фактические позиции и фиксирует expected StockItem.version обеих сторон. Missing position — qty=0/version=0 без записи. Создание отсутствующего StockItem разрешено только при expected version=0; существующий баланс обновляется с version increment. До записи проверяются все конечные значения: неотрицательность и capacity Decimal(20,3). Количества вычисляются в BigInt-тысячных.

Serializable transaction атомарно обновляет один/два StockItem, добавляет ledger entries и audit. Порядок обновлений стабилен по warehouse id, повторяются только P2034 с подтверждённым rollback. Повтор отправки старой версии даёт CONFLICT. Ошибка неизвестного результата сети блокирует повтор до обновления журнала. Reference optional и не уникален глобально: одна накладная может содержать несколько движений.

Миграция `20261019000300_immutable_stock_ledger` добавляет PostgreSQL triggers:

- `stock_movement_immutable`: запрещает UPDATE/DELETE после создания;
- deferred `stock_transfer_pair`: к commit требует ровно две строки, один Product, два Warehouse, TRANSFER_IN/OUT и нулевую сумму дельт.

Исправление выполняется новым движением. Backdating, valuation, себестоимость, резервы и бухгалтерские проводки не добавлены. Date — серверный createdAt; UI отображает Москву. Нормализованные StockItem/StockMovement не смешиваются с прежним Document-каталогом.

READONLY читает, AGENT+ создаёт movements и создаёт/редактирует warehouses, MANAGER+ удаляет только неиспользованный склад. Product/workspace/warehouse заново проверяются на сервере; клиент не задаёт qtyBefore/qtyAfter/createdAt/actor/transferId. Формы используют общую Sheet, keyboard shortcuts, pending guards и возврат фокуса; выбор активных складов ограничен 100 результатами и имеет поиск.

## Проверки

- Финальные `npm run build`, `npm run typecheck -- --noUnusedLocals --noUnusedParameters`, `git diff --check` успешны. Prisma validate, deploy/repeated deploy/status и schema diff прошли на локальной PostgreSQL 17.10. Trigger behavior проверен отдельно, поскольку Prisma schema не описывает SQL functions/triggers.
- Warehouse CRUD/duplicate code/stale version/search, tenant isolation, READONLY/AGENT/MANAGER, missing position без создания row, strict rejection forged fields/type/quantity/source=target. Предыдущие Product checks TASK-015 сохранены.
- HTTP/SQL ledger: **IN 10.125 → OUT 2.125 → ADJUSTMENT −3 → ADJUSTMENT +0.001 = 5.001**. TRANSFER 2.5 дал source **2.501**, target **2.500**, total **5.001**, две связанные записи и audit.
- Два конкурентных OUT одной версии: один успех, один CONFLICT. Два первых IN на отсутствующую позицию: один успех, один CONFLICT, один StockItem. Проверены недостаточный запас, переполнение, stale source/target, inactive Product/Warehouse policy и foreign workspace.
- Принудительный отказ audit откатывает одиночное движение, перенос целиком и создание отсутствующего баланса; ни ledger, ни version/qty, ни audit не изменяются. Warehouse create/update также полностью откатываются при отказе audit.
- Прямые UPDATE/DELETE StockMovement отклонены PostgreSQL. Commit одиночного TRANSFER и пары в одном warehouse отклонён deferred trigger. Tenant FK и negative qty CHECK также проверены. После временных проверок audit constraint снят.
- Timeline type filter, pagination без пересечений, product summary/positions и чужой product id проверены. Live снижение роли старой сессии до READONLY блокирует запись.
- В браузере зарегистрированы **IN +2.5, OUT −1, ADJUSTMENT −0.001, TRANSFER 1**. Общий запас последовательно **4.001→6.501→5.501→5.500→5.500**; transfer добавил две строки, sidebar alert **5→4**. SQL подтвердил ровно **13 ledger entries**, по одной записи на три одиночных UI operations, две на transfer и две корректные transfer pairs в полном журнале.
- Браузерный warehouse create/edit/delete, все типы movements, transfer filter, empty ledger, READONLY без записи, AGENT без удаления, чужая карточка NOT_FOUND. Desktop обе темы и mobile 390×844 визуально осмотрены, document/Sheet width 390; таблицы прокручиваются внутри. Escape возвращает фокус, обычные переходы без console errors/warnings.
- При остановленной PostgreSQL getWarehouses/getProductInventory/getProductMovements возвращают STORAGE без data. Refresh убирает stock panels и ledger, показывает ошибку подключения, демофолбэка нет.

Тестовые файлы вне CHECKPOINT не создавались. CHECKPOINT-03 остаётся после TASK-017.

## Cleanup

Удалены только общие fixtures TASK-015/016: 2 workspace, 5 пользователей/Membership, 35 Product, 7 Warehouse, 36 StockItem, 13 StockMovement, 1 invoice с item, 1 contact, 36 audit events и 32 sessions. 100 дополнительных badge fixtures удалены отдельно. Ранее существовавшие записи сохранены.

Удаление локальных fixture ledger rows выполнено под exclusive table lock в одной cleanup transaction с временным отключением только `stock_movement_immutable`. Trigger включён до commit; после cleanup оба triggers имеют enabled=O. Это обслуживание изолированной проверочной БД, не приложение/production API. PostgreSQL остановлена корректно, Next server остановлен; production/deployment/commits не выполнялись.

Скриншоты: [ledger dark](screenshots/task-016-ledger-dark.png), [ledger light](screenshots/task-016-ledger-light.png), [ledger mobile](screenshots/task-016-ledger-mobile.png), [transfer dark](screenshots/task-016-transfer-form-dark.png), [transfer mobile](screenshots/task-016-transfer-form-mobile.png), [warehouses dark](screenshots/task-016-warehouses-dark.png), [warehouses light](screenshots/task-016-warehouses-light.png), [warehouses mobile](screenshots/task-016-warehouses-mobile.png).
