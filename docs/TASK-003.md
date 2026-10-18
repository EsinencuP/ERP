# TASK-003 — Shared типы + utils + error handling

Статус: **ЗАКРЫТ**. Дата: 18 октября 2026, Europe/Moscow.

## Выполнено

- `src/types/shared.ts`: сохранён generic Result<T,E=AppError>, добавлены PaginatedResponse<T>, SortConfig<TField>, operator-discriminated FilterConfig<TField> и FilterValue. Типы не зависят от серверных пакетов.
- `src/lib/errors.ts`: ok(data), err(code,message,meta?), createError(code,message,meta?), isNotFound(unknown). Последний распознаёт AppError/failed Result с NOT_FOUND и Prisma-подобный P2025, без Prisma import. Старые success/failure сохранены и используют общие конструкторы.
- `src/lib/utils.ts`: cn, formatCurrency, formatDate, generateId, truncate; старые money/dateLabel/initials сохранены. Money использует общий форматтер, сервисы документов и платежей — общий generateId с прежним UUID-форматом.
- `src/lib/db.ts`: сохранён globalThis singleton для dev hot reload, добавлены server-only guard и JSDoc. Production использует кеш модуля. Миграции, seed, подключение и конфигурация деморежима не менялись.
- `docs/architecture.md`: документированы Result, narrowing, helpers, безопасные metadata, пагинация/фильтры, единицы валют, форматирование дат и жизненный цикл клиента БД.

## Проверки

`npm run typecheck -- --noUnusedLocals --noUnusedParameters` — успешно. `npm run build` — успешная production-сборка Next.js 15.5.28 и генерация Prisma Client 6.19.3.

Одноразовые вызовы helpers из CLI (без тестовых файлов) дали:

| Ввод/сценарий | Результат |
| --- | --- |
| ok / err | Ветки {ok:true,data} и {ok:false,error}; aliases совместимы |
| createError без meta | Собственного поля meta нет, undefined не сериализуется |
| isNotFound | true для NOT_FOUND и P2025, false для P2002 и null |
| formatCurrency(12345) | 123,45 ₽ |
| formatCurrency("9007199254740993") | 90 071 992 547 409,93 ₽, без JS number |
| formatCurrency(-1) | -0,01 ₽ |
| 123 JPY / 1001 KWD | 123 ¥ / 1,001 KWD |
| Дробные/небезопасные number, неверная строка/код валюты | «—» |
| formatDate("2026-10-18") | 18.10.2026 |
| formatDate с "d MMMM yyyy" | 18 октября 2026 |
| Неверный день, Invalid Date, неверный формат | «—» |
| truncate("A👨‍👩‍👧‍👦BC",3) | A👨‍👩‍👧‍👦…; emoji не разрезан |
| Combining sequence / нулевой лимит | Графема сохранена / пустая строка |
| cn("p-2","p-4") | p-4 |
| generateId("invoice") | invoice_UUID |

Собранное приложение запущено на 127.0.0.1:3001 с существующим явно включённым деморежимом. `/api/health` вернул 200 с Result, ready и mode=demo; `/finance` показал прежние шесть счетов и суммы. Осмотрены 1440 px desktop и 390×844 mobile: общий горизонтальный overflow отсутствует, таблица прокручивается в своём контейнере. Консоль: 0 ошибок, 0 предупреждений. Бизнес-данные не изменялись. [Desktop](screenshots/task-003-finance.png), [mobile](screenshots/task-003-finance-mobile.png).

## Границы

formatCurrency принимает целые минимальные единицы и возвращает строку для отображения; проверку входных денежных данных выполняет сервис. formatDate использует локальную timezone среды выполнения; для одинакового timestamp в SSR/client нужно согласовать timezone или передать отформатированный текст. Старый dateLabel продолжает использовать Europe/Moscow.

Shared-типы не реализуют серверную пагинацию и не заменяют runtime Zod-валидацию, авторизацию или whitelist полей. Генерация UUID доступна в Node.js и secure browser context. Импорт db предназначен для Next.js server modules; server-only обрабатывается Next.js, standalone CLI bootstrap по-прежнему создаёт отдельный клиент в prisma/seed.ts. Hot reload singleton проверен по исходному globalThis-паттерну и сборке; отдельная runtime-проверка hot reload не заявляется.

Новых зависимостей и тестовых файлов нет. Проверочный production-сервер после осмотра остановлен. Полный автоматический набор выполняется только в CHECKPOINT.
