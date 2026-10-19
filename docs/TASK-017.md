# TASK-017 — Inventory Dashboard + Low Stock Alerts

19 октября 2026. Закрыт вместе с CHECKPOINT-03.

`/inventory/dashboard`, вкладка «Обзор»: Total Products, Low Stock Count, Out of Stock и Total Value. Счётчики относятся ко всем активным товарам workspace. Low Stock — 0 < qty ≤ MinStock; Out of Stock — qty = 0. Таблица содержит оба статуса, badge **Reorder suggested**, поиск, фильтр, пагинацию и ссылки на журнал товара. Фильтры списка не ограничивают KPI.

Стоимость = Σ round(общий запас SKU × salePrice, 0) в копейках, отдельно по валютам. Количества всех складов, включая неактивные, суммируются точно в PostgreSQL. Неактивные товары исключены. Большие суммы передаются строками, без Number. Общий CTE используется каталогом, alert и dashboard; KPI и таблица читаются через Promise.all. Это стоимость по текущим ценам продажи, а не бухгалтерская оценка запасов.

Live session/workspace/RBAC действуют на сервере. READONLY может читать обзор. Loading, error и empty состояния явные; Refresh перечитывает обзор и sidebar. При отказе PostgreSQL карточки/таблица убираются, возвращается STORAGE без данных или демофолбэка. Новых зависимостей и миграций в TASK-017 нет.

Проверены обе темы, desktop 1440 px, mobile 390 × 844 (ширина документа 390 px, таблица прокручивается внутри), поиск/статус, отсутствие совпадений, пустой workspace, READONLY, переход к ledger, reduced motion и Refresh после движения. При IN для нулевого товара Out of Stock изменился с 2 на 1, sidebar с 4 на 3. Обычная консоль: 0 errors/warnings. Build, tsc и 9/9 checkpoint tests прошли.

Скриншоты: [dark](screenshots/task-017-dashboard-dark.png), [light](screenshots/task-017-dashboard-light.png), [mobile](screenshots/task-017-dashboard-mobile.png), [empty](screenshots/task-017-dashboard-empty.png), [ошибка БД](screenshots/task-017-dashboard-error.png). Итоговая проверка TASK-011–017: [CHECKPOINT-03.md](CHECKPOINT-03.md).
