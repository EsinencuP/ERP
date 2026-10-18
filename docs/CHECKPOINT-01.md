# CHECKPOINT-01 — Foundation TASK-001–TASK-005

Статус: **ПРОЙДЕН**. Дата: 18 октября 2026, Europe/Moscow.

## Критерии пользователя

| Критерий | Фактический результат |
| --- | --- |
| `npm run build`, 0 ошибок | Финальная production-сборка Next.js 15.5.28 успешна; Prisma Client 6.19.3 сгенерирован |
| Запуск | `npm start`, ready на 127.0.0.1:3000 |
| Login page | HTTP 200, заголовок «С возвращением.», переход «Открыть демо» открывает dashboard |
| Dashboard layout | HTTP 200; Sidebar/Header/content, Overview/Business/Operations/System, все семь ссылок работают |
| Dark/light | Header переключает темы, Settings отражает выбор, light сохраняется после reload, dark восстановлен |
| `grep -r "#[0-9a-fA-F]" src/components/` | 0 совпадений (эквивалентный поиск rg и рекурсивная проверка Python в Windows) |
| Git commit | Запрошенное сообщение: `feat(foundation): TASK-001-005 project setup, schema, auth, layout` |

`npm run typecheck -- --noUnusedLocals --noUnusedParameters` также прошёл. HTTP 200 получили `/`, `/login`, `/crm`, `/finance`, `/inventory`, `/hr`, `/projects`, `/settings`, `/api/health`; `/favicon.ico` разрешился через redirect в icon.svg с финальным 200. Health вернул Result ready/mode=demo.

## Поведение Shell

- Desktop Sidebar меняет ширину 248→80→248 px с transition left/right/width 0.2s. Состояние false записано cookie, сохраняется после reload и между маршрутами; compact Tooltip показывает Projects. Ctrl+B работает.
- Все семь пунктов получили ровно свой aria-current=page. Indicator переместился с translateY(38px) к 170px при Dashboard→Finance; transform transition 0.18s, opacity 0.15s.
- DOM Header trigger остался тем же между маршрутами, wrapper template сменился; route animationDuration=0.15s. Reduced motion дал 0.00001s.
- Mobile 390×844: Sheet 288 px, documentWidth=390. Tab оставался в диалоге в 18 последовательных нажатиях. Escape и кнопка закрытия возвращают фокус на Header trigger; переход по HR закрывает меню и меняет breadcrumbs. Все группы и профиль доступны.
- Header/Settings используют общую light/dark тему. Cmd/Ctrl+K открывает поиск, Escape закрывает его. На финальных переходах — 0 console errors/warnings. Первоначальный favicon 404 исправлен и повторно проверен.

Скриншоты и состав файлов — [TASK-005.md](TASK-005.md).

## Границы checkpoint и коммита

Этот CHECKPOINT выполняет заданный пользователем foundation-перечень. В текущем `.env` явно включён деморежим; он не является подменой отказавшей PostgreSQL. Реальные Credentials/JWT, пять ролей, отзыв сессий, tenant IDs и отсутствие демофолбэка проверены отдельно в [TASK-004.md](TASK-004.md), миграция/точный Decimal — в [TASK-002.md](TASK-002.md). Полный автоматический CHECKPOINT-DB с конкурентными бизнес-операциями остаётся будущей задачей.

Бизнес-данные при проверке Shell не изменялись, новые тестовые файлы/зависимости не добавлялись. Коммит объединяет накопленные foundation-файлы TASK-001–005: приложение, Prisma schema/migrations, auth/RBAC, дизайн-систему, новый shell и документацию. `.env`, `.data`, node_modules, .next и временные Playwright-файлы исключены правилами Git. Существовавшее удаление устаревшего генератора модулей сохраняется: он перезаписывал бы ручные модульные изменения.

Сервер 127.0.0.1:3000 оставлен запущенным для просмотра результата.
