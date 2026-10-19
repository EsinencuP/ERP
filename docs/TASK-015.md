# TASK-015 — Inventory Products + Stock Levels

Статус: закрыт 19 октября 2026. Проверки завершены совместно с TASK-016.

`/inventory` переведён на нормализованные Product/StockItem. Таблица: **SKU | Name | Category | Stock(total) | MinStock | Status | Price | Actions**. Создание/редактирование каталога, защищённое удаление, поиск по SKU/name/category, фильтр stock status/attention/active и серверная пагинация. Прежний Document-каталог сохранён отдельно в `/inventory/documents` с legacy actions.

Product.category добавлена nullable VARCHAR(100) и tenant/category index миграцией `20261019000200_inventory_product_category`. Старые строки и остатки не изменяются; свободная категория не требует отдельного справочника.

Stock(total) = сумма StockItem.qty по всем складам workspace, включая неактивные; отсутствие StockItem = 0. Статус вычисляется, не редактируется:

- in_stock: qty > minStock;
- low_stock: 0 < qty ≤ minStock, amber;
- out_of_stock: qty = 0, red.

Цена — точные Decimal(20,0) копейки; количества/порог — Decimal(20,3), DTO строки, вычисления BigInt. Stock(total) может превышать лимит одного складского остатка и остаётся точным. Поиск учитывает кириллицу даже в PostgreSQL с C collation. Page/count выполняются Promise.all со стабильным порядком SKU/id.

CRUD проверяет live session/workspace, strict input, RBAC и version, сохраняет audit атомарно. READONLY читает, AGENT+ создаёт/редактирует, MANAGER+ удаляет. SKU уникален внутри workspace. Product form не принимает прямой stock/status/costPrice: остатки меняются движениями TASK-016, costPrice сохраняется. Любая складская или invoice-связь запрещает удаление; доступна деактивация.

Sidebar badge считает активные товары с низким **и нулевым** запасом по всему workspace независимо от фильтра/страницы. Поддержаны desktop/collapsed/mobile, доступная полная подпись с low/out counts, визуальное 99+. После CRUD/refresh, навигации и focus окна count перечитывается. Ошибка — «!», а не нулевой запас; явный demo не подменяет нормализованные данные.

## Проверки

- Финальные build, строгий typecheck и diff-check успешны. Prisma validate/deploy/repeated deploy/status/schema diff прошли на изолированной PostgreSQL 17.10. Тестовые файлы вне CHECKPOINT не создавались.
- HTTP/SQL: два склада (один inactive), total 2+2=4 при minStock=3 → in_stock; 0.100+0.200=0.300 при minStock=0.300 → low_stock; 0 и missing row → out_of_stock; 0.301 при minStock=0.300 → in_stock.
- Сумма `199999999999999999.998` и цена `9007199254740993` коп. передаются/отображаются точно. Проверены status/attention/category/active/search, буквальный `%`, кириллица и страницы без пересечений.
- Tenant isolation для списка/read/update/delete, отсутствие входа, READONLY/AGENT/MANAGER, strict защита workspace/stock/status/costPrice, неверных величин и currency. Проверены duplicate SKU, stale update/delete и конкурентные updates (один успех, один CONFLICT).
- Принудительный отказ audit полностью откатывает create/update Product, включая version. Общий mutation helper, вынесенный в TASK-016, проверен повторно. Удаление связанного товара не стирает StockItem/InvoiceItem.
- Браузер: empty/validation, create **123,45 RUB** с MinStock **0,125**, edit **250,10 USD**, delete; badge **5→6→5**, filter low_stock и pagination. Ctrl+Enter/Escape и возврат фокуса проверены. READONLY без write controls, AGENT без delete.
- 100 временных Product дали alert=104: UI показал 99+, доступная подпись — полные 104; collapsed/mobile badge сохранён. При прерывании запроса — «!», после восстановления count перечитан.
- Desktop dark/light и mobile 390×844 визуально осмотрены; ширина документа 390, Sheet 390×844, таблица прокручивается внутри контейнера. Нормальные переходы без console errors/warnings.
- При остановленной PostgreSQL getProducts/getInventoryStockAlert возвращают STORAGE без data/демо; общий error state не показывает старые/нулевые остатки.

Совместные fixtures TASK-015/016 удалены, проверочные серверы остановлены; подробности cleanup — [TASK-016.md](TASK-016.md). Production/deployment/commits не выполнялись. CHECKPOINT-03 остаётся после TASK-017.

Скриншоты: [dark](screenshots/task-015-products-dark.png), [light](screenshots/task-015-products-light.png), [mobile](screenshots/task-015-products-mobile.png), [форма mobile](screenshots/task-015-product-form-mobile.png), [collapsed / 99+](screenshots/task-015-sidebar-collapsed.png), [empty](screenshots/task-015-products-empty.png).
