# TASK-027 — Seed Data + Docker

Реализовано 20.10.2026. TASK-028—030 и CHECKPOINT-05 остаются в очереди.

## Запуск

Сохраните существующий `.env`, если он уже настроен. Для новой установки скопируйте `.env.example`, сгенерируйте устойчивый секрет и укажите его в `NEXTAUTH_SECRET`:

```powershell
Copy-Item .env.example .env
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64url'))"
docker compose up --build -d
docker compose run --rm seed
```

Вход: `http://localhost:3000/login`, **admin@erp.dev / Admin123!**. Образец импортируется только явной командой. Обычный запуск app не создаёт известный аккаунт и не запускает seed.

Для host-side Prisma доступны `npm run db:seed` и `npx prisma db seed`; они читают `.env`, если он существует. Свою PostgreSQL нужно предварительно подготовить `npm run db:migrate`. При запуске Node-приложения вне Docker `DATABASE_URL` должен указывать на опубликованный порт; внутри Compose используется hostname `postgres` и порт 5432.

## Состав образца

Данные находятся в отдельном workspace `evo-sample-v1`. Faker 10.6.0 с фиксированным RNG seed генерирует имена, компании, названия товаров и суммы. Без `SEED_REFERENCE_DATE` даты привязаны к сегодняшнему дню UTC; для воспроизводимых дат задайте `YYYY-MM-DD`.

| Модель | Количество / содержание |
| --- | --- |
| User / ADMIN Membership | 1 |
| Contact | 20 |
| Deal | 10, все 6 стадий; `/crm/pipeline` |
| Invoice / InvoiceItem | 5 / 10; DRAFT, SENT, PAID, OVERDUE, CANCELLED |
| Payment | 2, полностью покрывают PAID invoice |
| Product / Warehouse | 15 / 3 |
| StockItem / StockMovement | 12 / 12; начальные IN, 3 low stock и 3 out of stock |
| Employee | 8, связи с руководителями, разные статусы |
| LeaveAllowance / Leave | 8 / 3; PENDING, APPROVED, REJECTED |
| Project / Task | 3 / 18; четыре рабочих статуса, разные приоритеты |
| Expense | 3, связаны с проектами и влияют на budget usage |
| AuditLog | 113 событий начальной загрузки |

Все цены, бюджеты, расходы и счета — EUR в целых евроцентах. Формулы счетов переиспользуют `calculateInvoice`, номера — `generateId` и InvoiceSequence по году выдачи. Остатки подтверждены неизменяемыми opening movements, а Paid — реальными поступлениями. Заявки используют общий расчёт рабочих дней. Прежний Document-реестр не заполняется копиями нормализованных сущностей.

## Повторный запуск и рабочая установка

Создание графа и audit выполняется одной транзакцией с advisory lock. Completion marker делает повторный запуск no-op: он не сбрасывает пароли, версии, последующие правки или удаления. Ошибка откатывает весь импорт. Существующий workspace с тем же id без marker либо email другого аккаунта останавливают seed до записи; аккаунты не привязываются и не повышают роль автоматически.

Для пустой рабочей установки используйте `SEED_MODE=bootstrap`, собственные `SEED_ADMIN_EMAIL`, пароль минимум 12 символов и `SEED_WORKSPACE_NAME`. Этот режим создаёт только администратора и пустой workspace. `SEED_ONLY_IF_EMPTY=true` запрещает создание нового администратора при наличии пользователей. Vercel build явно принуждает bootstrap mode и не импортирует sample graph. После первоначального bootstrap удалите пароль из окружения. Настройки Auth.js принимают NEXTAUTH_SECRET/NEXTAUTH_URL и канонические AUTH_SECRET/AUTH_URL.

## Контейнеры

- `postgres:16-alpine`, persistent volume `erp_postgres16`, healthcheck.
- `migrate` — одноразовый tools target; app ожидает успешного завершения.
- `app` — Node 24 Debian slim, Next standalone, `NODE_ENV=production`, uid 1000, healthcheck `/login`. Authenticated `/api/health` отдельно проверяет рабочую сессию и PostgreSQL.
- `seed` — явный profile tools job, тот же tooling image. Prisma CLI/tsx/Faker остаются вне runtime image app.

Сборка исключает `.env*`, `.data`, Git и host node_modules. Секреты передаются при запуске. Static/public/Geist TTF/CSS tokens копируются в runtime; tracing включает динамические PDFKit standard-fonts/data, необходимые для PDF. Host build сохраняет обычный Next output; Docker включает standalone через внутренний build flag.

Порты по умолчанию привязаны к localhost: 3000 и 5433, настраиваются APP_PORT/POSTGRES_PORT. При смене внешнего origin обновите NEXTAUTH_URL/AUTH_URL. Для нестандартного POSTGRES_PASSWORD согласуйте host DATABASE_URL и URL encoding; внутри Compose URL формируется из пароля. Новый volume не использует прежний PostgreSQL 17: каталог данных нельзя понижать до 16, требуется dump/restore. `docker compose down` сохраняет volume.

## Фактические проверки

PASS: host `npm run build`, `npx tsc --noEmit`, `npx prisma validate`, `git diff --check`; оба Docker target успешно собраны. Новые test-файлы вне CHECKPOINT не создавались: использованы временные stdin/browser проверки.

В отдельном Compose project `erp-task027` (порты 3002/5434, собственный secret/password/volume) проверены:

1. Чистая PostgreSQL 16.15: все миграции, migrate exit 0, app/postgres healthy при `up --no-build -d --wait`.
2. Свежий seed и `npx prisma db seed`: exit 0; количества, стадии, математические суммы, платежи, ledger и EUR проверены SQL/Prisma.
3. Ошибка импорта на позднем этапе полностью откатила workspace/user/stock/invoice записи до нуля. Исправленный импорт затем завершился.
4. Email занят существующим READONLY: seed exit 1; имя, пароль, роль и membership сохранены. Отдельный sentinel account после проверки удалён.
5. Повторный seed с другим предлагаемым паролем и bootstrap существующего пользователя не изменили снимок данных: SHA-256 до/после совпал, новых audit/записей нет.
6. Реальный Credentials-вход с Admin123!, authenticated `/api/health` с mode=postgresql, заполненные CRM/Finance/Inventory/HR/Projects; неожиданных pageerror нет.
7. Dashboard: Revenue €486.78, Open Deals 8, Low Stock 6 (3 low + 3 out), HR Pending 1. HR на 375 px: 8 карточек, scrollWidth=375.
8. PDF из runtime image: HTTP 200, application/pdf, `%PDF-`, 8827 байт. Проверены наличие Geist/CSS/PDFKit assets, uid 1000 и отсутствие `.env`, `.data`, Faker в app image.

Локальная существующая PostgreSQL 17 и внешняя production DB не использовались для импорта. Образец сохранён в отдельном verification volume; тестовые сервисы после проверки остановлены. В этой среде Docker Engine работает внутри Codex-Docker WSL: на время проверки дистрибутив удерживался активным отдельным процессом, чтобы он не завершался между CLI-вызовами. Повторить этот локальный стенд можно с игнорируемым `.data/task027-compose.env` и `--project-name erp-task027`; обычная установка использует `.env` по инструкции выше.

Снимки: [Dashboard](screenshots/task027-docker-dashboard.png), [Invoices](screenshots/task027-docker-invoices.png), [HR mobile](screenshots/task027-docker-hr-mobile.png).
