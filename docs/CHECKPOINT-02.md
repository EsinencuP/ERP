# CHECKPOINT-02 — CRM TASK-006–010

Дата: 18 октября 2026. Локальный production Next.js 15.5.28, Prisma 6.19.3, PostgreSQL 17.10. Реальный вход с временным AUTH_SECRET в памяти, ERP_DEMO_MODE=false. Проверочные workspace изолированы от существующих данных.

## Серверные проверки

`npm run build` — успешная production-сборка, включая contacts/detail/pipeline, Prisma generate и TypeScript. `npm run typecheck -- --noUnusedLocals --noUnusedParameters` — без ошибок. `git diff --check` — без ошибок; поиск hex в src/components не нашёл совпадений.

В рамках этого CHECKPOINT добавлен `npm run check:crm` → `scripts/checkpoint-crm.test.mjs`. Node test runner: **9/9 pass**, восемь вложенных сценариев и родительский lifecycle. Выполняются настоящие HTTP Credentials/Server Actions и SQL assertions:

1. CreateContact нормализует данные и создаёт один audit snapshot.
2. Неверные имя/email и внедрённый workspace отклоняются.
3. READONLY не может создать/изменить/удалить контакт через прямой запрос.
4. Чужой workspace не читает detail/feed и не изменяет контакт.
5. Update с устаревшей версией возвращает CONFLICT без второго audit и перезаписи.
6. Contacts query применяет search, stage, sort.
7. Deal сохраняет 20-значные копейки, stage move виден в одной из шести колонок.
8. Detail включает связанную Activity и Deal.

Скрипт допускает только локальные адреса localhost:5433/erp и http://127.0.0.1:3001, создаёт уникальные temporary workspace/users с одноразовым паролем, удаляет их в finally. Для повтора сначала запустить изолированную БД и production server на 3001 с ERP_DEMO_MODE=false, AUTH_URL=http://127.0.0.1:3001 и временным AUTH_SECRET, затем `npm run check:crm`. IDs actions читаются из текущей `.next` сборки. Пароли/секреты не записываются и не выводятся.

## Проверка браузером

| Критерий | Фактическая проверка |
| --- | --- |
| Contacts table | 25 исходных Contact, загрузка, поиск с debounce, сортировка имени asc и фильтр PROSPECT (6 строк) |
| Kanban | Сделка перетащена мышью NEW → QUALIFIED; после reload этап сохранён |
| Contact detail | Открыт контакт, видны Activity CALL и связанная Deal с точной суммой |
| Form validation | Пустое имя и неверный email показывают inline error после blur до submit |
| Sheet | Поиск таблицы получает фокус и меняет выдачу, Sheet остаётся открыта с прежним draft; body pointer-events пуст, фон не aria-hidden |
| Form save/toast | Cmd+Enter создал контакт с success toast; Ctrl+Enter изменил контакт; invalid submit показал error toast |
| Escape/focus | Несохранённый draft закрыт Escape; повторное открытие показывает серверное значение; фокус возвращается к кнопке строки |
| Concurrency | Header stage change за открытой формой дал CONFLICT при сохранении старого snapshot, без потери нового stage/сохранения draft |
| Network | Контролируемый abort create сохранил draft, показал error toast и заблокировал повтор до refresh |
| Pending | При задержанном запросе Escape не закрывает Sheet; повторный shortcut дал один HTTP create, одну запись и один audit event |
| RBAC | READONLY не имеет New/Edit/Delete; AGENT создал контакт через Sheet, Delete отсутствует; серверные запреты проверены тестом |

UI проверки дополняют Node API-набор: он не моделирует blur, toast, DnD или фокус. Ранее выполненные глубокие проверки audit rollback, bulk/CSV, всех пяти Activity types и drag modes описаны в TASK-006–009; они не объявляются повторно выполненными этим smoke checkpoint.

Светлая и тёмная темы осмотрены на 1440×900 и 390×900. Document width равен viewport; панель clientWidth/scrollWidth = 511/511 и 389/389 px. Reduced motion сокращает animation duration до 0.00001s. Снимки в игнорируемом `.playwright-mcp`: task010-1440-light/dark.png, task010-390-light/dark.png. Свежие финальные переходы contacts → pipeline → detail — без ошибок/предупреждений консоли; ожидаемые abort и старые JWT после смены временного секрета не относятся к этому проходу.

## Границы

Оба запуска автоматического набора удалили свои уникальные workspace/users в finally (остаток 0). Браузерные fixture workspace task010-a/b, четыре User, пять Session, 31 Contact, одна Deal/Activity и девять audit events удалены отдельно. Другие записи не менялись. Проверочный сервер 3001 и PostgreSQL остановлены; на 3000 восстановлен explicit demo. `.env` не менялся, временные AUTH_SECRET не сохранялись.

Этот CHECKPOINT подтверждает заданные CRM сценарии, не production readiness остальных ERP-модулей. Нет production rate limiting/MFA, workspace switching, отдельного idempotency key Activity/Contact create или полного нагрузочного/backup набора. Нормализованный CRM требует реального входа и PostgreSQL; explicit demo показывает состояние подключения без fallback.
