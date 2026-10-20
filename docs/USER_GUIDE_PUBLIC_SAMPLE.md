# Пользовательская инструкция и публичное учебное пространство

20.10.2026. Выполнено по уточнению пользователя после TASK-030.

## Инструкция

Корневой INSTRUCTIONS.md полностью переписан как руководство пользователя на русском: первый вход, назначение каждого модуля, ежедневные действия, статусы, права, ограничения и частые вопросы. Команды установки, env variables и шаблон нового модуля перенесены в [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md); все десять законов сохранены, AGENTS.md указывает на технические правила.

Страница [user-guide.html](https://erp-xi-pink.vercel.app/user-guide.html) доступна без входа. Она генерируется из INSTRUCTIONS.md во время обычной/Vercel сборки: 12 разделов, оглавление с якорями, 5 таблиц, Geist, CSS variables проекта, reduced motion и внутренний scroll таблиц. Отдельной редактируемой копии содержания нет.

## Учебный набор

На [опубликованной ERP](https://erp-xi-pink.vercel.app) создано самостоятельное пространство Evo Sample Company. Публичный учебный вход: admin@erp.dev / Admin123!. Существующие компании и их учётные записи не присоединяются к учебному пространству.

| Участник | Email | Роль / статус |
| --- | --- | --- |
| Sample Administrator | admin@erp.dev | ADMIN, активен |
| Emma Carter | sales@sample.erp.example | MANAGER, активна |
| Noah Bennett | finance@sample.erp.example | AGENT, активен; есть история отключения/восстановления |
| Olivia Reed | warehouse@sample.erp.example | AGENT, активна |
| Lucas Brooks | projects@sample.erp.example | MANAGER, активен |
| Ava Chen | analyst@sample.erp.example | READONLY, деактивирована |

Пять дополнительных аккаунтов используют пароль выбранного sample seed, по умолчанию Admin123!; неактивный участник не может войти до восстановления доступа администратором. Эти реквизиты предназначены только для общедоступных искусственных данных.

Итог: 6 участников, 26 контактов, 16 сделок воронки (все шесть стадий), 6 активностей, 5 самостоятельных строк таблицы CRM с разными статусами, 5 счетов, 15 товаров, 3 склада, 8 сотрудников, 3 проекта и 18 задач. Исходные оплаты/расходы/складской ledger сохранены.

Пакет v2 создаёт 41 audit event, включая 12 событий участников; вместе с исходными 113 получается 154 события до обычной работы посетителей. Audit date показывает момент импорта. Поля sampleScenario/illustrativeOccurredAt явно отделяют учебную сценарную историю от реальных действий. Пароли/хеши в snapshots не попадают. Последние входы образца также искусственные; реальный вход штатно обновляет значение.

## Сохранность данных

Seed проверяет base/completion markers под advisory lock. На старом sample он добавляет пакет v2; существующие имена, пароли, роли и бизнес-записи не перезаписываются. При занятом email/ID без marker импорт отказывается присваивать чужой аккаунт. Повтор после marker — no-op, включая последующие пользовательские правки. Late write/audit failure откатывает всю текущую транзакцию.

Для производства добавлен отдельный явный build flag SEED_PUBLIC_SAMPLE=true. Он выполняет sample только в workspace evo-sample-v1 с публичными реквизитами; обычный build сохраняет прежний bootstrap-only/default режим. Preview sample не импортирует. При публикации flag передан только данному deployment; секреты БД остаются в серверном окружении Vercel.

## Проверки

- npm run build и npx tsc --noEmit: PASS.
- На локальной реальной PostgreSQL 16: upgrade существующего v1 sample сохранил исходные records/credentials; повторный seed сохранил SHA-256 снимка всех затронутых сущностей.
- На новой временной БД: все 14 миграций, конфликт email без захвата аккаунта, полный rollback искусственной поздней ошибки и успешный fresh seed: PASS. Временная БД удалена после проверки.
- Vercel deployment `dpl_ByTVBzdTeqo8dyajPiwLYrAaPCKA`, source commit 643ce79: READY. Cloud logs подтверждают Public training sample, полный импорт и генерацию User guide; миграций к применению не было.
- На публичном домене выполнен настоящий вход admin@erp.dev; health 200/ready/mode=postgresql, выбрано Evo Sample Company. Users: ровно 6 участников, роли/активность/last login отображены.
- Audit: последние 100, среди них 12 событий участников со snapshots. CRM table: 5 строк; Pipeline: 16 и шесть новых предметных сценариев с ответственными и активностями.
- Finance: 5 счетов; Inventory: 15 строк; HR/Projects/Overview: 200 без ErrorPanel.
- Руководство анонимно 200; на 375 px scrollWidth=375, 12 разделов/12 якорей. Снимки просмотрены. Browser warnings/errors=0 в проверенном опубликованном потоке.
- Dry deployment проверен до реальной загрузки. Добавлена .vercelignore: итоговые 440 source paths содержали новые guide/seed scripts и исключали .data, секретные env, локальную БД, node_modules и build artifacts. Реально загружено 2.5 MB исходников, не локальное хранилище.

Снимки: [Users](screenshots/public-sample-members.png), [Pipeline](screenshots/public-sample-pipeline.png), [User guide 375px](screenshots/public-user-guide-mobile.png).
