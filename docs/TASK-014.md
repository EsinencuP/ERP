# TASK-014 — Finance P&L Reports

Статус: закрыт 19 октября 2026.

Добавлен `/finance/reports` с Revenue, Expenses, Net Profit и разбивкой расходов по восьми ExpenseCategory. Периоды **This Month / Quarter / Year / Custom**, отдельный выбор RUB/USD/EUR, явное применение фильтров и обновление. В FinanceNavigation добавлен «P&L отчёт».

## Метод расчёта

Revenue — сумма полных Invoice.total с налогом, когда платежи покрыли total. Период определяется по московской календарной дате окончательной оплаты (последний receivedAt). Этот вариант был указан как рабочее предположение в вопросе о дате признания дохода; отдельного ответа не поступило. Частичные оплаты, DRAFT/CANCELLED, нулевые счета и платежи после текущего asOf исключены. Достаточность оплаты определяется фактическими платежами, независимо от устаревшего stored status.

Expenses — сумма Expense.amount по Expense.date в выбранном inclusive диапазоне. Net Profit = Revenue − Expenses, включая отрицательные значения. Периоды — полный календарный месяц/квартал/год Europe/Moscow; Custom допускает любой валидный диапазон from ≤ to. Expense.DATE не смещается. Валюты не конвертируются и не суммируются.

Revenue и расходы агрегируются одним параметризованным SQL statement с общим PostgreSQL snapshot. Деньги остаются numeric/Decimal, сериализуются точными строками; итог и категории складываются/вычитаются через BigInt. Произвольные денежные значения не переводятся в Number. Запросы всегда ограничены live workspace. Новой схемы/миграций/зависимостей нет.

Dashboard TASK-012 продолжает показывать все поступления, включая частичные. Новый P&L следует запросу пользователя о paid invoices; бухгалтерский accrual ledger, налоговые корректировки и возвраты не добавлялись.

## CSV API и права

`GET /api/reports/export?type=pnl&from=2026-10-01&to=2026-10-31&currency=RUB`

Currency необязательна, по умолчанию RUB. Endpoint повторно проверяет session/Membership/workspace и canExport (MANAGER+), затем пересчитывает тот же P&L. UI чтение доступно всем активным ролям, READONLY/AGENT не получают кнопку CSV. Unknown и duplicate query keys, неизвестный type, некорректные даты/диапазон/валюта отклоняются. Ошибки возвращают Result JSON с 400/401/403/503.

Ответ CSV — attachment, UTF-8 BOM, `;`, CRLF, quoted escaping, защита spreadsheet formulas; `private, no-store` и `nosniff`. Включает from/to, timezone/currency/asOf, метод Revenue, три точных итога и категории/количества. Общая serializeCsv вынесена из downloadCsv с сохранением прежней защиты. Signed formatting корректно обрабатывает отрицательные доли единицы; отрицательные CSV-ячейки безопасно префиксуются апострофом.

Draft фильтры отделены от применённого отчёта: фактический период отображается над показателями, CSV блокируется до применения изменений. Скачивание делает свежий запрос и показывает ошибки через Sonner. Loading/empty/error явные; отказ PostgreSQL убирает прежние итоги без демо/нулевого fallback.

## Проверки

- Production `npm run build`, строгий `npm run typecheck -- --noUnusedLocals --noUnusedParameters`, `git diff --check` успешны. Тестовые файлы вне CHECKPOINT не создавались.
- Одноразовые HTTP/SQL проверки на изолированной PostgreSQL 17.10 через реальные Auth.js/Server Actions/API: формула, восемь категорий, количества, валюты, empty workspace, чтение всех ролей, tenant isolation, запрет без входа и строгая валидация.
- Счёт, выставленный в сентябре и оплаченный частями в сентябре/октябре, входит полной суммой в октябрь. Проверены Moscow start/end границы с точностью до миллисекунды, исключение оплаты после верхней даты и будущего receivedAt.
- Полная фактическая оплата при stored SENT включается; stored PAID с неполной фактической оплатой исключается, как и DRAFT/CANCELLED. Для 1–10 октября fixture: Revenue **60000**, Expenses **37200**, Net Profit **22800** коп., 3 счёта / 10 расходов; за весь октябрь **100000 − 37600 = 62400** коп.
- EUR: Revenue `9007199254740993`, Expenses `9007199254741044`, Net Profit `-51` коп. UI показывает точные большие суммы и **−0,51 €**; CSV — `90071992547409.93`, `90071992547410.44`, `'-0.51`.
- Presets проверены на переходе месяца/квартала/года в Москве и феврале високосного года. Точные signed amounts `-51`, `-101`, `0`, большие положительные значения и CSV quoting/formula protection проверены отдельно.
- CSV: BOM/headers/filename, default RUB, manager/admin access, reader/agent 403, unauthenticated 401, invalid/unknown/duplicate query 400. Снижение роли MANAGER → READONLY блокирует экспорт старой сессии. Создание Expense через обычный audited action немедленно отражается в новом CSV; запись затем удалена обычным action.
- Браузер: все четыре периода, Custom validation/Enter submit, dirty/export guard, смена валюты, реальное скачивание CSV, READONLY/AGENT без экспорта, empty tenant. Обе темы desktop 1440 px визуально осмотрены; mobile 390×844 с большими EUR-значениями: document width = 390, таблица прокручивается внутри контейнера. Свежая консоль обычных переходов без ошибок и предупреждений.
- При остановленной PostgreSQL Refresh убирает KPI и показывает ошибку; export disabled. CSV API возвращает 503/STORAGE без data, без демофолбэка.

Удалены только собственные fixtures: 2 workspace, 5 пользователей/Membership, 11 invoices, 12 payments, 14 expenses, 1 contact, 10 sessions и 2 audit events. Предыдущие записи сохранены. Проверочные Next server/PostgreSQL остановлены; production, deployment и commits не выполнялись.

Скриншоты: [light](screenshots/task-014-pnl-light.png), [dark](screenshots/task-014-pnl-dark.png), [mobile / большой EUR и убыток](screenshots/task-014-pnl-mobile.png), [empty](screenshots/task-014-pnl-empty.png).

**CHECKPOINT-03** остаётся будущим этапом после завершения TASK-011–TASK-017 включительно; этим отчётом не объявляется пройденным.
