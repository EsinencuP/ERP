# TASK-023 — Main Dashboard KPIs + Charts + Activity

19–20 октября 2026. Выполнено.

## Результат

Главная `/` использует нормализованные модели Finance, CRM, Inventory и HR. Первый ряд — Revenue | Open Deals | Low Stock Alert | HR Pending. Второй — LineChart поступлений за шесть месяцев и BarChart количества сделок по стадиям. Третий — пять последних счетов и восемь последних событий аудита. Баннер пополнения отображается при наличии active low_stock товаров.

Revenue — зарегистрированные поступления включая налог за всё время в выбранной RUB/USD/EUR. График включает текущий и пять предыдущих месяцев UTC; ранние поступления входят только в общий KPI. Статусы/остатки последних счетов вычисляет существующий Finance API по оплатам и сроку. Валюты не складываются; суммы остаются строками целых копеек, график использует общий bounded BigInt projection. Shared RevenueChart и RecentInvoices извлечены из Finance, без копии расчётов.

Open Deals — все NEW/QUALIFIED/PROPOSAL/NEGOTIATION; WON/LOST исключены из KPI, но показаны в диаграмме всех шести стадий. Суммы сделок и валюты не влияют на count. Складской KPI использует общий getInventoryStockAlert: active low_stock + out_of_stock по сумме всех складов, включая неактивные склады. Баннер появляется именно при low_stock > 0. HR Pending сохраняет действующую политику согласования: число доступно MANAGER/ADMIN/SUPER_ADMIN, READONLY/AGENT видят «— / Доступно руководителям».

Activity Feed читает AuditEvent, ограничивает выборку workspace и восемью строками, сортирует createdAt desc/id desc. Показывает автора, действие, запись, модуль и относительное время с точным timestamp. Удалённые записи ведут в модуль; неизвестные домены не создают ссылок. В общем shell дополнительно устранена сериализация before/after/прочих служебных полей через spread: наружу передаются только поля AuditEvent summary.

Server Component после live auth и Zod-валидации currency запускает пять источников одним Promise.all. Для Prisma reads установлен noStore, route — force-dynamic/force-no-store. Legacy Document не является источником KPI. Shared shell сохраняет прежний реестр для своих навигационных функций. Ошибки источников видимы, не превращаются в нулевые значения; отказ auth скрывает весь dashboard. Client islands ограничены графиками и управлением обновлением. Смена валюты/Refresh выполняют новый серверный GET; во время запроса прошлые виджеты скрыты, управление заблокировано, показан skeleton. Полное приложение по-прежнему использует JavaScript.

Расширенный FinanceDashboard TASK-012 сохранён в `/finance/dashboard` и доступен через вкладку «Обзор»: четыре финансовых KPI, status donut, top clients, aging и CSV. Новых моделей, миграций и зависимостей нет.

## Проверки

- Финальные `npm run build`, `npx tsc --noEmit --noUnusedLocals --noUnusedParameters`, Prisma validate/status и `git diff --check` прошли. 11 локальных миграций актуальны.
- Реальные HTTP/Auth.js/PostgreSQL: пять ролей и два workspace, текущая роль и отзыв Membership, SUPER_ADMIN без пересечения tenants, отсутствие данных без авторизации. У READONLY/AGENT HR counter недоступен, прочие показатели доступны.
- Проверочная сводка: Revenue 130 000 000 коп. RUB, Open Deals 8 из 15, low 1 + zero 1, pending 2. Прежний Document CRM не повлиял на нормализованный count. После прямого изменения fixture следующий GET видит новое число без cache; Cache-Control содержит no-store.
- Шесть точных месячных сумм: 12/18/15/22/24/32 млн коп. Отдельное раннее поступление 7 млн включено в total. Частичная оплата дала OVERDUE с остатком 4 млн, последние пять статусов CANCELLED/DRAFT/OVERDUE/PAID/PAID. USD 90071992547409931234 коп. отображается как 900 719 925 474 099 312,34 $, EUR — честный ноль. Неверная currency отклонена.
- Activity ограничена восемью последними событиями из 12+, чужие записи и private before/after отсутствуют в HTTP response. Неизвестный domain `__proto__` и action `constructor` отображаются безопасно, без ссылки/ошибки рендера.
- Браузер: смена RUB/USD/EUR и Refresh через GET, точная большая сумма, нулевой EUR, ссылки к счетам/CRM/пополнению. После повышения остатка с 5 до 6 при min 5 KPI стал 1 (только zero), баннер исчез; после возврата fixture KPI 2/баннер восстановлены. Задержанный запрос подтвердил loading=true и 0 видимых KPI до ответа.
- Regression `/finance/dashboard`: четыре KPI, три графика, aging, пять строк и кнопка отчёта сохранены. Свежие обычные переходы — 0 console errors/warnings.
- Светлая/тёмная темы 1440 px, mobile 390×844, reduced motion. Document width = 390, таблица 650 px прокручивается внутри своего блока. Шесть баров и календарные подписи читаемы; точные данные доступны в details.
- Пустой workspace: все KPI 0, нет строк/событий/баннера, явные empty states. Остановленная PostgreSQL: ошибка сервиса авторизации, видимых KPI 0, демофолбэка нет.

Одноразовые команды и браузерные проверки выполнялись без создания тестовых файлов вне CHECKPOINT. Свои два workspace, шесть users и связанные fixtures удалены; другие workspace сохранены, ledger triggers не менялись. Cookies очищены, локальные серверы остановлены. Изменения TASK-018–022 сохранены. Commit/push и внешнее развёртывание не выполнялись.

## Скриншоты

[Dashboard light](screenshots/task-023-dashboard-light.png), [dark](screenshots/task-023-dashboard-dark.png), [счета и лента](screenshots/task-023-details-dark.png), [mobile](screenshots/task-023-dashboard-mobile.png), [графики mobile](screenshots/task-023-charts-mobile.png), [счета mobile](screenshots/task-023-invoices-mobile.png), [empty](screenshots/task-023-empty.png), [PostgreSQL error](screenshots/task-023-postgres-error.png).
