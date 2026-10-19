# Склад

## Движения и склады — TASK-016

`/inventory/warehouses`: CRUD metadata code/name/address/isActive, поиск (включая кириллицу на C collation), active filter и серверная пагинация. StockItem не меняется через warehouse form. Склады со складскими записями можно деактивировать, но нельзя удалить; inactive balances не исчезают из Product stock.

Нажатие имени товара открывает `/inventory/[id]`: точный общий запас, MinStock/status, полное описание, paginated остатки по складам и Timeline **Date | Type | Qty | Reference** (дополнительно warehouse/balance after). Дата — фактический createdAt, в UI Москва; произвольная posting/backdate не принимается. Положительные и отрицательные Qty имеют знак/цвет. TRANSFER показывает обе строки и общий transferId; фильтр TRANSFER выбирает оба направления. Ledger неизменяем: нет update/delete actions/UI, PostgreSQL trigger запрещает UPDATE/DELETE.

Создание движения: IN — приход; OUT — списание (вводится положительное число, ledger хранит минус); ADJUSTMENT — ненулевая signed delta, а не целевой остаток; TRANSFER — между двумя разными активными складами. Product должен быть активным. Expected StockItem.version фиксируется после выбора складов (0 означает отсутствующий баланс); обе стороны transfer проверяются заново. Negative balance/overflow запрещены до записи. Serializable transaction атомарно сохраняет баланс(ы), ledger и audit. Transfer — пара TRANSFER_OUT/IN с общим UUID и одинаковым createdAt; deferred PostgreSQL trigger проверяет pair/product/warehouses/sign sum на commit. Новый stock row создаётся только при первом успешном движении.

Формы поддерживают Ctrl/Cmd+Enter/Escape, блокировку pending/duplicate submit и неизвестного результата сети. Ошибки/конфликты требуют перечитать журнал перед повтором. UI чтение доступно READONLY; create/update warehouses и create movements — AGENT+, удаление неиспользованного склада — MANAGER+. Tenant берётся из live session; подмена qtyBefore/qtyAfter/workspace/type storage запрещена strict schema. У ссылок reference нет глобальной уникальности: одна накладная может содержать несколько движений. Версии остатков защищают от повторной отправки исходной операции.

## Нормализованные товары и остатки — TASK-015

`/inventory`: SKU | Name | Category | Stock(total) | MinStock | Status | Price | Actions. Product.category — необязательная строка до 100 символов. Stock(total) суммирует StockItem.qty по всем складам своего workspace, включая неактивные; без StockItem = 0. Статусы: in_stock (qty > minStock), low_stock (0 < qty ≤ minStock, amber), out_of_stock (0, red). Общий Badge показывает текст и семантический цвет.

Страница и count читаются параллельно с серверными search (SKU/name/category), category exact match, status/attention и active filters, стабильным порядком SKU/id и bounded pagination. По умолчанию только активные Product. Цены — целые копейки Decimal(20,0); количества/MinStock — Decimal(20,3), DTO и UI сохраняют точные строки без Number.

Actions getProducts/getProduct/getInventoryStockAlert/createProduct/updateProduct/deleteProduct работают только с live session/workspace. READONLY — чтение, AGENT+ — create/update, MANAGER+ — delete. Strict input не принимает workspace/stock/status/costPrice; SKU уникален в workspace. CRUD проверяет version и атомарный audit; неизвестный сетевой результат блокирует повтор до перечитывания. StockItem и costPrice не редактируются формой каталога. Удаление товара с любыми StockItem/InvoiceItem запрещено; isActive позволяет сохранить историю и убрать его из активного каталога/alert.

Sidebar badge считает активные товары с низким и нулевым запасом по всему workspace независимо от фильтров/пагинации. Доступный текст содержит low/out counts, collapsed/mobile также показывают badge; 99+ — только визуальное ограничение. Обновление после CRUD/Refresh, перехода маршрута и focus окна. При ошибке — «! / Остатки недоступны», без нулевого/демо fallback. Движения и склады реализованы TASK-016, описаны выше.

## Прежний реестр /inventory/documents

Ниже описан сохранённый каталог Document-слоя. Его данные не смешиваются с Product/Warehouse/StockItem/StockMovement; связи нормализованных моделей описаны в [database.md](database.md).

DocType `Product`: `title` — наименование, `subtitle` — артикул, `amount` — цена единицы в копейках, `quantity` — целый неотрицательный остаток, `notes` — описание/место хранения.

Сервис автоматически выводит статус из остатка: 0 — Нет в наличии, 1–3 — Мало на складе, 4+ — В наличии. Порог пока общий и фиксированный как бизнес-правило, не цветовой токен. Стоимость запасов — сумма `amount × quantity`.

Legacy actions: `getProductDocuments`, `createProductDocument`, `updateProductDocument`, `deleteProductDocument`. Контроль версий предотвращает потерю параллельных изменений. Это прежний каталог с прямым редактированием остатка и общим порогом 3; он не меняет нормализованные остатки и sidebar alert.

## Inventory Dashboard — TASK-017

`/inventory/dashboard` и вкладка «Обзор»: Total Products, Low Stock Count (0 < qty ≤ MinStock), Out of Stock (qty = 0), Total Value. Счётчики относятся ко всему активному каталогу. Стоимость — SUM(round(total stock × salePrice, 0)) в копейках по SKU, с отдельными суммами по валютам; это стоимость по текущим ценам продажи, не бухгалтерская оценка. Неактивные товары исключены, остатки неактивных складов включены.

Общий SQL CTE getInventoryStockFacts используется каталогом, sidebar и dashboard. KPI и bounded low/zero-stock list читаются через Promise.all, каждый запрос имеет собственный PostgreSQL snapshot. Поиск, статус и пагинация меняют только список, не глобальные KPI. Все строки списка имеют badge «Reorder suggested» и ссылку на журнал товара. READONLY имеет право чтения; tenant берётся из live session. Loading/error/empty состояния явные, PostgreSQL error не заменяется нулями. Refresh перечитывает overview и sidebar.
