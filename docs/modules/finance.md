# Финансы

## P&L Reports — TASK-014

`/finance/reports`: Revenue (полные суммы оплаченных счетов с налогом) − Expenses = Net Profit. Revenue признаётся по московской дате последнего платежа после достижения суммы total; частичные оплаты и DRAFT/CANCELLED не входят. Достаточность оплаты вычисляется по платежам до текущего asOf, а не только сохранённому status. Expenses отбираются по календарной Expense.date. Валюты RUB/USD/EUR не смешиваются. Это отдельная модель от Total Revenue dashboard, куда входят все поступления, в том числе частичные.

This Month/Quarter/Year задают полный календарный месяц/квартал/год Europe/Moscow; Custom — произвольные inclusive from/to. Фильтры применяются явно; отображается фактический период отчёта, при изменении draft CSV блокируется. Revenue/Expenses/Net Profit и восемь категорий расходов представлены точными суммами строк/BigInt. Один SQL-запрос агрегирует обе части на общем snapshot. Ошибка PostgreSQL показывает error state без старых KPI/демоданных; успешное отсутствие записей — явный empty state с нулевыми итогами.

`GET /api/reports/export?type=pnl&from=2026-10-01&to=2026-10-31&currency=RUB` — свежий CSV с периодом, валютой, методом Revenue, итогами/количествами и категориями. Currency optional (RUB). Только live canExport (MANAGER+); чтение UI доступно всем активным ролям workspace. Строгие даты/порядок, unknown/duplicate keys отклоняются; Result JSON 400/401/403/503. Attachment, private no-store/nosniff, UTF-8 BOM, разделитель `;`, quoted escaping и защита spreadsheet formulas. Отрицательный Net Profit сохраняет точный знак, CSV безопасно префиксует отрицательную ячейку апострофом. Моделей/миграций/файлов тестов TASK-014 не добавляет.

## Прежний реестр /finance/documents

Ниже описан сохранённый UI на Document/DocumentPayment. Основной маршрут /finance использует нормализованные счета TASK-011, описанные далее. TASK-002 отдельно добавляет нормализованные Invoice/InvoiceItem/Payment, налоговые поля и уникальный номер внутри workspace: [database.md](database.md). Эти модели не подменяют текущие JSON-документы автоматически.

DocType `Invoice`: `title` — номер счёта, `subtitle` — клиент, `amount` — итог в копейках, `date` — оплатить до, `notes` — назначение. В прежнем реестре номер вводится вручную; автоматическая нумерация действует в новом /finance.

Статусы: Черновик → Отправлен → Частично оплачен → Оплачен. Создание допускает только первые два. `createPayment` принимает положительную сумму в копейках и UUID-reference. Сервис запрещает оплату черновика, переплату, повтор reference и stale version. Поступление, смена статуса и audit event сохраняются атомарно. Статус определяется суммой поступлений.

После поступления нельзя изменить сумму, клиента и статус; удаление такого счёта запрещено. Номер, назначение и срок можно уточнить. Поступления показываются в прежней форме оплаты для неоплаченного остатка; новые финансовые KPI TASK-012 их не учитывают. Полный реестр этих legacy-поступлений и возвраты остаются отдельными задачами; `/finance/payments` относится к нормализованным Payment.

Совместимые actions: `getInvoiceDocuments`, `createInvoiceDocument`, `updateInvoiceDocument`, `deleteInvoiceDocument`, `createPayment`. Валюта — RUB, значения целочисленные. Лимит одного платежа 20 млн ₽; итог документа до 10 млрд ₽. Этот прежний реестр не поддерживает строки и налоги. Проводки, банковская интеграция и кредит-ноты не реализованы ни в одном реестре.


## Нормализованные счета — TASK-011

`/finance` использует Invoice/InvoiceItem/Payment; прежние Document и DocumentPayment сохранены в `/finance/documents`. Данные автоматически не копируются. Нормализованные actions: getInvoices/getInvoice/createInvoice/updateInvoice/deleteInvoice/updateInvoiceStatus/createInvoicePayment. Старые create/update/deleteInvoiceDocument явно подключены к прежнему ModuleWorkspace. Финансовые dashboard aggregates переведены на Invoice/Payment в TASK-012.

Счёт создаётся DRAFT с номером INV-YYYY-NNNN по году issueDate. generateId форматирует номер из серверного InvoiceSequence; UUID-режим общих идентификаторов сохранён. Counter хранится по workspace/year, increment/create/items/audit выполняются в одной Serializable-транзакции. Удаление черновика не освобождает номер, смена года существующего номера запрещена; миграция инициализирует counters по существующим стандартным номерам. Ошибка audit откатывает и номер, и строки. Только P2034 (гарантированный rollback) допускает максимум три попытки транзакции.

Описание строки — 1–1000 символов, quantity положительное с 3 знаками, unitPrice — неотрицательные целые копейки. До 100 строк. Для qty×price используется BigInt/half-up до копейки; subtotal — сумма округлённых строк, taxAmount — half-up subtotal×taxRate/100, total=subtotal+taxAmount. Налог 0–100%, 2 знака, итог положителен и помещается в Decimal(20,0). Клиент не присылает доверенные totals/number/status. UI принимает цены в основных единицах RUB/USD/EUR с точностью 2 знака, переводит в точные строки копеек и показывает тот же preview; сервер считает заново.

Invoice.version защищает весь aggregate. Draft update заменяет строки одной транзакцией (у новых строк новые id); вложенный Prisma create наследует workspace из составного FK Invoice. После SENT поля и строки неизменны. DRAFT → SENT/CANCELLED, неоплаченный SENT → CANCELLED. Отмена конечная; удаляются только DRAFT без платежей и только canDelete. SENT отмечает выдачу, не отправляет email. OVERDUE вычисляется при чтении по UTC календарной дате и отражается в фильтре, без скрытого update/audit при GET. Старый enum PARTIALLY_PAID сохраняется для совместимости, новые частичные платежи оставляют SENT либо effective OVERDUE. PAID устанавливается только после полного покрытия остатка Payment.

Платёж имеет точную сумму, способ и уникальный workspace/reference; переплата и дубликат откатываются. Invoice.version, Payment и audit записываются атомарно. UI блокирует повтор при неизвестном результате сети, предлагает refresh и показывает историю. Возвраты/перепроводка/бухгалтерский ledger не входят в задачу.

Customer snapshot (name/company/email/address) и issuerName фиксируются в Invoice при создании/редактировании draft. Последующие изменения Contact не переписывают выданный PDF. Для старых счетов без snapshot используется текущая связь. Отдельных юридических реквизитов/банковских счетов шаблон не выдумывает.

PDF: GET `/api/finance/invoices/[id]/pdf`, Node runtime, повторная серверная tenant/auth/canExport проверка (MANAGER+); READONLY/AGENT 403, чужой ID 404. @react-pdf/renderer использует локальный Geist-Regular.ttf с кириллицей и OFL; цвета разрешаются из CSS variables `:root`, внешние запросы во время PDF не требуются. PDF возвращается attachment/private/no-store. Шрифт и globals.css включены в tracing для Vercel. Пагинация A4, неделимые ограниченные строки (длинное описание продолжается отдельными частями без повторения сумм), fixed footer page/total, точные суммы, клиент/issuer/даты/строки/налог/оплата/комментарий. PDF не является отправкой письма или банковским переводом.

Форма — non-modal Sheet, RHF/Zod onBlur, inline строки add/remove, Ctrl/Cmd+Enter и Escape, точные вычисляемые суммы и Sonner. ID/version фиксируются при открытии; серверная валидация, RBAC, isolation/audit обязательны. Empty/configuration/error/loading/retry сохраняют Result и не подменяют PostgreSQL демоданными.


## Payments и Dashboard — TASK-012

Доступны getPayments(filters), getPayableInvoices(search), getFinanceDashboard(currency). Каждый entry point заново получает live session и workspace, отклоняет explicit demo для нормализованных финансов и возвращает Result. Input workspace/role не принимаются. Неверная валюта/диапазон дат возвращает VALIDATION.

`/finance/payments`: поиск по номеру счёта, текущему имени/компании контакта или payment reference, currency/method, inclusive UTC from/to; pageSize 1–100, сортировка receivedAt desc/id desc. DTO включает точную amount, валюту счёта, клиентский snapshot, безопасное имя зарегистрировавшего участника и ссылку на invoice. Page/count запускаются Promise.all; при одновременной записи возможен краткий сдвиг счётчика до refresh. Запись оплаты использует прежние ограничения переплаты, уникального reference, версии и атомарного аудита; неизвестный результат сети запрещает повтор до перечитывания.

Dashboard на `/`: Total Revenue (поступления за всё время), Outstanding (остаток выданных счетов), Paid MTD (поступления с начала UTC-месяца), Overdue (часть остатка со сроком раньше текущего UTC-дня). Поступления включают налог. Revenue line содержит последние шесть UTC calendar months, включая текущий, с нулями в пустых месяцах. Donut показывает количество счетов каждого effective status, включая DRAFT/CANCELLED; частично оплаченный — SENT или OVERDUE. Top 5 — клиенты по сумме полученных оплат за всё время, tie-break по contact id. Остатки распределены по dueDate в current/1–30/31–60/61–90/90+; сумма buckets = Outstanding при отсутствии конкурентного изменения.

Все показатели рассчитываются отдельно для RUB/USD/EUR. Четыре агрегирующих SQL-запроса выполняются параллельно через Promise.all с общим asOf; никакого переноса всего invoice/payment реестра в браузер. Период receivedAt ограничен asOf. Одного глобального database snapshot между параллельными statements нет; обновление перечитывает весь набор. Суммы остаются Decimal→string→BigInt; числовая шкала графиков — только bounded ratio, точные значения доступны в tooltip и раскрываемых таблицах. В нулевом workspace — нулевые KPI/месяцы и пустые charts; ошибка БД остаётся ошибкой, без нулевого или демо-фолбэка.

CSV-отчёт dashboard сохранён через getFinanceExport(currency): сервер повторно проверяет canExport и читает свежие нормализованные KPI/графики; суммы сериализуются точной десятичной строкой основных единиц без Number. На клиенте общий downloadCsv добавляет BOM/escaping и нейтрализует formula prefixes. READONLY/AGENT не могут экспортировать прямым вызовом action.


## Expenses — TASK-013

`/finance/expenses` — отдельный реестр Expense, не Document и не Payment. Поля: title 1–200, amount положительные целые копейки до 20 цифр, currency RUB/USD/EUR, category ExpenseCategory, calendar date 0001–9999, receipt до 2048 символов, notes до 10000. Категории: OFFICE/Офис, SOFTWARE/ПО и подписки, TRAVEL/Командировки, MARKETING/Маркетинг, EQUIPMENT/Оборудование, RENT/Аренда, UTILITIES/Коммунальные услуги, OTHER/Прочее.

Actions: getExpenses/getExpense/createExpense/updateExpense/deleteExpense. Workspace/creator/id/version/timestamps задаются сервером; создание возвращает version=1, update increment и delete проверяют текущую version. CREATE/UPDATE — все роли кроме READONLY, DELETE — canDelete. Мутация и audit с entityType=Expense атомарны. Общий withFinanceMutation сохраняет прежнюю политику Invoice транзакций. Неверный input, чужой ID, stale version и сбой PostgreSQL возвращают Result; демофолбэка нет.

Серверная таблица поддерживает category/currency/search и bounded pagination, date desc/createdAt desc/id asc. Page/count читаются Promise.all; при конкурентной записи возможен краткий сдвиг count до refresh. Формы принимают основные единицы с точностью 2 знака и точно переводят в копейки существующим BigInt helper. Detail доступен READONLY и показывает весь комментарий. Пустые receipt/notes сохраняются как null.

Receipt в этой задаче — ссылка http(s) на чек, без URL credentials; scheme/URL/длина проверяются Zod и повторно перед рендером href. Сервер не делает запрос по receipt, browser открывает его только по клику в новой вкладке с noopener/noreferrer. Это не upload или хранилище файлов. Платежи и Revenue KPI TASK-012 отражают поступления; расходы их не уменьшают.

TASK-022: Expense получает optional projectId для Budget usage Projects Overview. Форма использует shared RecordPicker, backend проверяет workspace проекта; link nullable, budget рассчитывается отдельно по валютам без FX. Старый API update без projectId сохраняет ссылку, explicit empty снимает её. `/finance/expenses?projectId=…` фильтрует расходы проекта и предвыбирает его в create form; вся P&L-логика остаётся прежней.


## Main Dashboard — TASK-023

Главный `/` выводит Revenue/6-month receipts/recent five invoices с выбором currency через Server Component. Полный FinanceDashboard TASK-012 (четыре финансовых KPI, status donut, top clients, aging и CSV) перенесён в `/finance/dashboard`, доступен вкладкой «Обзор». RevenueChart/RecentInvoices общие для обоих экранов, правила сумм/UTC/валют сохранены.
