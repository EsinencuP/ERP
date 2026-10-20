# Evo ERP Template

Локальный модульный ERP-шаблон на Next.js 15, TypeScript, Tailwind CSS, Prisma и PostgreSQL. Английский интерфейс по умолчанию; полный русский перевод включается тумблером Language в Settings. Модули: обзор, CRM, финансы, склад, команда, проекты, настройки и вход.

## Быстрый старт: Docker + PostgreSQL 16

Нужен Docker Compose. Если `.env` уже существует, сохраните его настройки вместо копирования поверх.

```powershell
Copy-Item .env.example .env
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64url'))"
```

Запишите сгенерированный секрет в `NEXTAUTH_SECRET` в `.env` (либо используйте существующий устойчивый `AUTH_SECRET`). Затем:

```powershell
docker compose up --build -d
docker compose run --rm seed
```

Откройте <http://localhost:3000/login>. Образец создаёт отдельный workspace и пользователя **admin@erp.dev / Admin123!**. Состав: 20 контактов, 10 сделок в `/crm/pipeline`, 5 счетов, 15 товаров, 3 склада, 8 сотрудников, 3 проекта с 18 задачами; также платежи, расходы, лимиты/заявки отпусков и начальные движения запасов. Суммы — EUR. Это учебные учётные данные; существующие аккаунты и рабочие пространства не заменяются. Seed запускается явно, приложение не импортирует данные автоматически.

Compose ждёт готовности PostgreSQL и успешных миграций перед app. App работает с `NODE_ENV=production` от непривилегированного пользователя. По умолчанию доступны только локальные `3000` (app) и `5433` (PostgreSQL); `APP_PORT` / `POSTGRES_PORT` позволяют изменить их. При изменении внешнего порта согласуйте `NEXTAUTH_URL`. Пароль PostgreSQL для host-side Prisma задайте также в `DATABASE_URL`; в Compose внутренний URL формируется отдельно. Для паролей URL используйте percent encoding либо безопасный буквенно-цифровой пароль.

Если Docker Engine работает непосредственно внутри WSL, оставьте дистрибутив активным; можно запустить `docker compose up --build` без `-d` в отдельном терминале, а seed выполнить во втором.

Новый volume `erp_postgres16` отделён от прежнего PostgreSQL 17. Старый каталог нельзя подключать к версии 16: перенос выполняется через dump/restore. `docker compose down` сохраняет данные.

## PostgreSQL и локальный Node.js

Нужен Node.js 24 LTS (или совместимый 22.13+) и npm. Зависимости зафиксированы в `package-lock.json`. Можно поднять только базу и выполнять app локально:

```powershell
npm ci
docker compose up -d postgres
npm run db:migrate
npx prisma db seed
npm run dev
```

В `.env` нужны `ERP_DEMO_MODE=false`, `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`. Для чистой рабочей установки задайте **SEED_MODE=bootstrap**, свой `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (не менее 12 символов) и `SEED_WORKSPACE_NAME`; затем выполните `npm run db:seed`. Этот режим создаёт только администратора и пустое пространство, сохраняя существующие аккаунты/пароли. После первоначальной настройки удалите bootstrap-пароль из окружения.

По умолчанию `SEED_MODE=sample`. Повторный seed не меняет завершённый образец, в том числе последующие правки и удаления. `SEED_REFERENCE_DATE=YYYY-MM-DD` фиксирует календарную опору; без неё даты отсчитываются от текущего дня UTC. Имена и суммы генерирует Faker с фиксированным seed. Детали: [TASK-027](docs/TASK-027.md).

Для отдельной файловой демонстрации можно явно задать `ERP_DEMO_MODE=true`; она хранится в `.data/demo-workspace.json` и предназначена для одного локального Node-процесса. Ошибка PostgreSQL никогда не включает этот режим автоматически. Внешний production использует HTTPS origin и устойчивый секрет; после изменения env перезапустите app.

## Vercel

Production-проект: `erp`, домен https://erp-xi-pink.vercel.app, GitHub `EsinencuP/ERP`, ветка `main`. Файловый demo для Vercel не используется. Нужны `DATABASE_URL` существующей Prisma Postgres интеграции, `ERP_DEMO_MODE=false`, устойчивый `AUTH_SECRET` и HTTPS `AUTH_URL` с production origin.

`vercel.json` задаёт `npm run vercel-build`: Prisma Client, только в production — сохранённые `prisma migrate deploy`, затем Next.js build. Preview не мигрирует общую с production БД. Для первого bootstrap временно задать `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_WORKSPACE_NAME`; после успешного входа удалить bootstrap-переменные и выполнить redeploy. Автоматический production bootstrap допускает только пустую базу либо уже существующий указанный аккаунт; пароль существующего аккаунта не меняется. Секреты/локальные credentials не коммитить.

Проверка после деплоя: `/login`, Credentials-вход, authenticated `/api/health` с mode=postgresql, dashboard/contacts/pipeline и сохранение контакта с reload. Неавторизованный health возвращает 401 — это ожидаемая защита, а не сбой БД.

## Возможности

- Общие формы React Hook Form + Zod, создание/изменение/удаление во всех пяти модулях.
- TanStack Table: поиск, фильтр статуса, сортировка, пагинация, выбор строк и CSV-экспорт.
- CRM и проекты: kanban на DnD Kit, перетаскивание и выбор этапа клавиатурой через список.
- Финансы `/finance`: нормализованные счета со строками, налогом, нумерацией INV-YYYY-NNNN, частичной/полной оплатой и PDF на Geist. Нормализованный реестр платежей — `/finance/payments`; прежние документы сохранены в `/finance/documents`.
- Расходы `/finance/expenses`: Expense/ExpenseCategory, создание/редактирование/удаление, просмотр комментария и ссылки на чек, category/currency/search filters и пагинация.
- P&L `/finance/reports`: полные суммы оплаченных счетов по дате окончательной оплаты минус расходы, календарные Month/Quarter/Year/Custom по Москве, отдельные валюты и CSV `/api/reports/export?type=pnl&from=...&to=...` (MANAGER+).
- Inventory `/inventory`: SKU/category, точные totals по всем складам, MinStock/status, Product CRUD и low/zero stock sidebar badge.
- Склады `/inventory/warehouses` и ledger `/inventory/[id]`: Warehouse CRUD, IN/OUT/ADJUSTMENT/TRANSFER, versioned balances и атомарные переносы; движения защищены от изменения/удаления PostgreSQL triggers.
- Dashboard: Total Revenue / Outstanding / Paid MTD / Overdue из Invoice/Payment, отдельные валюты, шесть месяцев поступлений (Line), статусы счетов (Donut), топ-5 клиентов (HorizontalBar), AR aging и точный CSV-отчёт. Финансовые чтения выполняются параллельно через Promise.all.
- Привязка записей к workspace, пять серверных ролей, оптимистическое версионирование, аудит в транзакции.
- Geist Sans/Mono, CSS variables, две темы, адаптивное меню, Radix-диалоги, entrance animations с учётом reduced motion.
- Дизайн-система Slate / Indigo-Violet: HSL-токены, class-based `.dark`, компоненты Shadcn и каталог `/design-system`. Geist подключён через `next/font/google` (при первой сборке нужен доступ к Google Fonts, браузер получает шрифты локально).

## Команды

| Команда | Назначение |
| --- | --- |
| `npm run dev` | Локальная разработка |
| `npm run build` | Prisma Client и production-сборка Next.js |
| `npm start` | Запуск собранного приложения |
| `npm run typecheck` | Проверка строгих типов |
| `npm run check:finance-inventory` | CHECKPOINT-03: интеграции на изолированных PostgreSQL/production server |
| `npm run db:generate` | Генерация Prisma Client |
| `npm run db:migrate` | Применение сохранённых миграций |
| `npm run db:seed` / `npx prisma db seed` | Sample seed; SEED_MODE=bootstrap — только администратор |
| `npm run db:studio` | Просмотр PostgreSQL через Prisma Studio |

Тестовые файлы не создаются вне явно назначенного CHECKPOINT. CHECKPOINT-03 пройден: сборка, типы, 9/9 HTTP/PostgreSQL интеграций и браузер. Условия запуска — `docs/CHECKPOINT-03.md`; фактические результаты — `docs/verification.md`.

Обзор склада: `/inventory/dashboard` — активные товары, low/out-of-stock KPI, стоимость запасов по каждой валюте и таблица с Reorder suggested. Каталог `/inventory` и журнал товара используют те же точные остатки.

## Продолжение разработки

Правила: `INSTRUCTIONS.md`. Решения и границы: `docs/architecture.md`. Очередь задач и CHECKPOINT: `docs/roadmap.md`. Описание каждого домена: `docs/modules/`.

Это исходная основа ERP, а не готовая бухгалтерская или кадровая система. Расчёт налога в счетах и складские движения реализованы; налоговый учёт, проводки, резервы/партии, кадровый документооборот, динамические роли, пользовательские DocType и workflow engine запланированы отдельно. Перед внешним production-развёртыванием нужны CHECKPOINT на PostgreSQL, ограничение частоты входа, управление пользователями и резервное копирование.

TASK-002 добавляет нормализованные Prisma-модели всех пяти доменов, AUTH, workspace/member, tenant-FK, индексы и CHECK-ограничения. Связи и единицы измерения описаны в `docs/modules/database.md`. Нормализованные CRM и Invoice уже имеют отдельные UI и доменные сервисы. Прежний Document-слой сохранён отдельно; автоматический перенос данных не выполняется. Миграции применять через `db:migrate`/`prisma migrate dev`, чтобы сохранить SQL-проверки, не представимые в Prisma schema.


HR: `/hr` — Employee directory с Grid/List, поиском, отделами и профилями. `/hr/org-chart` — рекурсивная оргструктура через руководителей, до 2000 узлов. Прежние HR-документы сохранены в `/hr/documents`. Реализация и проверки: `docs/TASK-018.md`.

HR Leave Management: `/hr/leaves` — заявки, рабочие дни без выходных, решения MANAGER/ADMIN/SUPER_ADMIN и pending badge в sidebar. Проверки и границы: `docs/TASK-019.md`.

HR Employee Profile: `/hr/[id]` — данные/контакты/ссылки на документы, руководитель и календарный баланс ежегодного отпуска. Годовой лимит задаёт менеджер вручную; до назначения «Не задан». Миграция `20261019000400_employee_profile`; границы и проверки: `docs/TASK-020.md`.

Projects Tasks: `/projects` — Task Kanban TODO/IN_PROGRESS/IN_REVIEW/DONE и TanStack List, общие фильтры, приоритеты/исполнители/сроки и versioned task CRUD. Общие DnD hook/factory используются также CRM; прежний реестр — `/projects/documents`. Миграция REVIEW → IN_REVIEW сохраняет записи. Проверки: `docs/TASK-021.md`.

Projects Overview: `/projects/overview` — прогресс DONE/total, затраты по связанным Expense в валюте бюджета, руководитель/команда и календарный timeline на CSS Grid. Настройки проекта, фильтры и переходы к его задачам/расходам. Старые расходы остаются без проекта; миграция `20261019000600_project_expenses` добавляет tenant-safe связь. Проверки: `docs/TASK-022.md`.

Main Dashboard: `/` — Revenue/Open Deals/Low Stock/HR Pending, два графика, пять счетов, audit feed и условный баннер пополнения. Server Component загружает нормализованные данные через Promise.all без кэша. Полный финансовый обзор с aging/top clients/CSV сохранён на `/finance/dashboard`. Проверки: `docs/TASK-023.md`, определения: `docs/modules/dashboard.md`.
