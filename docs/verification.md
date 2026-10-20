# Проверки реализации

## Актуальный статус TASK-023

20 октября 2026: TASK-023 закрыт. Главная `/`: Revenue/Open Deals/Low Stock/HR Pending, 6-month receipts LineChart, CRM count BarChart, пять последних счетов и восемь audit events; low_stock banner. Server Promise.all/no-store, строгие currency/live tenant/RBAC, exact money и безопасная сериализация audit summaries. Finance TASK-012 сохранён на `/finance/dashboard`, общие RevenueChart/RecentInvoices. Финальные build/strict typecheck/Prisma validate/status успешны, миграции/зависимости не добавлялись. HTTP/SQL: пять ролей/два tenants/live revoke/freshness/no-store, месяцы/частичная оплата/20-digit money, legacy exclusion, audit limit/private payload exclusion. Browser: обе темы/mobile/reduced motion, GET currency/Refresh/loading, low+zero banner condition, empty, finance regression, PG error без KPI/demo. Собственные fixtures удалены, cookies очищены, серверы остановлены. Отчёт: [TASK-023.md](TASK-023.md).

## Актуальный статус TASK-022

19 октября 2026: TASK-022 закрыт. `/projects/overview`: DONE/total, точный бюджет по Expense.projectId, команда без дублей и CSS Grid timeline. Create/edit плана/бюджета/дат/руководителя, фильтры/12-page/deep links. Финальные build/strict typecheck/Prisma validate/status/diff прошли; 11 миграций, старые расходы сохранены без проекта. HTTP/SQL: exact 20-digit money/zero/125%/раздельные валюты, 20+2 team, 12+1 projects, версии/конкуренция/пять ролей/live tenant/FK/audit rollback, P&L regression. Browser: формы/manager/shortcuts/focus, linked/unlinked expense, поздняя загрузка picker, однодневный timeline/validation/preserved window, фильтры/empty/READONLY, обе темы/390 px/reduced motion. Loading/PG error скрывают прежние карточки без fallback; свежая консоль без ошибок. Собственные fixtures удалены, cookie очищены, серверы остановлены. Отчёт: [TASK-022.md](TASK-022.md).

## Актуальный статус TASK-021

19 октября 2026: TASK-021 закрыт. `/projects`: task Kanban TODO/IN_PROGRESS/IN_REVIEW/DONE, priority/avatar/due, TanStack List/filters/CRUD; общие CRM DnD factory/sensors, legacy `/projects/documents`. Финальные build/strict typecheck/Prisma validate/status/diff успешны, 10 миграций. REVIEW rename сохранил ID/version/relations. HTTP/SQL подтвердили RBAC/live tenant/version/concurrency/hierarchy, exact due date/completion, 20+3 pages/search, atomic task/project audit rollback. Browser: pointer/keyboard/select, формы/pickers, список/сортировка/поиск/empty, client conflict/network recovery, CRM empty-column regression, readonly/agent, две темы/390 px/reduced motion, loading/PG error без прежних карточек/demo. Собственные fixtures удалены, cookie очищены, серверы остановлены. Отчёт: [TASK-021.md](TASK-021.md).

## Актуальный статус TASK-020

19 октября 2026: TASK-020 закрыт. `/hr/[id]`: Header/Personal/Contact/Docs, Reporting to, ручной годовой лимит и календарный annual leave balance. Build/strict typecheck/Prisma validate/status/diff успешны, 9 миграций актуальны. HTTP/SQL: documents CRUD/пагинация, allowance/version/concurrency/atomic audit rollback, пять ролей/live membership/tenant, numeric CHECK/FK, переход года 4+3 рабочих дня, отдельный PENDING/исключение иных типов и статусов, 0/unset/negative. Browser: формы/год/контакты/документы/manager links, keyboard/focus, READONLY/AGENT, две темы/mobile/reduced motion, loading/error без старого профиля и demo. Собственные fixtures удалены, cookies очищены, серверы остановлены. Отчёт: [TASK-020.md](TASK-020.md).

## Актуальный статус TASK-019

19 октября 2026: TASK-019 закрыт. Leave form/register/history, PENDING → APPROVED/REJECTED, inclusive weekdays date-fns, manager pending sidebar badge. Build/strict typecheck/Prisma validate/status/diff успешны. HTTP/SQL подтвердили пять ролей, live membership/tenant, days/strict input/version, concurrent overlap/decision и audit rollback. Browser: создание/approval/rejection и badge 23→24→23→22, filters/pages, terminal readonly, collapsed/mobile 99+/112, две темы/390 px, keyboard/focus/reduced motion. При отказе PostgreSQL строки убраны, ошибка сервиса и ! вместо count. Fixtures удалены, cookie очищены, серверы остановлены. Без новых миграций/зависимостей/тестовых файлов. Отчёт: [TASK-019.md](TASK-019.md).

## Актуальный статус TASK-018

19 октября 2026: TASK-018 закрыт. `/hr` использует Employee Grid/List, серверный поиск/department/status/пагинацию и versioned profile CRUD. `/hr/org-chart` — recursive manager hierarchy со сворачиванием, несколькими корнями и всеми статусами. Strict build/typecheck и Prisma validate/status/diff прошли. HTTP/SQL проверили пять ролей, tenant/version/audit, literal/Cyrillic search, concurrent cycle prevention, audit rollback, повреждённый граф и лимит 2000. Browser: Grid/List совпадают, profile CRUD/manager, keyboard/focus, readonly/foreign, обе темы/mobile 390 px/reduced motion. При отказе БД данные убраны, показана ошибка без fallback. Legacy HR и Inventory search regression прошли. Новых миграций/зависимостей/тестовых файлов нет. Fixtures удалены, cookie очищены, серверы остановлены. Отчёт: [TASK-018.md](TASK-018.md).

## Актуальный статус TASK-017 / CHECKPOINT-03

19 октября 2026: TASK-017 закрыт, CHECKPOINT-03 пройден. `/inventory/dashboard`: четыре KPI и Reorder suggested для low/zero stock, отдельные точные валютные суммы. Финальные build и npx tsc --noEmit успешны; Prisma validate/status/diff — 8 миграций, без различий. `npm run check:finance-inventory` — 9/9 pass на production HTTP/Auth/PostgreSQL: Invoice CRUD/PDF, платежи, Finance KPI/P&L/expenses/CSV, stock/warehouse/ledger/concurrency/audit/RBAC. Браузер: dark/light, 390 px, filters/empty/readonly/foreign, reduced motion, Refresh/sidebar после IN. При остановке БД STORAGE без data/fallback, карточки и таблица убраны. Fixtures удалены, triggers включены, cookies очищены, серверы остановлены. Отчёты: [TASK-017.md](TASK-017.md), [CHECKPOINT-03.md](CHECKPOINT-03.md).

## Актуальный статус TASK-015 / TASK-016

19 октября 2026: TASK-015 и TASK-016 закрыты. Нормализованный Product catalog/category, exact stock totals/status/MinStock/sidebar alert, Warehouse CRUD, immutable StockMovement и timeline по товару. Миграции category и SQL immutable/transfer triggers применены к изолированной PostgreSQL 17.10; repeated deploy/status/validate/schema diff прошли. Финальные build/strict typecheck/diff-check успешны. HTTP/SQL проверили границы/большие количества, tenant/RBAC/strict schema/version/concurrency, отсутствие отрицательного запаса/overflow, paired transfer conservation, audit rollback и DB update/delete/pair constraints. UI CRUD, четыре типа движений, filters/pages, readonly/foreign, keyboard/focus, обе темы и mobile 390 px проверены. Badge подтверждён при 104 alerts (99+), collapsed/mobile и network error/recovery. Нормальные переходы без console errors; при отказе PostgreSQL STORAGE без data/демо и без старого ledger. Совместные fixtures удалены, оба SQL triggers включены, серверы остановлены. Файлов тестов вне CHECKPOINT нет. CHECKPOINT-03 остаётся после TASK-017. Отчёты: [TASK-015.md](TASK-015.md), [TASK-016.md](TASK-016.md).

## Актуальный статус TASK-014

19 октября 2026: TASK-014 закрыт. `/finance/reports`: Revenue по полностью оплаченным счетам на дату окончательной оплаты − Expenses = Net Profit; This Month/Quarter/Year/Custom по Москве, RUB/USD/EUR отдельно, категории и защищённый CSV `/api/reports/export`. Build/strict typecheck/diff-check прошли. HTTP/SQL подтвердили формулу, Moscow boundaries, исключение partial/DRAFT/CANCELLED/future, точные большие суммы и отрицательную прибыль, tenant/live RBAC, CSV headers/BOM/sign/strict query и свежесть после Expense mutation. Браузер: periods/validation/Enter/export, обе темы, mobile 390 px, empty/readonly; консоль обычных переходов без ошибок. При отказе PostgreSQL KPI убраны, CSV 503/STORAGE без fallback. Собственные fixtures удалены, серверы остановлены. Тестовых файлов вне CHECKPOINT нет. CHECKPOINT-03 остаётся после TASK-017. Отчёт: [TASK-014.md](TASK-014.md).

## Актуальный статус TASK-013

19 октября 2026: TASK-013 закрыт. Expense/ExpenseCategory и additive PostgreSQL migration, `/finance/expenses` с CRUD, категориями, поиском, валютой и пагинацией; receipt — проверенная HTTP(S)-ссылка. Финальные build/strict typecheck/diff-check успешны. Prisma validate/deploy/status и diff БД к схеме прошли. HTTP/SQL подтвердили точные суммы, tenant/RBAC/version, concurrent update и полный rollback при отказе audit; invoice/payment regression прошла. Браузерные CRUD/filters/pages/roles, keyboard/focus, обе темы и mobile 390 px проверены. При остановленной PostgreSQL — ошибка без демофолбэка. Собственные fixtures удалены, проверочные серверы остановлены. Тестовых файлов вне CHECKPOINT нет. Отчёт: [TASK-013.md](TASK-013.md).

## Актуальный статус TASK-012

18 октября 2026: TASK-012 закрыт. Финансовые KPI и три Recharts-графика на `/` используют нормализованные Invoice/Payment через Promise.all; добавлены currency switch, AR aging и `/finance/payments` с фильтрами/записью оплаты. Финальные build/typecheck/diff-check прошли. HTTP/SQL проверили formulas, UTC month/aging boundaries, tenant/RBAC, точные большие суммы, pagination/filter/export; UI payment 2005 коп. дал одну запись/audit и обновил все четыре KPI. Dark/light и mobile 390 px без общего overflow, Line keyboard tooltip и нормальные переходы без console errors. При остановке PostgreSQL — STORAGE без demo/нулей. Собственные fixtures удалены, проверочные серверы остановлены. Тестовых файлов вне CHECKPOINT нет. Отчёт: [TASK-012.md](TASK-012.md).

## Актуальный статус TASK-011

18 октября 2026: TASK-011 закрыт. Invoice CRUD, inline строки, точные копейки/налог, INV-YYYY-NNNN, workflow/платежи и защищённый PDF на статическом Geist. Финальные build/typecheck/diff-check успешны; Prisma validate/status корректны на локальной PostgreSQL 17.10. HTTP/SQL подтвердили tenant/RBAC/version, запрет подмены total/status, дубликатов/переплаты и изменение оплаченных счетов. Браузер: create/edit/send/partial/full payment/reload/delete, поиск/фильтр/empty, Ctrl+Enter/Escape, обе темы и mobile 390 px без общего overflow, свежая консоль без ошибок. Poppler/pypdf: PDF с кириллицей, обычный и 100-строчный (17 страниц), все footer/последняя строка сохранены. Тестовых файлов вне CHECKPOINT нет. Отчёт: [TASK-011.md](TASK-011.md).

## Vercel deployment

18 октября 2026: актуальный код опубликован из GitHub в существующий Vercel project erp. Устранён старый build failure без root layout; Prisma Postgres мигрирована, настроены production auth и первый ADMIN, bootstrap-пароль удалён из env. HTTPS login, защищённый health postgresql, восемь основных страниц и Contact create/read/update/filter/delete проверены реальными запросами; smoke contact удалён, аудит сохранён. Отчёт: [DEPLOYMENT.md](DEPLOYMENT.md).

## Актуальный статус TASK-010 / CHECKPOINT-02

18 октября 2026: TASK-010 закрыт, CHECKPOINT-02 пройден. ContactFormSheet создаёт/редактирует через общий CRM service, использует RHF/Zod onBlur и Sonner, Cmd/Ctrl+Enter/Escape. Non-modal Sheet сохраняет доступ к таблице и draft; фиксированная версия защищает от перезаписи. Финальные build/typecheck/diff-check прошли; `npm run check:crm` — 9/9 pass на настоящих HTTP/Auth/PostgreSQL. Браузер: таблица/сортировка/фильтр, pointer drag с reload, Activity detail, blur/toast/save/Escape/focus, READONLY/AGENT, CONFLICT/network/pending; один повторный shortcut дал одну запись и audit. Desktop/mobile 1440/390 px в обеих темах без overflow, reduced motion, свежая консоль без ошибок. Отчёты: [TASK-010.md](TASK-010.md), [CHECKPOINT-02.md](CHECKPOINT-02.md).

## Актуальный статус TASK-009

18 октября 2026: TASK-009 закрыт. `/crm/contacts/[id]` открывается из таблицы и напрямую: header/actions, composer и timeline пяти типов, Contact Info/Deals/Tags. Новая additive migration сохраняет tags; версия и audit проходят через общий CRM service. Финальные build/typecheck/diff-check прошли. На реальной PostgreSQL выполнены 33 HTTP/SQL проверки, включая tenant/RBAC, пагинацию, validation, stale version и audit rollback. В браузере проверены пять create-типов, edit/stage/assignment/tags, защищённое и успешное удаление, READONLY/AGENT, конфликт и commit-aware refresh. Обе темы на 1440/390 px, reduced motion, HTML как текст и финальная консоль без ошибок. Свои записи удалены, временный CHECK отсутствует, 3001/БД остановлены, explicit demo на 3000 восстановлен. Тестовые файлы не создавались. Отчёт: [TASK-009.md](TASK-009.md).

## Актуальный статус TASK-008

18 октября 2026: TASK-008 закрыт. `/crm/pipeline` — нормализованная воронка DndContext → 6 SortableContext → DealCard/useSortable. Финальные build/typecheck/diff-check прошли. На PostgreSQL проверены owner/latest Activity, точные Decimal, pointer/touch/keyboard drag, пустой этап, optimistic update, stale rollback, отказ audit, неизвестный сетевой результат и commit-aware refresh. READONLY/AGENT/чужие IDs проверены на сервере; pagination/empty и обе темы на desktop/mobile осмотрены. Исправлена мобильная прокрутка: document width=390 при viewport=390. Свежий переход без ошибок. Временные данные/constraint удалены, сервер 3001/БД остановлены, explicit demo на 3000 работает. Полный отчёт: [TASK-008.md](TASK-008.md).

## Актуальный статус TASK-007

18 октября 2026: TASK-007 закрыт. `/crm/contacts` получает initialData через Server Component и использует TanStack Table v8 с серверными фильтрами/пагинацией, debounce 300 ms и выбором по id/version между страницами. Build/typecheck и diff-check прошли; проверены 25 HTTP/SQL сценариев и лимит CSV 5000, tenant/RBAC, атомарность bulk/audit, браузерные поиск/выбор/назначение/удаление/CSV, loading/error/empty/retry и обе темы на desktop/mobile. Свежий финальный переход без ошибок. Временные данные удалены, проверочные сервер/БД остановлены. Explicit demo на 3000 работает; нормализованная таблица требует реального входа и PostgreSQL. Полный отчёт: [TASK-007.md](TASK-007.md).

## Актуальный статус TASK-006

18 октября 2026: TASK-006 закрыт. Typecheck/build прошли. Нормализованные CRM queries/actions проверены реальными HTTP Server Actions на PostgreSQL 17.10: роли/tenant isolation, фильтры/пагинация/Kanban, точные 20-значные копейки, stale version, конкурентный update и rollback при отказе audit insert. Совместимые Document действия прошли CRUD; CRM осмотрен на desktop/mobile. Новых тестовых файлов нет. Собственные временные записи/SQL-ограничение удалены, проверочный сервер/БД остановлены; explicit demo на 3000 работает. Подробности и границы: [TASK-006.md](TASK-006.md).

## Актуальный статус TASK-005 / CHECKPOINT-01

18 октября 2026: TASK-005 закрыт, CHECKPOINT-01 пройден. Финальная production-сборка и строгий typecheck успешны. Проверены запуск, login page/вход в явное демо, dashboard, четыре группы/семь активных пунктов, collapse 248→80 px, persistence, 150 ms route fade, движущийся indicator, две темы/Header/Settings, mobile Sheet, focus trap/возврат фокуса и reduced motion. Поиск `#[0-9a-fA-F]` в src/components — 0 совпадений. Финальная консоль браузера без ошибок/предупреждений. Сервер доступен на 127.0.0.1:3000. Подробности: [TASK-005.md](TASK-005.md), [CHECKPOINT-01.md](CHECKPOINT-01.md).

## Актуальный статус TASK-004

18 октября 2026: TASK-004 закрыт. Финальные build/typecheck, Prisma validate и migrate status прошли; миграция ролей применена на PostgreSQL 17.10, schema diff пуст. Через HTTP проверены Credentials/JWT для пяти ролей, отзыв/expiry, активность User/Membership, смена роли, игнорирование client role/workspace updates, запрещённые Server Actions и чужие IDs. На остановленной PostgreSQL получен 503/STORAGE без демофолбэка. В браузере прошли вход/неверный пароль/выход, READONLY affordances, ADMIN CSV, live useSession refresh и явный деморежим; финальные переходы без ошибок консоли. Собственные временные записи и cookie удалены, серверы и PostgreSQL остановлены. Автоматические тестовые файлы не создавались. Полный отчёт и границы: [TASK-004.md](TASK-004.md).

## Актуальный статус TASK-003

18 октября 2026: TASK-003 закрыт. `npm run typecheck -- --noUnusedLocals --noUnusedParameters` и `npm run build` прошли. Одноразовый CLI-осмотр подтвердил Result constructors/aliases, NOT_FOUND/P2025, отсутствие необязательного meta, точное форматирование Decimal-строк, JPY/KWD, некорректные деньги/даты, генерацию prefix_UUID, Unicode truncate и объединение классов. Production `/finance` и `/api/health` работают в явно включённом деморежиме; консоль без ошибок/предупреждений. На мобильном документ шириной 390 px не переполняется, таблица прокручивается внутри контейнера. Автоматические тестовые файлы не создавались. Контракты и границы проверки: [TASK-003.md](TASK-003.md).

## Актуальный статус TASK-002

18 октября 2026: TASK-002 закрыт. На PostgreSQL 17.10 применены обе миграции, Prisma Client сгенерирован, повторный migrate не создаёт изменений, schema diff пуст. Build и строгая проверка TypeScript прошли. Ручные SQL-проверки подтвердили tenant FK, точный Decimal, ограничения сумм и связей; временные записи удалены. Production-приложение с `ERP_DEMO_MODE=false` прочитало прежний счёт и платежи, отключение User/Membership отозвало доступ. Экран финансов осмотрен в браузере: 0 ошибок/предупреждений консоли. Подробности и границы проверки: [TASK-002.md](TASK-002.md), [скриншот PostgreSQL](screenshots/task-002-postgresql-finance.png).

## Актуальный статус TASK-001

TASK-001 закрыт. Проверки новой дизайн-системы Slate / Indigo-Violet, шрифтов `next/font/google`, полного UI-набора, тем и reduced motion приведены в [TASK-001.md](TASK-001.md). Ниже сохранена история проверок исходного каркаса; прежние зелёные скриншоты относятся к состоянию до TASK-001.

## Проверки исходного каркаса

Дата: 17 октября 2026, Europe/Moscow. Локальная Windows-среда, Node.js 24.21.0, npm 11.19.0. Проверялся явно включённый деморежим. Автоматические тестовые файлы не создавались: CHECKPOINT ещё не назначен.

## Сборка и исходники

- `npm run build` — успешная финальная production-сборка Next.js 15.5.28, включая все восемь экранов, `/api/health` и `/icon.svg`.
- `npm run typecheck -- --noUnusedLocals --noUnusedParameters` — успешно, без ошибок.
- `npx prisma validate` — схема корректна. Prisma Client сгенерирован, начальный SQL получен через `prisma migrate diff --from-empty`.
- Поиск в `src/` не выявил `any`, `throw`, hex-цветов в Tailwind-классах и прямых цветовых классов.
- Проверены JSDoc у экспортируемых функций и компонентов.
- `npm run db:seed` с незаполненными bootstrap-переменными корректно завершился с сообщением о необходимых настройках, не создавая стандартных учётных данных.

## Проверка в браузере

Playwright использовался для интерактивных сценариев и визуального осмотра, без создания набора тестов в репозитории.

| Сценарий | Наблюдаемый результат |
| --- | --- |
| Создание сделки с пустыми полями | Показаны сообщения Zod у названия и контакта |
| Создание/редактирование сделки | Запись появляется в таблице, комментарий сохраняется |
| Сумма 12 345,67 ₽ | Копейки сохранены и корректно отображаются после перезагрузки |
| Kanban CRM | Выполнено перемещение мышью и смена этапа через список; в таблице виден новый этап |
| Выбор строки и CSV | Скачан `evo-crm.csv` с выбранной записью |
| Удаление сделки | Требуется подтверждение; запись исчезает, отображается пустое состояние фильтра |
| Создание счёта 100,25 ₽ | Счёт появляется в статусе «Отправлен» |
| Попытка оплатить 101 ₽ | Получено «Сумма платежа превышает остаток по счёту» |
| Поступление 40,10 ₽ | Статус «Частично оплачен», остаток 60,15 ₽ |
| Оплата оставшихся 60,15 ₽ | Статус «Оплачен» сохраняется после перезагрузки |
| Удаление оплаченного счёта | Получено «Счёт с поступлениями нельзя удалить» |
| Редактирование назначения оплаченного счёта | Сохраняется; защищённые поля остаются прежними |
| Глобальный поиск «Mono» | Найдены записи трёх модулей; переход внутри финансов применяет query-фильтр |
| Остаток товара 2 → 0 | Автоматические статусы «Мало на складе» → «Нет в наличии» |
| HR / проекты | Отрисованы 6 сотрудников и 5 проектов; проектная доска открывается |
| Dashboard | Переключается период, quick-create открывает форму нужного модуля |
| Мобильное меню | Открывается диалогом, переход к модулю закрывает меню |
| Светлая тема | Применяется и сохраняется после перезагрузки |
| Вход в деморежиме | Отдельная страница с явным обозначением демо и рабочей кнопкой входа |

Созданные при проверке учебные сделки/товары удалены через интерфейс. Отдельный проверочный оплаченный счёт и относящиеся к проверке записи платежей/аудита удалены только из локального демофайла после остановки сервера. Исходные 30 демонстрационных документов сохранены; операции с реальной БД не выполнялись.

## Финальная production-проверка

Собранное приложение запущено через `npm start`. `/`, `/crm`, `/finance`, `/inventory`, `/hr`, `/projects`, `/settings`, `/login`, `/api/health`, `/icon.svg` вернули HTTP 200. Health вернул Result с `status: ready`, `mode: demo`. На свежем production-переходе в браузере: 0 ошибок и 0 предупреждений консоли.

Визуально проверены тёмная desktop-версия 1440 px, мобильная версия 390 × 844 и светлые настройки. Ширина документа на мобильном — 390 px, общего горизонтального переполнения нет. Таблицы и kanban прокручиваются внутри своих областей. Скриншоты: [desktop](screenshots/dashboard-desktop.png), [mobile](screenshots/dashboard-mobile.png). Анимации завершены при сохранении desktop-скриншота.

Сервер проверки остановлен после завершения. Для работы: `npm run dev`, затем `http://127.0.0.1:3000`.

## Не подтверждено исходным этапом (история до TASK-002)

Docker и PostgreSQL CLI отсутствуют в доступной среде. Миграция на живой PostgreSQL, bootstrap реального пользователя, cookie-авторизация, роли/изоляция двух tenants, конкурентные транзакции и rollback платежей на БД не проверены. Эти сценарии перечислены в CHECKPOINT-001 (`roadmap.md`). Не считать валидацию Prisma доказательством успешной миграции или production readiness.


## Локализация EN/RU — 20.10.2026

- Финальный npm run build: PASS; npm run typecheck (tsc --noEmit): PASS; npx prisma validate: PASS.
- 1703 пары сообщений: одинаковые ключи, заполненный ru, совпадающие placeholders; точечные проверки интерполяции пользовательского текста, склонений и точного formatCurrency прошли.
- Браузер: 17 основных маршрутов, сохранение языка, английский по умолчанию/invalid-cookie fallback, локализованные API ошибки, P&L CSV и invoice PDF en/ru. PDF отрисованы Poppler и просмотрены.
- Финальная production-сборка: вход → Dashboard → Settings → смена языка → reload; светлая тема и 375 px, pageerror = 0, горизонтальное переполнение = false.
- Изолированное локальное PostgreSQL-пространство использовано только для проверки, без демоподмены. Полный отчёт и снимки — [LOCALIZATION.md](LOCALIZATION.md).
- Это проверка текущего изменения, а не CHECKPOINT-04/05: TASK-024—030 ещё не реализованы.


## Завершение EN/RU — 20.10.2026

- npm run build: PASS; npx tsc --noEmit: PASS.
- 1721 пары en/ru, 0 отсутствующих сообщений t, 0 нарушений placeholders, 0 кириллических английских значений.
- Заполненные Dashboard/Legacy Finance/CRM/HR/Projects/Inventory, invoice/employee/product detail; семь форм создания на двух языках; системные сообщения/статусы/даты проверены.
- Legacy invoice создан через английский интерфейс: в БД status=Черновик, amount=1234 для 12.34. Task изменён через русский интерфейс: status=IN_PROGRESS; после переключения отображается In progress.
- Проверены точные большие десятичные количества, склонения, формат дат и защита пользовательских audit title при переводе.
- Production: вход, переключатель/reload/navigation, начальный en/неизвестная cookie → en, русский Not Found; роль READONLY может сменить язык, экспорт остаётся запрещённым с локализованным 403.
- Invoice PDF en/ru: скачивание, Poppler и визуальный просмотр; P&L CSV: английские/русские заголовки, категории и неизменённые точные числа.
- Светлая/тёмная тема, reduced motion, 375 px: переполнения нет; в проверенном production UI неожиданных pageerror нет.
- Снимки и детали: [LOCALIZATION.md](LOCALIZATION.md). Собственные временные записи из локальной PostgreSQL удалены после проверки. Это не CHECKPOINT-04/05 и не реализация TASK-024—030.


## TASK-024 + EUR — 2026-10-20

- Production build, tsc --noEmit, prisma validate: PASS. Обе новые миграции применены локально, повторный deploy без pending migrations.
- 2 workspace / 5 ролей, tenant isolation, self/SUPER_ADMIN guards, role/status changes, session revocation, Unicode search/strict DTO, stale version: PASS.
- Одноразовые приглашения, отзыв/expiry/reissue, существующий аккаунт/пароль/сохранение профиля: PASS. Browser redemption создаёт аккаунт и входит в нужный workspace; admin routes закрыты для AGENT.
- Ошибка audit INSERT откатывает изменение; same-version race сохраняет одну мутацию; latest100 и recursive secret stripping: PASS.
- EUR 1:93: dry-run rollback и реальная локальная миграция 6 invoices/109 items/3 payments; 118 новых conversion audits, subtotal/total/payment инварианты сохранены. Округление единичных цен описано в TASK-024.md.
- Finance/Inventory regression: 9/9 PASS, fixture currencies обновлены на EUR. PDF en/ru просмотрен через Poppler, CSV EUR 120.00/20.00/100.00 проверен. Explicit demo conversion 30 records + idempotency: PASS.
- EN/RU 1845 сообщений, совпадающие placeholders, нет отсутствующих статических t keys; нет any/console.log. Browser финального build: 0 pageerror/console warnings, light/dark, reduced motion, 375 px без внешнего overflow, Esc закрывает dialog.
- Снимки и ограничения: [TASK-024.md](TASK-024.md). TASK-025/CHECKPOINT-04/05 остаются в очереди. Временные workspace и пользователи проверки удалены; исходные данные сохранены.


## TASK-025 + CHECKPOINT-04 — 2026-10-20

Settings singleton/Context, company/logo/EUR/timezone/date format, реальные notification toggles реализованы. Build/tsc/Prisma validate PASS; CHECKPOINT-04 9/9, CRM regression 9/9, Finance/Inventory regression 9/9. Seed создаёт singleton + audit атомарно и повторно не изменяет данные. Browser ADMIN/READONLY, EN/RU, 375 px, themes, logo upload, context propagation, notification filtering, HR/leave/Projects keyboard DnD/Main Dashboard/PDF проверены. Секреты и logo bytes не попадают в audit snapshots; повреждённый config не превращается в defaults. Подробности и доказательства — [CHECKPOINT-04.md](CHECKPOINT-04.md), [TASK-025.md](TASK-025.md). TASK-026—030 остаются в очереди.


## TASK-026 — 2026-10-20

Production build / npx tsc --noEmit / git diff --check: PASS. Loading siblings — 31/31 UI routes; root/auth/dashboard error boundaries. Каталоги EN/RU — 1934 пары, отсутствующих static t keys/placeholder mismatches/кириллических EN значений нет. Нет : any, console.log и hex в components. Новые test-файлы не добавлены.

Browser → production Next → реальная локальная PostgreSQL: Cmd/Ctrl+N на основных списках, palette → form, nested fallback, один product/audit после сохранения, readonly guards, typing/modal suppression, фильтры/hash/create intent, cap8 и поиск 12-го legacy document, верные /documents links, reset search, Escape/focus: PASS. 375 px/767/768, RU/dark и reduced motion: PASS. Искусственный RSC rejection в browser response показал безопасную границу; Try again восстановил страницу. Финальный обычный smoke — без неожиданных pageerror.

Собственные fixtures удалены, исходные 6 invoices/118 conversion audits сохранены; локальные helper-сервисы остановлены. Внешний deployment не проверялся. Подробности и screenshots: [TASK-026.md](TASK-026.md). TASK-027—030/CHECKPOINT-05 остаются в очереди.
