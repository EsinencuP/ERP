# TASK-012 — Finance Payments + Dashboard KPIs

Статус: закрыт 18 октября 2026.

Dashboard `/` переведён на нормализованные Invoice/Payment. KPI row: **Total Revenue | Outstanding | Paid MTD | Overdue**. Recharts 2.15.4: LineChart за последние шесть календарных месяцев, PieChart/Pie с innerRadius для invoice status donut, BarChart layout=vertical для top-5 клиентов. Добавлены AR aging и последние счета со ссылками на карточки. Переключатель RUB/USD/EUR не смешивает валюты.

## Значения показателей

- Total Revenue: все полученные платежи по выданным счетам, включая налог.
- Outstanding: положительные остатки выданных счетов после оплат, без DRAFT/CANCELLED.
- Paid MTD: поступления с начала текущего UTC-месяца по receivedAt, включая частичную оплату старых счетов.
- Overdue: часть Outstanding со сроком раньше текущего UTC-дня.
- Aging: в срок (включая сегодня/будущий dueDate), 1–30, 31–60, 61–90, более 90 дней. Сумма buckets совпадает с Outstanding при отсутствии конкурентной записи.
- Revenue chart: шесть UTC-месяцев, включая текущий, с нулевыми значениями для пустых месяцев. Top-5: суммы поступлений за всё время, группировка по contact id и стабильная сортировка. Donut: количество счетов каждого effective status; частично оплаченные остаются SENT/OVERDUE.

Четыре агрегирующих параметризованных SQL-запроса запускаются **Promise.all** через пул соединений: status/AR buckets, receipts/months, top clients, recent invoices. Root Page параллельно запрашивает operational state и finance. Одна общая asOf задаёт cutoff платежей и календарные границы; глобального транзакционного snapshot между параллельными statements нет. Refresh перечитывает весь набор. В браузер передаются ограниченные агрегаты, а не весь финансовый реестр.

Деньги сохраняются как Decimal-копейки и передаются точными строками. Геометрия графиков использует bounded ratio 0–100: произвольная денежная сумма не превращается в Number. KPI, tooltip, доступные data tables и CSV сохраняют точные значения даже выше Number.MAX_SAFE_INTEGER. Цвета — общие CSS tokens, статусы badge/donut согласованы. LineChart поддерживает клавиатурные стрелки; остальные графики имеют текстовые данные. Учитывается reduced motion.

## Реестр и запись платежей

`/finance/payments` добавлен в FinanceNavigation. Поиск по счёту/контакту/reference, валюта, способ, inclusive UTC date range, серверная пагинация и стабильная сортировка receivedAt/id. Page/count выполняются Promise.all; DTO содержит точную сумму/валюту, snapshot клиента, ссылку на invoice, reference/notes и безопасное имя зарегистрировавшего участника.

«Записать оплату» открывает поиск отправленных/просроченных счетов (два bounded запроса через Promise.all), затем существующий InvoicePaymentDialog. Сохранение переиспользует createInvoicePayment: live session/workspace, RBAC, version, остаток, уникальный reference, audit и статус остаются в одной транзакции. После успеха обновляются реестр, invoice и dashboard; неизвестный результат сети блокирует повтор и требует перечитывания. READONLY не получает кнопку записи, а crafted mutation отклоняется сервером.

Кнопка CSV-отчёта сохранена и переведена на свежие нормализованные агрегаты через getFinanceExport. Сервер проверяет canExport; суммы в основных единицах формируются точной строкой, общий downloadCsv сохраняет BOM/escaping/formula-prefix protection.

## Проверки

- Финальные `npm run build`, `npm run typecheck -- --noUnusedLocals --noUnusedParameters`, `git diff --check` успешны. Новых зависимостей и миграций TASK-012 нет. Тестовые файлы вне CHECKPOINT не создавались.
- Одноразовые HTTP/SQL проверки на локальной PostgreSQL 17.10 через реальные Auth.js/Server Actions: KPI/месяцы/status counts/top-5, RUB/USD/EUR, empty tenant, чужой workspace, invalid currency/range, READONLY и отсутствие входа.
- Aging проверен на dueDate сегодня, будущем сроке и границах 1/30/31/60/61/90/91 дней; partial payment уменьшает нужный bucket. Платёж за пределами шести месяцев входит в Total Revenue и top clients, но не в line chart.
- Сумма `9007199254740993` коп. сохранена точно; EUR KPI отображает `90 071 992 547 409,93 €`, CSV возвращает `90071992547409.93`. Проверена bounded projection до 20 цифр и нулевые значения.
- Реестр: фильтры валюты/способа/search/reference, UTC from/to, invalid range, пустой результат, страницы по 3 записи без пересечения, tenant isolation. Клиентский поиск/empty/error recovery осмотрены.
- В браузере из реестра записан платёж **20,05 ₽**: в PostgreSQL ровно **2005 коп.**, одна запись Payment, одна запись audit, invoice.version 1→2. Возврат на dashboard дал ожидаемые KPI:

| Показатель, коп. | До | После |
| --- | ---: | ---: |
| Total Revenue | 217500 | 219505 |
| Outstanding | 114500 | 112495 |
| Paid MTD | 62500 | 64505 |
| Overdue | 95500 | 93495 |

- CSV скачан кнопкой как `evo-finance-RUB.csv`; direct READONLY/AGENT export → FORBIDDEN. READONLY видит KPI/реестр без возможности записать платёж.
- Desktop 1440 px в dark/light; mobile 390×844: document width = 390 на dashboard, платежах и при большой EUR-сумме. Все три графика имеют ненулевые размеры; таблицы прокручиваются внутри контейнеров. Проверены LineChart keyboard tooltip, reduced motion и свежие нормальные переходы без console errors/warnings.
- При остановленной PostgreSQL getFinanceDashboard/getPayments вернули STORAGE без data. Refresh убрал прежние KPI и показал ошибку PostgreSQL, без нулевого/демо-фолбэка.

Собственные fixture records текущей проверки удалены (3 workspace, 5 пользователей, 22 счёта и 12 платежей); ранее существовавшие записи сохранены. Проверочные Next server/PostgreSQL остановлены. Production, deployment и Git commits не выполнялись.

Скриншоты: [dashboard dark](screenshots/task-012-dashboard-dark.png), [dashboard light](screenshots/task-012-dashboard-light.png), [dashboard mobile](screenshots/task-012-dashboard-mobile.png), [empty](screenshots/task-012-dashboard-empty.png), [payments dark](screenshots/task-012-payments-dark.png), [payments light](screenshots/task-012-payments-light.png), [payments mobile](screenshots/task-012-payments-mobile.png).

Границы: это аналитика поступлений и дебиторки, не бухгалтерский ledger/налоговый учёт. Возвраты и курсовая конвертация не добавлены. CRM/project operational summaries пока используют прежние Document-данные. Старый финансовый Document-реестр доступен отдельно и не участвует в новых финансовых KPI.
