# Архитектура Evo ERP

## Main Dashboard — TASK-023

`/` — Server Component с force-dynamic, force-no-store и noStore для прямых Prisma reads. После live session/валидации currency пять независимых источников запускаются одним Promise.all: Finance aggregates, CRM stage counts, общий Inventory alert, HR pending approver count, последние восемь AuditEvent summaries. Legacy WorkspaceState/Documents не участвуют в KPI. Revenue — cash receipts с налогом за всё время в выбранной RUB/USD/EUR, 6 месяцев включая текущий/UTC; Open Deals исключает WON/LOST, bar chart показывает количество всех шести этапов без суммирования валют. Inventory KPI включает active low+zero stock из shared CTE; баннер появляется именно при low_stock > 0. HR pending сохраняет manager/admin policy; остальным показана недоступность, а не нулевой счётчик. Audit ограничен workspace, без before/after, с устойчивой сортировкой date/id и безопасными entity links. Ошибка источника видима и не превращается в ноль; ошибка auth скрывает весь dashboard.

Разметка server-rendered, client islands — Recharts и refresh/currency controls. Во время перехода прошлый snapshot скрыт skeleton; новый server snapshot загружается обычным GET. Money остаётся Decimal→string/BigInt, график использует общий bounded projection. Shared RevenueChart и RecentInvoices повторно используются Finance; прежняя полная аналитика TASK-012 сохранена на `/finance/dashboard` с nav. Новых моделей/миграций/зависимостей нет.


## Projects Overview — TASK-022

`/projects/overview` читает страницу из 12 нормализованных проектов и выводит progress (DONE / все Task, включая CANCELLED), бюджет/расходы, distinct team и CSS Grid timeline тех же проектов. Карточки/count/task aggregates/expense aggregates/team preview читаются в одном RepeatableRead snapshot. Search/status/projectId tenant-scoped, literal/Cyrillic search shared sqlTextMatch; страницы clamp. Team = manager UNION task assignees, ID distinct; manager первым, inactive assignments отмечены и сохранены. Preview ≤6, full team pagination по 20, без unbounded user/task arrays.

Budget usage = SUM(Expense.amount) с projectId и той же currency, за всё время. Другие валюты показаны отдельно без FX. Invoice revenue не считается расходом. Суммы Decimal→string/BigInt, только bounded bar % преобразуется в Number. Нулевой бюджет не даёт NaN/Infinity; overspend отображается явно, fill ограничен 100%, текстовый % остаётся точным. Additive migration `20261019000600_project_expenses` добавляет nullable Expense.projectId, composite tenant FK RESTRICT и индекс workspace/project/currency; прежние расходы остаются без проекта. Expense CRUD/picker и filtered deep link позволяют назначить проект, пересчёт derived без ручного spent. Старый update Expense без projectId сохраняет назначение; explicit empty снимает связь.

Настройки проекта (code/name/description/status/budget/currency/manager/startDate/endDate) используют shared Projects mutation helper, RBAC, strict Zod, captured version и atomic audit. Связи contact/task и данные legacy не меняются. Новый manager должен быть active workspace member, прежний inactive сохраняется при других правках. Бюджет не переименовывает валюту связанных расходов: они остаются отдельными валютными суммами. Project status ручной, progress всегда derived из реальных задач.

Timeline строится CSS Grid без Gantt-библиотеки: 1…93 календарных дня, default 6 недель относительно Москвы; UTC day arithmetic без DST drift. Явные Project.startDate/endDate, inclusive single-day bars, clipping по периоду и отдельный текст для незаданных/внешних дат. Частичные периоды не выдумываются. Один и тот же выбранный период сохраняется при фильтрах/страницах/refresh. Internal horizontal scroll и sticky project labels; task progress fill не меняет даты проекта. Deep links связывают overview → tasks/expenses и обратно; ошибки PostgreSQL скрывают прежние карточки/timeline без demo fallback.


## Projects Task Kanban + List — TASK-021

`/projects` читает нормализованные Task/Project; прежний Document-реестр сохранён в `/projects/documents` с прежними legacy actions. Четыре колонки TODO/IN_PROGRESS/IN_REVIEW/DONE, priority badge, workspace-member avatar и due date. Прежний Document count badge показывается только на вкладке реестра. SQL migration переименовывает TaskStatus.REVIEW в IN_REVIEW на месте, без переписывания задач. Существующий CANCELLED сохранён только для чтения истории в List. DONE заполняет completedAt, reopening очищает его.

ЗАКОН 6: CRM collision detection/keyboard navigation и Pointer/Keyboard sensors вынесены в `src/hooks/use-kanban-dnd.ts`. CRM pipeline сохраняет экспортируемые adapters, Projects использует тот же factory/hook: drop только в колонки, отмена вне board, стрелки через пустую колонку. DragOverlay визуальный, отдельный handle и select-alternative. Перенос меняет статус, ручное ранжирование внутри колонок не добавляется; порядок updatedAt desc/id asc. Position и task hierarchy сохраняются.

List использует CRM-паттерн TanStack v8: getRowId, manualPagination/manualSorting и серверный whitelist sort. Оба вида читаются в одном RepeatableRead snapshot (четыре bounded column pages + list page, по 20). Поиск literal/Cyrillic через shared sqlTextMatch; общие project/assignee/priority/search, status только для List. Страницы clamp по server count. Никаких unbounded task lists. Project/member picker — общий RecordPicker с поиском/пагинацией; inactive user/member не назначается, старое назначение сохраняется при редактировании других полей.

Task CRUD и minimal project create используют live session/workspace и shared Projects RBAC: READONLY читает, AGENT+ создают/меняют, MANAGER+ удаляют leaf task. Serializable transaction, expected version и audit атомарны, retry только гарантированного P2034 rollback. Project ownership/parent не меняются через task form, delete с children запрещён. Due date хранится до конца выбранного дня Москвы; unchanged date сохраняет исходный timestamp. Неизвестный результат DnD откатывает отображение с явной ошибкой и блокирует повтор до refresh; committed status не откатывается при ошибке последующего чтения. Failed refresh скрывает старые данные, demo fallback отсутствует.


## HR Employee Profile — TASK-020

`/hr/[id]`: header с Avatar/Name/Position/Status; слева данные Employee, контакты и named document links, справа годовой leave balance и Reporting to. Имена в Grid/List/Org Chart и руководитель ведут в профиль. Профиль редактируется общей EmployeeFormSheet; документы — отдельные versioned EmployeeDocumentLink с title/url/notes. URL только http(s), без credentials, при рендере повторная валидация; файл не загружается и сервер не запрашивает URL.

Новая LeaveAllowance хранит ручной целый лимит 0…9999 рабочих дней на Employee/year, без неявного default. Нет записи → «Не задан», 0 — явный нулевой лимит. Назначают MANAGER/ADMIN/SUPER_ADMIN; version=0 допустима только при отсутствии записи. Остаток = лимит − APPROVED ANNUAL weekdays в выбранном календарном году, включая будущие дни; PENDING отдельно. SQL клипует переходящий отпуск границами года и исключает выходные. Другие типы/статусы не входят; отрицательный остаток сохраняется. Праздники, half-days, автоматические начисления и carryover не моделируются; лимит не блокирует workflow согласования.

Профиль проверяет live session/tenant, независимые документы/count/manager/balance читает Promise.all; баланс и лимит одним SQL statement, документы по 10 на странице. Весь профиль не является единым snapshot. Documents/allowance mutations используют существующий HR RBAC, strict Zod, version, Serializable и atomic audit. Document delete только ADMIN/SUPER_ADMIN. Новые tenant composite FK и CHECK в additive migration `20261019000400_employee_profile`. Employee с документами/лимитами удалять нельзя. PostgreSQL error скрывает прежние данные и не включает demo fallback.

## HR Leave Management — TASK-019

`/hr/leaves` читает нормализованный Leave с пагинацией/search/status/type, по умолчанию очередь PENDING. Create принимает employee/type/startDate/endDate/reason; дни вычисляются сервером и тем же shared date-fns helper в форме. Период включительный, исключаются суббота/воскресенье. DATE хранится как календарная дата UTC midnight, date-fns получает date-only parseISO для календарного расчёта. Нулевые периоды, неверные/обратные даты и >9999 рабочих дней отклоняются.

MANAGER/ADMIN/SUPER_ADMIN рассматривают весь workspace; организационная manager self-relation не задаёт отдельный ACL. AGENT+ создают заявки, READONLY читает. PENDING → APPROVED/REJECTED проверяет live роль, id/workspace, version и статус; автор решения сохраняется в approvedById для обоих исходов. Терминальные заявки не редактируются/удаляются. Serializable create/decision и audit атомарны, пересекающиеся PENDING/APPROVED заявки одного сотрудника запрещены; только P2034 допускает retry. Неактивным Employee не создают/одобряют отпуск, pending можно отклонить. Employee.status не меняется автоматически от будущего отпуска.

Layout параллельно читает state, stock alert и manager-only pending leave count. HR badge показывает полный PENDING count, 99+ визуально, ошибку как !; для AGENT/READONLY/demo скрыт. Актуализируется после committed leave changes, focus окна, переходов и Refresh, без polling. Ошибки не заменяются demo/нулями. Новых моделей/миграций/зависимостей нет: Leave и date-fns уже присутствуют.

## HR Employee Directory + Org Chart — TASK-018

`/hr` читает нормализованный Employee, Grid/List используют одну paginated выборку с server-side search/department/status. `/hr/org-chart` читает полный tenant-scoped набор до 2000 узлов и строит рекурсивные сворачиваемые ветки через managerId self-relation. Лимит явный: больший набор возвращает ошибку, а не неполную структуру. Циклы/отсутствующие родители проверяются до рендера. Все статусы сохранены в иерархии. Avatar использует shared initials fallback; новых полей/миграций нет.

Employee profile CRUD проверяет live session/workspace, strict Zod, version и HR RBAC; Serializable transaction атомарно пишет профиль и audit. Рекурсивный SQL с UNION проверяет всю цепочку руководителей в workspace и отклоняет self/descendant/cyclic manager. P2034 повторяется только после гарантированного rollback. Employee с reports, Leave, документами или годовым лимитом не удаляется; MANAGER по действующей политике HR не может удалять. User/login не создаётся и userId не редактируется. DTO не содержит auth/payroll данных. Прежние Document-данные и действия сохранены в `/hr/documents`; автоматического переноса нет.

## Inventory Stock Movements + Warehouses — TASK-016

`/inventory/warehouses` управляет нормализованными складами (code/name/address/isActive) с live Inventory RBAC, version, atomic audit и bounded search/pagination. Product name ведёт на `/inventory/[id]`: totals, paginated warehouse positions и immutable Date/Type/Qty/Reference ledger. Чтения summary/positions/ledger выполняются Promise.all; каждый запрос проверяет tenant, включая отсутствие/чужой id. Missing StockItem читается как qty=0/version=0 без записи в БД.

createStockMovement — единственная операция записи журнала: IN/OUT принимают положительное количество, ADJUSTMENT — ненулевую signed delta, TRANSFER — положительное количество, два разных активных склада и expected StockItem versions обеих сторон. Product/warehouses повторно проверяются внутри Serializable transaction. Количества считаются BigInt-тысячными; все конечные балансы проверяются на ≥0 и Decimal(20,3) capacity до записи. Обновления StockItem идут в стабильном порядке warehouse id; новый row создаётся только при expected version=0. Movement(s), balance increments и audit атомарны. Только гарантированный P2034 rollback допускает retry; unknown network result блокирует повтор до чтения журнала.

TRANSFER представлен двумя существующими enum-значениями TRANSFER_OUT/TRANSFER_IN с общим UUID transferId/createdAt и равными противоположными quantity. Общий запас Product сохраняется. Migration `20261019000300_immutable_stock_ledger` запрещает UPDATE/DELETE StockMovement на уровне PostgreSQL и добавляет deferred constraint trigger, проверяющий ровно две строки, один Product, два Warehouse, оба направления и нулевую сумму к commit. Новые модели/enums не нужны. Исправления делаются новыми движениями; update/delete actions и controls журнала отсутствуют.

READONLY читает, AGENT+ создаёт движения и warehouses, MANAGER+ удаляет только неиспользованный склад. Любой StockItem блокирует Warehouse delete, включая нулевой, чтобы сохранить ссылки/ledger; isActive сохраняет данные. Движения неактивных Product/Warehouse запрещены, прежние остатки продолжают входить в totals. UI предлагает поиск активных складов (до 100 результатов), читает balance versions при выборе и показывает обе стороны переноса. Stock catalog/ledger/sidebar обновляются после операции.

## Inventory Products + Stock Levels — TASK-015

`/inventory` использует нормализованные Product/StockItem; прежний Document-каталог сохранён в `/inventory/documents` через явно названные legacy actions. Product получает nullable category (VARCHAR(100)) и tenant/category index; additive migration не изменяет прежние поля/остатки. Stock(total) = SUM(StockItem.qty) по всем складам данного workspace, включая неактивные склады. Товар без StockItem имеет 0. in_stock: qty > minStock; low_stock: 0 < qty ≤ minStock; out_of_stock: qty = 0. Статус вычисляется из точного numeric/BigInt, не хранится в Product.

Inventory queries ограничены live workspace. Страница/количество выполняются Promise.all, одинаковые SQL CTE определяют остаток/статус для поиска по SKU/name/category, category equality, stock status и active filters. Ограниченная серверная пагинация, стабильный порядок SKU/id. DTO передаёт Decimal-цены целыми копейками и количества с тремя знаками строками; форматирование сохраняет точность выше Number.MAX_SAFE_INTEGER.

Catalog CRUD проверяет live Inventory RBAC, strict Zod и version, сохраняет audit атомарно в Serializable-транзакции; повторяет только P2034 с гарантированным rollback. Уникальность SKU — на workspace. Доступны name/category/description/unit/salePrice/currency/minStock/isActive; costPrice и StockItem не меняются. Наличие любого StockItem или InvoiceItem блокирует удаление, вместо этого можно деактивировать товар. Non-modal Sheet/RHF/Zod onBlur, Cmd/Ctrl+Enter/Escape, возврат фокуса и блокировка повтора после неизвестного сетевого результата/конфликта следуют Finance forms.

Dashboard layout параллельно читает legacy workspace state и нормализованный InventoryStockAlert. Sidebar badge = число активных товаров с qty ≤ minStock, включая нулевые и товары без StockItem; inactive Product исключены. Desktop/collapsed/mobile используют один count и доступный текст low/out breakdown; badge визуально ограничен 99+. После CRUD/refresh обновляется layout; при смене маршрута и focus окна badge перечитывается без polling. Ошибка счётчика отображается как «!», а не 0; PostgreSQL error не подменяется демоданными. Явный demo не запрашивает normalized badge. Движения и управление складами реализованы TASK-016 (раздел выше).

## Finance P&L Reports — TASK-014

`/finance/reports` читает нормализованные Invoice/Payment/Expense через finance/reports.ts. Revenue — полные totals с налогом по полностью оплаченным счетам, дата признания — последний receivedAt, доведший счёт до полной оплаты. Статус оплаты вычисляется из суммы платежей до asOf; DRAFT/CANCELLED и частичные оплаты исключены. Expenses — суммы по Expense.date. Net Profit = Revenue − Expenses, включая отрицательный результат. Валюты RUB/USD/EUR выбираются отдельно. Это пользовательская paid-invoice модель отчёта, отличающаяся от cash-receipt dashboard TASK-012 и бухгалтерского accrual ledger.

Один параметризованный SQL statement с CTE payments и UNION ALL revenue/category expenses даёт общий snapshot PostgreSQL без передачи полного реестра в браузер. Decimal суммы сериализуются строками; сложение/вычитание в BigInt. Period presets This Month/Quarter/Year — полные текущие календарные периоды Europe/Moscow; Custom задаёт inclusive from/to. Платежи переводятся в московскую календарную дату, Expense.DATE не смещается. В UI применённый период отделён от draft фильтров, экспорт блокируется до их применения.

`/api/reports/export?type=pnl&from=YYYY-MM-DD&to=YYYY-MM-DD&currency=RUB` повторно проверяет live session/workspace/canExport, строгий whitelist и отсутствие duplicate query keys, пересчитывает тот же report и возвращает attachment UTF-8 CSV (BOM, semicolon, escaping/formula protection). Ошибки — Result JSON с 400/401/403/503; private no-store/nosniff на всех ответах. Currency по умолчанию RUB. Общая serializeCsv переиспользуется клиентским downloadCsv. Новых моделей/миграций нет; тестовые файлы остаются задачей CHECKPOINT-03 после TASK-017.

## Finance Expenses — TASK-013

Новая Expense/ExpenseCategory на `/finance/expenses` хранит title, Decimal(20,0) amount в копейках, currency, category, DATE date, optional receipt/notes и служебные workspace/creator/version/timestamps. Составной FK creator → Membership не допускает автора из другого workspace. Additive migration создаёт только enum/таблицу/индексы; SQL CHECK защищают положительную сумму/версию, непустой title, RUB/USD/EUR, диапазон дат и http(s) receipt. Prisma schema не заменяет эти миграционные CHECK.

Expense queries/services/actions находятся в finance. Page/count запускаются Promise.all с одним фильтром workspace/category/currency/search; порядок date desc/createdAt desc/id asc. Все записи заново проверяют live session/RBAC и version, сохраняют before/after audit в одной Serializable-транзакции. Общий withFinanceMutation вынесен из Invoice service без изменения его retry-политики: только P2034 с гарантированным rollback, не неизвестный сетевой результат.

Форма non-modal Sheet/RHF/Zod onBlur, Ctrl/Cmd+Enter/Escape, фиксация исходной version, Sonner и блокировка повтора при неизвестном результате. Read-only detail показывает полный notes и чек. Receipt — нормализованная внешняя http(s) ссылка без credentials: сервер ничего не скачивает; перед рендером href ссылка повторно проверяется, открывается по клику с noopener/noreferrer. Файловая загрузка не вводится. Дата расхода — календарный DATE без смещения; новая форма подставляет текущий день Europe/Moscow. Expenses не изменяют cash-receipt Revenue/Paid MTD и не являются Invoice Payment.

## Finance Payments + Dashboard KPIs — TASK-012

Главный dashboard читает финансовые данные только из нормализованных Invoice/Payment. После session `Promise.all` запускает operational state и finance aggregates; внутри getFinanceDashboard ещё один `Promise.all` параллельно выполняет четыре параметризованных SQL-запроса через pool: invoice status/AR buckets, receipts/months, top clients, recent invoices. Все запросы ограничены серверным workspace/currency и получают общий asOf. Это параллельные чтения, а не исторический ledger или единая транзакционная snapshot всех графиков; refresh перечитывает весь набор. Мутации продолжают атомарный audit/version workflow TASK-011.

Total Revenue = сумма поступлений за всё время (с налогом); Paid MTD = поступления текущего UTC-месяца по receivedAt. Outstanding/Overdue = положительный остаток выданных счетов, без DRAFT/CANCELLED, с учётом частичных платежей. AR aging по dueDate: current, 1–30, 31–60, 61–90, 90+; current включает будущий срок и сегодняшний день. Все деньги приходят из PostgreSQL как точные строки копеек. Recharts v2 получает только ограниченную числовую проекцию 0–100 для геометрии; tooltip/data tables/KPI сохраняют точные суммы даже выше Number.MAX_SAFE_INTEGER. Валюты RUB/USD/EUR выбираются отдельно, без конвертации и смешивания.

`/finance/payments` — серверный initialData и клиентский реестр нормализованных поступлений с поиском, валютой, способом, UTC date range и пагинацией. Page/count читаются через Promise.all. Dialog выбирает отправленный/просроченный счёт через две параллельные bounded queries и переиспользует InvoicePaymentDialog/createInvoicePayment. Успешная запись инвалидирует /finance/payments, invoice и dashboard. Старый Document реестр сохранён отдельно. CRM/project operational summaries пока используют существующий Document-слой. Файлы тестов вне CHECKPOINT не добавляются.

## Finance Invoice CRUD — TASK-011

Нормализованные Invoice/InvoiceItem/Payment получают отдельный workflow на /finance; прежний Document реестр сохранён в /finance/documents через явно названные совместимые actions. Invoice.version защищает aggregate строк; редактирование/удаление допустимо только для неоплаченного DRAFT. SENT фиксирует выдачу, не отправку email; PAID выводится из платежей. Просрочка вычисляется по UTC calendar date без неаудированных записей во время чтения. Нумератор InvoiceSequence по workspace/year сохраняется после удаления черновиков; при create increment, строки и audit атомарны. Только гарантированный rollback PostgreSQL P2034 допускает ограниченный повтор транзакции.

Количество имеет до 3 знаков, цены — целые копейки. Расчёты используют BigInt: каждая qty×price округляется half-up до копейки, налог — half-up от subtotal, total=subtotal+tax. Переполнение Decimal(20,0) отклоняется. Валюты формы RUB/USD/EUR (2 знака). PDF строится @react-pdf/renderer в Node route с повторной проверкой workspace и canExport. Локальный статический Geist TTF/OFL, customer/issuer snapshots и палитра из CSS variables не требуют внешних запросов при экспорте. Тестовые файлы вне CHECKPOINT не добавляются.

## Vercel deployment

Production использует существующий проект erp и Prisma Postgres через server-only DATABASE_URL. Локальный файловый demo не применяется на serverless filesystem. vercel.json запускает scripts/vercel-build.mjs: generate → только при VERCEL_ENV=production prisma migrate deploy → необязательный bootstrap из SEED_ADMIN_* → next build. Preview не выполняет миграции/seed, поскольку существующая интеграция использует общий DATABASE_URL для Production и Preview. Production требует AUTH_SECRET, HTTPS AUTH_URL и отключённый ERP_DEMO_MODE; bootstrap idempotent и не заменяет существующий пароль. После первого запуска bootstrap password удаляется из Vercel env. .vercel и локальные env/credentials исключены из Git; значения секретов не попадают в отчёты.

## Текущая версия

Модульный монолит Next.js 15 App Router на Node.js. В одном приложении работают маршруты, Server Actions, бизнес-сервисы и репозиторий. PostgreSQL подключён через Prisma 6. Версии закреплены lock-файлом. Фронтенд: React, Tailwind 3, Shadcn/Radix, TanStack Table, React Hook Form + Zod, Recharts, DnD Kit. TASK-001 переводит шрифты на `Geist` и `Geist_Mono` из `next/font/google`.

## Design System

TASK-001: база Slate, однотонный акцент Indigo-Violet. `components.json` задаёт `style: new-york`, `baseColor: slate`, `cssVariables: true`. Существующий проект не переинициализируется вложенным `create-next-app`; сохраняются App Router, `src/`, alias `@/*`, Next.js 15 и строгие настройки TypeScript.

### Цвета и Tailwind

`src/app/globals.css` — единственный источник палитры. `--color-*` хранят **каналы HSL**, а компоненты используют `hsl(var(--color-token))`. `:root` задаёт светлую Slate-палитру, `.dark` переопределяет все цветовые токены. Каноническое имя основного текста — `--color-foreground`; `--color-text` сохранён как совместимый alias. Основной акцент в светлой теме: `--color-primary: 262 80% 50%`; в тёмной светлота увеличена до 74% для контраста. Синие CTA и голубо-фиолетовые градиенты не применяются.

Семантические статусы используют `--color-success`, `--color-warning`, `--color-danger`, `--color-info` и соответствующие мягкие поверхности. Overlay/glass/shadow содержат alpha внутри HSL-токена и применяются через `hsl(var(...))`. `--color-transparent` остаётся CSS-значением `transparent`.

Shadcn aliases (`--background`, `--foreground`, `--primary`, `--card`, `--popover`, `--muted`, `--border`, `--input`, `--ring`, `--sidebar-*`) ссылаются на ERP-токены. `tailwind.config.ts` включает `darkMode: ["class"]`, semantic colors с поддержкой alpha, Geist font families, radius scale, тени через `--color-shadow` и `tailwindcss-animate`. Классы `bg-primary`/`text-foreground` являются отображением CSS variables; прямые цветовые utility-классы не используются.

### Типографика и темы

`layout.tsx` импортирует `Geist` и `Geist_Mono` из `next/font/google`, subsets `latin`/`cyrillic`, `display: swap`, переменные `--font-geist-sans`/`--font-geist-mono`. Next.js загружает файлы при сборке и отдаёт их локально из `/_next/static/media`; браузер не обращается к Google Fonts. Для первой сборки требуется доступ к Google Fonts. Inter отсутствует.

Общий ThemeProvider на `next-themes` управляет классом `dark`/`light` на `<html>`, хранит выбор в `erp-theme` и устанавливает тему до гидратации. Тёмная тема используется по умолчанию. Отдельный механизм `data-theme` удалён, чтобы разные наборы компонентов не расходились по теме. Settings и Sonner используют один provider.

### Компоненты

В `src/components/ui/`: Button, Input, Label, Textarea, Select, Table, Badge, Avatar, DropdownMenu, Dialog, Sheet, Sidebar, Card, Form, Command, Popover, Calendar, Separator, Skeleton, Tooltip и Sonner. Существующие Button/Input/Badge/Dialog адаптированы с сохранением совместимости используемых бизнес-экранов; остальные получены Shadcn CLI и доработаны под правила проекта. Дополнительный Tooltip установлен как зависимость Sidebar.

`toast.tsx` — совместимый entry point к Sonner: `import { toast } from "@/components/ui/toast"`. Старый Radix Toast больше не поставляется актуальным registry, вместо него используется поддерживаемый Sonner и один Toaster в корневом layout. Toast получает цветовые классы из общей палитры.

Каталог `/design-system` защищён общим dashboard layout и содержит интерактивные примеры всех основных primitives, включая RHF-валидацию, календарь, Sheet, Command и уведомления. Он не добавлен в бизнес-навигацию; предназначен для разработки и визуальной проверки. Примеры не создают бизнес-записи. Calendar по умолчанию использует русскую локаль и доступные русские названия элементов управления.

Form-компоненты используют RHF/Zod и Radix Slot/Label. Публичный `useFormField()` возвращает Result: отсутствие FormProvider/FormField/FormItem отображается ошибкой конфигурации вместо `throw`. Публичный `useSidebar()` тоже возвращает Result; встроенные sidebar primitives при отсутствии provider остаются инертными. Skeleton имеет детерминированную ширину для стабильной гидратации.

### Движение и доступность

Существующие панели и бизнес-элементы используют entrance fade/slide, новые primitives — `motion-fade` без изменения transform, чтобы не нарушать позиционирование Radix. После entrance animation стиль возвращается к обычным CSS-правилам, поэтому анимация не перекрывает opacity состояния disabled. Sheet и popover сохраняют анимации открытия/закрытия. Skeleton сочетает fade-in и pulse. `prefers-reduced-motion` ограничивает анимацию одним коротким циклом. У интерактивных элементов — focus ring, у модальных окон — Radix focus trap, заголовки/описания и Escape. CommandDialog содержит обязательные доступные Title/Description.

### Зависимости и пределы TASK-001

Добавлены Auth.js v5 (`next-auth@5.0.0-beta.32`), TanStack Virtual, DnD Sortable, date-fns, cmdk, Sonner и зависимости UI. На момент выполнения v5 опубликован под beta-tag; точная версия закрепляется в manifest/lock. В TASK-001 установка Auth.js ещё не меняла авторизацию; TASK-004 ниже выполняет переход на Credentials/JWT. Данные и доменная логика модулей не меняются. Проверка TASK-001 — `npm run build` и визуальный осмотр, без новых тестовых файлов вне CHECKPOINT.

## Поток операции

`page → module component → shared UI → module action → module service → document service → repository`.

`getSession()` определяет workspace и роль. Сервис проверяет полномочия, Zod-схему домена, версию и бизнес-инварианты. Репозиторий ограничивает запрос workspace и сохраняет документ, поступление и событие аудита в одной транзакции. Ожидаемые ошибки и сбои инфраструктуры преобразуются в `Result`; исключения наружу намеренно не выбрасываются. Обработчик `error.tsx` нужен для непредвиденных ошибок рендера самого React/Next.js.

## Shared-контракты и Result — TASK-003

`src/types/shared.ts` — общий контракт без зависимостей от React, Prisma и серверного окружения:

```ts
type AppError = {
  code: ErrorCode;
  message: string;
  meta?: Record<string, unknown>;
};
type Result<T, E = AppError> =
  | { ok: true; data: T }
  | { ok: false; error: E };
```

Сервисы и Server Actions возвращают `Result<T>` или `Promise<Result<T>>`. Проверка `ok` сужает union: до неё нельзя читать data/error. Ошибка — обычный объект, не Error instance; она пригодна для передачи через границу сервера при условии JSON-совместимых data/meta. `E` позволяет явно задать собственный тип ошибки, но shared-конструкторы используют AppError. В React-компонентах и чистых форматтерах сохраняется естественный return type (JSX/string); Result применяется к операциям, которые возвращают ошибку вызывающему коду.

```ts
import { err, ok } from "@/lib/errors";
import type { Result } from "@/types/shared";

/** Validate an example label using the shared outcome contract. */
function validateLabel(value: string): Result<string> {
  const label = value.trim();
  return label ? ok(label) : err("VALIDATION", "Введите название");
}

const result = validateLabel("Счёт");
if (result.ok) console.log(result.data);
else console.error(result.error.message);
```

`src/lib/errors.ts` предоставляет `ok(data)`, `err(code, message, meta?)`, `createError(code, message, meta?)` и `isNotFound(error: unknown)`. `createError` возвращает AppError, `err` — failed Result; отсутствующее meta не добавляется как undefined при exactOptionalPropertyTypes. `isNotFound` принимает AppError, failed Result или Prisma-подобную ошибку с code=P2025 и возвращает boolean. Он не импортирует Prisma, не распознаёт ошибки по тексту и не преобразует прочие сбои в NOT_FOUND. Имена `success` и `failure<T>` сохранены для существующих потребителей и используют те же конструкторы.

ErrorCode: VALIDATION, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, STORAGE, CONFIGURATION. Сбой внешней библиотеки перехватывается на границе инфраструктуры и превращается в безопасное сообщение; не передавать stack, пароли, SQL или необработанное исключение в meta. Helpers не выполняют автоматическую очистку произвольных metadata. HTTP-статус назначает route handler, UI показывает сообщение из Result.

### Пагинация, сортировка и фильтры

`PaginatedResponse<T> = { data: T[]; total: number; page: number; pageSize: number; totalPages: number }`. Page начинается с 1, pageSize положительный, total — число записей после фильтрации до пагинации; totalPages = ceil(total / pageSize), для пустого набора 0. Чтение может возвращать `Promise<Result<PaginatedResponse<T>>>`. Метаданные формирует сервис; shared-тип сам не проверяет их арифметику и не включает серверную пагинацию в существующий UI.

`SortConfig<TField extends string = string>` содержит field и direction: asc/desc. Несколько ключей передаются массивом с явным приоритетом. `FilterConfig<TField>` — union по operator: eq/ne принимают scalar string/number/boolean/null; contains/startsWith/endsWith — string; gt/gte/lt/lte — number или ISO string; in/notIn — массив scalar; isNull/isNotNull — без value. Пример: `SortConfig<"number" | "dueDate">`, `FilterConfig<"status" | "total">`. Даты передаются ISO-строками, точные Decimal — строками; числовое сравнение Decimal-строк нужно реализовать в БД, не лексикографически в JS. Публичный endpoint обязан валидировать вход Zod, whitelist полей/операторов и workspace. Эти типы не являются готовым Prisma where/orderBy.

### Утилиты и клиент БД

`src/lib/utils.ts` используется сервером и клиентом:

| API | Контракт |
| --- | --- |
| `cn(...inputs)` | clsx + tailwind-merge, условные классы и устранение Tailwind-конфликтов |
| `formatCurrency(amount, currency = "RUB")` | Целые минимальные единицы: safe integer number, bigint или целочисленная Decimal-строка. Количество знаков определяется валютой (RUB/USD 2, JPY 0, KWD 3). Вывод ru-RU без дробной части при целой сумме; разделение целой/дробной частей через BigInt исключает потерю точности. Пример: 12345 → 123,45 ₽. Некорректное значение/код валюты → «—» |
| `formatDate(date, format = "dd.MM.yyyy")` | ISO string, Date или epoch milliseconds; Unicode-токены date-fns, locale ru, **локальная зона среды выполнения**. Чистая дата разбирается как локальная календарная дата, timestamp — как момент времени. Неверная дата/формат → «—». Для SSR/client одного timestamp требуется согласованная timezone либо заранее отформатированный сервером текст |
| `generateId(prefix = "")` | crypto.randomUUID(), без prefix — UUID, с prefix — prefix_UUID. Prefix задаётся кодом, генерация выполняется в обработчике/сервисе, не при рендере. Требуется поддерживаемый Node.js или secure browser context; ID не заменяет токен сессии |
| `truncate(value, maxLength = 80, suffix = "…")` | Длина в графемах через Intl.Segmenter, суффикс входит в лимит. Не разрезает combining sequences или emoji; неположительный/нечисловой лимит → пустая строка |

Совместимые `money(amount, compact)` (RUB-копейки), `dateLabel(value)` (краткая дата в Europe/Moscow) и `initials` сохранены. Обычный money использует formatCurrency, compact сохраняет прежнее сокращение. Форматтеры — только отображение; «—» не заменяет валидацию денежного ввода. Сервисы документов и платежей используют общий generateId без изменения UUID-формата существующих идентификаторов.

`src/lib/db.ts` закрыт `server-only`. Единственный экспорт db берётся из `globalThis.prisma` либо создаётся через `new PrismaClient()`. В development клиент сохраняется в globalThis для hot reload; в production используется кеш модуля, без глобального сохранения нового клиента. Не вызывать disconnect после каждого запроса и не создавать PrismaClient внутри services/components. Новый singleton не устанавливает соединение до первого запроса; ошибки запросов обрабатывает repository, демофолбэка нет.

## DocType и домены

TASK-002 добавляет нормализованную схему всех модулей: Contact/Deal/Activity, Invoice/InvoiceItem/Payment, Product/Warehouse/StockItem/StockMovement, Employee/Leave, Project/Task. AUTH расширен полями UserRole/isActive, членством и структурированным AuditLog. Всего 21 модель и 13 enums. Полное описание связей, единиц измерения, FK и границ ответственности — [modules/database.md](modules/database.md).

Пять каталогов модулей имеют `types.ts`, `schema.ts`, `actions.ts`, `queries.ts`, `service.ts`, `config.ts`, `components/`. Общая модель `Document` хранит `domain`, `workspaceId`, `version`, временные метки и JSONB `data`. JSON-поля валидируются на чтении из PostgreSQL и на каждой записи. У каждого домена отдельный enum статусов и уточнения схемы; доменные типы выводятся через Zod.

Базовая форма документа содержит `title`, `subtitle`, `status`, `amount`, `quantity`, `email`, `date`, `progress`, `notes`. В разных DocType поля имеют доменные подписи. Такое ограниченное ядро позволяет переиспользовать форму и таблицу без дублирования CRUD. Это фиксированные схемы, не реализованный конструктор пользовательских объектов. При усложнении домена следует расширять его схему или выделять реляционные модели и сервисы, сохраняя контракты Result.

Деньги — целые копейки. UI принимает рубли и переводит их в копейки на границе формы. Переходный `DocumentPayment` сохраняет прежний PostgreSQL Int и лимит 20 млн ₽ за операцию; JSON-документы сохраняют текущий лимит суммы 10 млрд ₽. Новые денежные поля Contact-связанных сделок/счетов/товаров/проектов используют Prisma Decimal(20,0), тоже в минимальных единицах. Нормализованный Payment относится к Invoice и хранится отдельно от DocumentPayment. TaxRate — Decimal(5,2), количества — Decimal(20,3). Суммы новых типов нельзя без проверки диапазона преобразовывать в JS number; передавать в DTO строкой. Новые таблицы подготовлены, но UI и полноценные налоговые/бухгалтерские сервисы ещё не переведены на них.

## Хранение

- **PostgreSQL**: нормализованные модели TASK-002 и переходный Document-слой. `UserRole` отображается на старый enum `Role`, `AuditLog` — на таблицу `AuditEvent`, `DocumentPayment` — на старую `Payment`, а новый `Payment` — на `invoice_payments`. Начальная миграция сохранена; `20261018065839_init_all_modules` добавляет таблицы и поля без удаления старых данных. Миграция выполняется транзакционно, содержит 43 CHECK-ограничения и составные tenant-FK. Ссылка на исполнителя/владельца всегда проверяет Membership в том же workspace. Индексы и бизнес-идентификаторы ограничены tenant. Текущий repository использует `auditLog`/`documentPayment`, сохраняя контракт UI. Проверка версии через `updateMany/deleteMany` защищает текущие документы от параллельной записи.
- **Демо**: `ERP_DEMO_MODE=true`, общее пространство `demo-workspace`, явно отмеченные примеры. JSON в `.data/demo-workspace.json`. В одном Node.js-процессе операции сериализуются очередью `globalThis`; запись идёт во временный файл и атомарный rename. Файл проверяется схемой; повреждение не приводит к тихой потере или пересозданию данных. Несколько процессов и serverless для демохранилища не поддерживаются.
- **Без fallback**: выключенный деморежим всегда использует PostgreSQL. Сбой БД отображается ошибкой.

## Tenant isolation и RBAC

TASK-004 использует NextAuth v5 (`next-auth@5.0.0-beta.32`), Credentials provider и JWT strategy. `/api/auth/[...nextauth]` предоставляет GET/POST Auth.js; callback JWT записывает id, role, workspaceId и внутренний sessionId. Session callback передаёт user.id/user.role/workspaceId/workspaceName и expires, но не sessionId, хеш пароля или JWT. Module augmentation находится в `src/types/next-auth.d.ts` (JWT расширяет исходный `@auth/core/jwt`).

Credentials разбираются через Zod, пароль проверяется существующим scrypt с солью и constant-time сравнением; неизвестный email выполняет dummy scrypt. Provider возвращает User/null по контракту Auth.js, а бизнес-фасад и Server Actions — Result. Исключения библиотеки ловятся в auth-actions.ts. Email нормализуется, роль и workspace из формы/update payload не принимаются: вход выбирает первое активное Membership по workspaceId. User.role не предоставляет обхода Membership, в том числе для SUPER_ADMIN.

JWT зашифрован и защищён Auth.js в HttpOnly/SameSite=Lax cookie; на HTTPS используется Secure cookie с __Secure-prefix. Обязателен AUTH_SECRET (или совместимый NEXTAUTH_SECRET), AUTH_URL задаёт публичный origin с HTTPS для внешнего production. Ключ не генерируется автоматически и не попадает в NEXT_PUBLIC. Срок доступа — 12 часов: в Session хранится SHA-256 случайного registry ID, user/workspace и фиксированный expiresAt. Этот ID включён в защищённый JWT, сама таблица не содержит cookie. При каждом чтении JWT повторно проверяются registry, срок, User.isActive, Membership.isActive и текущая Membership.role. Поэтому смена роли/отзыв действуют на следующей серверной операции, даже если браузер ещё показывает прежние кнопки. Logout сначала удаляет точную запись registry, затем Auth.js очищает cookie; событие signOut также отзывает запись для стандартного Auth.js endpoint. Старые opaque erp_session cookie не принимаются: после обновления требуется новый вход. Старые строки Session не превращаются в JWT автоматически.

На сбое PostgreSQL JWT не получает права и session содержит authError; серверный Result возвращает STORAGE, UI hook блокирует действия. Отключённое членство даёт FORBIDDEN, отозванная/истёкшая сессия или неактивный User — UNAUTHORIZED. Ошибка инфраструктуры никогда не открывает демопространство. ERP_DEMO_MODE=true по-прежнему явно включает публичный учебный доступ: сервер и `/api/auth/session` возвращают одну synthetic ADMIN identity без БД; это отдельный режим, не доказательство реального входа.

### Матрица разрешений

Каноническая client-safe матрица — `src/lib/permissions.ts`, PERMISSIONS/hasPermission также экспортируются из `src/lib/auth.ts`. Клиент импортирует только permissions.ts, чтобы не включать Prisma/secret в bundle.

| Роль | canDelete | canExport | canManageUsers | canViewAll |
| --- | --- | --- | --- | --- |
| SUPER_ADMIN | Да | Да | Да | Да |
| ADMIN | Да | Да | Да | Да |
| MANAGER | Да* | Да | Нет | Да |
| AGENT | Нет | Нет | Нет | Да |
| READONLY | Нет | Нет | Нет | Да |

Матрица — явная стартовая политика, поскольку конкретные значения не были заданы TASK-004. canViewAll означает просмотр всех документов **текущего workspace**, доступ к которому уже проверен; не других tenants и не обход HR field-level policy. Все пять ролей сохраняют прежний доступ на чтение. AGENT создаёт/изменяет записи без удаления/экспорта; READONLY не выполняет мутации. * MANAGER дополнительно не удаляет HR-записи. Счета с платежами защищены при любой роли. hasPermission для неизвестной/отсутствующей роли возвращает false. canManageUsers — право для будущего управления участниками; сам экран/endpoint этой задачей не создаётся.

AuthSessionProvider оборачивает dashboard с проверенной сервером initial Session. `usePermissions()` использует useSession и возвращает role, can(permission), isAdmin и isLoading. При loading, unauthenticated или authError права закрыты. isAdmin истинен только для ADMIN/SUPER_ADMIN. Обновление сессии при фокусе и каждые 60 секунд подтягивает роль в UI; сервер не ждёт этого обновления. Рендеры таблиц, kanban, кнопок создания/удаления/экспорта и settings используют те же правила.

Сервис authorize защищает create/update/delete, repository проверяет canViewAll и workspace, экспортные Server Actions повторно проверяют canExport и читают данные только из своего workspace. getExportDocuments принимает domain/IDs, проверяет Zod и отклоняет недоступный ID; dashboard CSV формируется из свежих серверных нормализованных агрегатов. Скрытая кнопка не является защитой. Разрешение экспорта управляет предоставляемой функцией и endpoint; оно не мешает человеку вручную скопировать уже доступные для чтения данные. Управление Membership, invitations, переключение workspace и отдельные права payroll остаются следующими задачами.

## Events и UI

AuditLog (таблица AuditEvent для совместимости) — транзакционный журнал мутаций, не шина асинхронных обработчиков. Добавлены actorId → Membership, entityType/entityId, before/after и requestId. Текущий repository сохраняет actorId и идентификатор документа; UI по-прежнему получает компактный AuditEvent DTO. Dashboard и панель событий читают последние 50 записей; PostgreSQL сохраняет весь журнал. В демофайле журнал ограничен 50 событиями. Outbox, подписчики, гарантированная доставка и workflow engine остаются отдельным этапом.

Сборка UI основана на общих `src/components/ui/`, `blocks/`, `layout/`. ModuleWorkspace соединяет форму, таблицу и kanban. После успешной мутации UI обновляет запись и запрашивает новый серверный snapshot через `router.refresh()`. Финансовый dashboard TASK-012 агрегирует Invoice/Payment на сервере: отдельные валюты, шесть месяцев поступлений и текущие остатки/aging. Operational summaries пока считают активные записи прежнего Document-слоя. CSV содержит отображаемые/выбранные строки и защищён от formula injection.

Палитра только через CSS variables в `globals.css`; тёмная и светлая темы. Анимации входа у панелей, строк и UI primitives; `prefers-reduced-motion` отключает движение. Radix обеспечивает focus trap в модальных окнах. Мобильный sidebar открывается диалогом. Горизонтальная прокрутка ограничена таблицами и kanban.

## Layout Shell — TASK-005

AppShell использует общий `SidebarProvider` и `Sidebar` из `src/components/ui/sidebar.tsx`; отдельный механизм collapse не вводится. `app-sidebar.tsx` отображает одно меню на desktop и в мобильном Sheet. Навигация задаётся единожды в `navigation.ts`: Overview → Dashboard; Business → CRM/Finance/Inventory; Operations → HR/Projects; System → Settings. Эти же ссылки используются в Header breadcrumbs и глобальном поиске. Root активен только для `/`, модуль — для точного пути и вложенных сегментов. Query string не меняет текущий раздел.

Desktop Sidebar имеет ширину 248 px, compact — 80 px. Shared primitive анимирует ширину и flex-spacer CSS transition 200 ms; контент занимает оставшееся место без фиксированного left padding. Desktop начинается с общего Shadcn breakpoint 768 px. В compact links сохраняют aria-label и Tooltip. Пользовательский `sidebar_state` cookie содержит только boolean-предпочтение; dashboard layout читает его при SSR, чтобы сохранить вид после reload. Cookie не участвует в авторизации. Cmd/Ctrl+B переключает Sidebar через существующий provider.

Мобильное меню — Radix Sheet с focus trap, Escape/overlay и явной кнопкой закрытия. Переход по ссылке закрывает Sheet. После обычного закрытия фокус возвращается на Header trigger; при открытии нового диалога фокус остаётся в нём. При выходе на desktop мобильное меню закрывается. SidebarContent прокручивается внутри панели, поэтому группы и профиль доступны на низком экране.

Один active indicator расположен внутри navigation и перемещается CSS `transform` transition 180 ms. Его позиция измеряется по активной ссылке и пересчитывается ResizeObserver после изменения ширины/высоты. Цвет/фон активной строки и `aria-current=page` работают независимо от анимации. Для `/design-system` нет ложного активного пункта.

`(dashboard)/template.tsx` создаёт новый wrapper для route content с fade-in 150 ms. AppShell находится в persistent layout, поэтому Sidebar не перемонтируется при переходах. Поиск/query обновления не создают лишнюю route animation; входные анимации отдельных компонентов сохраняются. Все transitions и animations учитывают общий `prefers-reduced-motion` override.

Header содержит управление Sidebar, breadcrumbs, поиск Cmd/Ctrl+K, уведомления, профиль и переключатель next-themes. Для первого SSR/client render используется нейтральная иконка темы до mount, что исключает hydration mismatch. Header и Settings используют один `erp-theme`/класс `.dark`; после reload тема восстанавливается. Цвета берутся только из semantic CSS variables, Geist и существующие primitives сохраняются.

Общие entrance keyframes именуются `component-enter`, чтобы не конфликтовать с `enter` из tailwindcss-animate и сохранить slide у Sheet. `/favicon.ico` перенаправляется на существующий `/icon.svg`, поэтому запросы старых браузерных вкладок не дают лишний 404.

## Границы текущего шаблона

Нет production rate limiting входа, MFA, восстановления пароля, приглашений, редактирования ролей, переключения tenants, RLS, field-level RBAC, фоновой очистки сессий и резервного копирования. Operational summaries dashboard и прежние модульные экраны получают snapshot Document-слоя всего workspace; финансовый dashboard TASK-012 использует ограниченные SQL-агрегаты нормализованных Invoice/Payment. Таблица Contacts и отдельная воронка Deal используют серверную пагинацию нормализованных моделей; нужны перевод остальных экранов/данных, пагинация остальных модулей и SQL-агрегации. В TASK-002 миграция и ряд FK/CHECK проверены на живой локальной PostgreSQL 17. TASK-004 проверяет основные HTTP-сценарии Credentials/JWT и RBAC вручную; TASK-006 — CRM API, гонку одной версии и rollback аудита. Полная автоматическая проверка ролей, гонок и всех новых доменных сервисов остаётся CHECKPOINT. Не заявлять production readiness до его завершения.

## CRM Server API — TASK-006

Нормализованный поток: `crm/actions → crm/service → Prisma Contact/Deal/Activity`. `crm/access.ts` разрешает Auth.js через `getSession()` и проверяет live Membership/RBAC; workspace и actor берутся только из сессии. В явном деморежиме этот API возвращает CONFIGURATION и не подменяет PostgreSQL файлами.

Zod-схемы строгие: tenant/id/version/timestamps нельзя внедрить в DTO. Изменения и auditLog.create выполняются одной Serializable-транзакцией; обновление/удаление требует ожидаемую version. Ошибки драйвера преобразуются в Result, конфликты сериализации требуют повторного чтения. Сбой аудита откатывает мутацию. После успешного commit действия вызывают revalidatePath для `/crm` и `/`; сбой инвалидирования логируется, но не маскирует уже сохранённый результат.

`queries.ts` читает только текущий workspace. Страница и count согласованы через RepeatableRead; pageSize 1–100, сортировка по whitelist со стабильным id. Kanban возвращает шесть колонок с отдельной ограниченной страницей и total каждой. DTO сериализуют Decimal в точные строки копеек, timestamps в ISO, DATE в YYYY-MM-DD. Контракты и примеры — [modules/crm.md](modules/crm.md).

Экран сделок `/crm` продолжает использовать Document через явно названные `getDealDocuments/createDealDocument/updateDealDocument/deleteDealDocument`. Он не читает нормализованные Deal и не смешивает их со старой моделью. Contacts подключены отдельной страницей в TASK-007, нормализованная воронка — в TASK-008; перенос прежней таблицы сделок и существующих данных остаётся отдельной задачей.

## CRM Contacts Table — TASK-007

`/crm/contacts/page.tsx` — Server Component: вызывает tenant-scoped getContacts и передаёт Result первой страницы плюс фиксированное время рендера в ContactsTable. Страница `/crm` сохраняет существующие сделки; общие вкладки связывают два экрана. В деморежиме нормализованные контакты показывают состояние конфигурации, без подмены PostgreSQL.

Клиентская TanStack Table v8 использует getRowId=id, manualPagination/manualSorting/manualFiltering. Search debounce 300 ms; stage/sort/search сбрасывают страницу, выбор фильтров также сбрасывает selection. Выбор до 100 id/version сохраняется между страницами, checkbox заголовка действует только на текущую страницу. При загрузке показывается общий Skeleton; устаревшие асинхронные ответы игнорируются. Relative createdAt получает initialNow с сервера, затем обновляется раз в минуту, чтобы не нарушать гидратацию.

ContactTableRow расширяет Contact безопасным owner summary (id/name/avatar), Prisma include не раскрывает пароль или Membership. getContactAssignees ищет до 50 активных участников своего workspace. Массовые deleteContacts/updateContactsAssignee проверяют все версии/ссылки и выполняют весь набор с audit в одной Serializable-транзакции. При любом конфликте нет частичного успеха; endpoint ограничен 100 разными id. Экспорт getContactsForExport повторно проверяет canExport (MANAGER/ADMIN/SUPER_ADMIN), читает выбранные записи либо полный фильтр с лимитом 5000, без тихого обрезания. CSV использует общий downloadCsv с escaping/BOM и защитой от formula prefixes, включая префиксы после пробельных символов.

## CRM Deal Pipeline — TASK-008

`/crm/pipeline/page.tsx` передаёт initialData из getDealsByStage и initialNow в DealKanban. Общая навигация CRM содержит Contacts, Pipeline и прежний Document Deals; существующие данные не копируются. Query возвращает PipelineDeal: базовый Deal плюс безопасный owner id/name/avatar и одну последнюю связанную Activity (id/subject/type/createdAt). Вложенное чтение Activity явно ограничено workspace. Все даты/Decimal сериализованы; мутации по-прежнему используют базовые audit snapshots.

DealKanban использует @dnd-kit/core DndContext, шесть KanbanColumn с SortableContext, DealCard с useSortable и отдельный DragOverlay без повторной регистрации draggable. Колонка остаётся droppable даже без карточек. Drop меняет этап; порядок внутри этапа задаёт updatedAt desc/id asc, ручной порядок не сохраняется. Пагинация независима для каждой колонки, по 20 сделок, чтобы не скрывать данные за ограниченной начальной выборкой. Успешный перенос перечитывает первые страницы для согласованных counts и показа свежей сделки в начале этапа.

PointerSensor поддерживает мышь/касание с handle touch-action:none; KeyboardSensor выбирает соседние колонки стрелками, включая пустые. Есть native stage select, aria-live и локализованные DnD announcements. Drop вне видимой области доски/Escape не выполняет мутацию. Авторизация на клиенте ограничивает affordances, updateDealStage заново проверяет серверную сессию, workspace, версию и audit.

Перенос немедленно обновляет карточку/счётчики и вызывает updateDealStage(id,version,stage). Только одна операция in flight: snapshot rollback не может затереть другое локальное сохранение. Ошибка Result откатывает весь snapshot; неизвестный результат сети требует обновления. После подтверждённого commit ошибки последующего чтения не откатывают сохранённый этап. До успешного обновления дальнейшие записи блокируются. UI показывает pending/error/retry/empty и route skeleton. Вероятности NEW/QUALIFIED/PROPOSAL/NEGOTIATION/WON/LOST = 10/25/50/75/100/0%; это явная стадийная оценка, не новое поле БД и не индивидуальный прогноз.

## CRM Contact Detail — TASK-009

`/crm/contacts/[id]` — отдельная Server Component страница с initial ContactDetail, timeline и связанной страницей сделок. Контакт проверяется по workspace/id до чтения дочерних записей. Timeline включает Activity с contactId контакта и legacy deal-only Activity с contactId=null, если Deal принадлежит контакту; каждый запрос ограничен workspace. Чтения/count выполняются в RepeatableRead; feed имеет фильтр type и bounded pagination. Activity.assignedTo показывается как ответственный, не выдаётся за автора.

Contact получает сохраняемый String[] tags с default []; миграция добавляет поле без удаления данных. Zod ограничивает 20 тегами по 1–32 символа, без дублей без учёта регистра; updateContact сохраняет tags вместе с version increment и audit. Изменения контакта, назначение, tags и stage используют существующий сервис; новые Activity — createActivity. Для detail route добавлен revalidatePath('/crm/contacts/[id]', 'page'). UI использует RHF/Zod и общие primitives; неизвестный результат записи требует refresh, подтверждённая запись не маскируется ошибкой последующего чтения.

## CRM Contact Forms — TASK-010

ContactFormSheet переиспользуется для создания/редактирования из таблицы и редактирования из detail. Основан на shared Sheet/Radix с modal=false: без overlay, блокировки scroll, aria-hidden фона и focus trap. Взаимодействие с таблицей не закрывает панель и сохраняет draft; параллельные bulk/вторая форма недоступны. На узком экране панель занимает всю ширину, поля прокручиваются отдельно от footer. Shared Sheet получил только необязательный closeDisabled; обычные modal Sheet/sidebar сохраняют прежнее поведение.

ContactFormSchema — pick общих контактных полей плюс stage из contactSchema. RHF mode/reValidateMode=onBlur показывают inline ошибки до submit; финальный submit также проверяет всю форму. Cmd/Ctrl+Enter действует внутри формы, Escape закрывает, пока запрос не выполняется. Фокус при открытии — имя, при закрытии — opener. Sonner toast.success подтверждает commit, toast.error сообщает invalid/result/network error. Snapshot id/version при открытии не заменяется свежей версией из фонового чтения: конфликт не превращается в тихое перезаписывание. Unknown result блокирует повтор до закрытия/refresh, без автоповтора создания.

### Inventory overview — TASK-017

`/inventory/dashboard`: глобальные KPI активных Product и таблица пополнения. Повторно используется tenant-scoped SQL CTE каталога/alert; KPI и список загружаются параллельно. Сумма stock × salePrice округляется по SKU до копеек и возвращается точными строками отдельно по каждой валюте. Low count исключает нули, out count включает нули, список содержит оба статуса. Поиск/статус/страницы не ограничивают KPI. Изменений схемы нет; shared InventoryNavigation связывает overview, каталог и склады.


## Localization — English / Русский

UI использует next-intl без языковых префиксов URL. `src/i18n/request.ts` читает проверенную cookie `evo_locale`; по умолчанию `en`, поддерживается `ru`. `useI18n`/`getI18n` связывают каталог с конкретным запросом, без глобального изменяемого языка. Settings сохраняет личный выбор браузера через авторизованный Server Action и перезагружает интерфейс целиком.

Каталоги `src/i18n/en.json` и `ru.json` содержат системные подписи и сообщения. Интерполяции передаются отдельно через tagged templates, пользовательские поля не переводятся. Enum/status/ключи БД сохраняются. Ошибки Result локализуются на Server Action/API границе; успешные бизнес-данные не изменяются. Форматтеры дат, валют, количеств, графиков и PDF принимают locale явно. CSV переводит заголовки и системные значения, сохраняя точные числовые ячейки. Подробнее: [LOCALIZATION.md](LOCALIZATION.md).
