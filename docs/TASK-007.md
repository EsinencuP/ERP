# TASK-007 — CRM Contacts Table (TanStack Table)

Статус: **ЗАКРЫТ**. Дата: 18 октября 2026.

## Что реализовано

- `/crm/contacts/page.tsx` — Server Component, передаёт клиенту initialData из getContacts и стабильное initialNow для relative dates. `/crm` сохраняет прежние сделки; вкладки связывают два экрана.
- TanStack Table v8 с колонками checkbox / Avatar+Name / Company / Email / Stage Badge / Assigned Avatar+Name / Created relative / Actions. Карточка просмотра контакта доступна всем ролям на чтение.
- Серверные пагинация 20/50/100, сортировка и stage-фильтр; поиск с debounce 300 ms. Устаревший запрос не перезаписывает новую выборку.
- Выбор по id/version до 100 контактов, сохраняется между страницами; header checkbox действует на текущую страницу и имеет реальное indeterminate. Фильтры/сортировка/обновление снимают выбор.
- Атомарные bulk delete/reassign с проверками всех версий, tenant, активного ответственного и зависимостей; один audit snapshot на контакт. При отказе одной записи/аудита нет частичного результата.
- Серверный MANAGER+ CSV: выбранные контакты либо весь фильтр до 5000 записей. Превышение лимита явно отклоняется. Общий downloadCsv сохраняет BOM/escaping и нейтрализует формулы, включая пробельные префиксы.
- Skeleton для первого route request и последующих загрузок; empty/filter-empty/error/retry/busy; формы назначения с поиском активных участников. Использованы общие primitives, ConfirmDialog расширен optional confirmLabel без нарушения других модулей.
- Документация: architecture, modules/crm, roadmap, references, verification; общий debounce hook описан в hooks/README. Зависимости и миграции не добавлены.

## Проверки

`npm run build` — успешно, Next.js 15.5.28, Prisma Client 6.19.3; `npm run typecheck` и `git diff --check` — без ошибок. Hex-совпадений в src/components нет. Explicit TypeScript any/throw не добавлялись. Тестовые файлы вне CHECKPOINT не создавались.

Ручные HTTP/SQL проверки на локальной PostgreSQL 17.10 и production-сборке с реальными Credentials/JWT: 25 проверок API плюс отдельная проверка лимита 5000.

| Сценарий | Результат |
| --- | --- |
| Anonymous | UNAUTHORIZED |
| AGENT / READONLY export | FORBIDDEN |
| READONLY reassign / AGENT delete | FORBIDDEN |
| MANAGER export | Полный фильтр, включая контакты с других страниц |
| Contact owner include | Только id/name/avatar, без passwordHash/Membership |
| Поиск ответственного | Только активные участники своего workspace |
| Чужой выбранный id в CSV/bulk | NOT_FOUND, локальная часть выборки не изменена |
| Повторяющиеся IDs / >100 выбранных | VALIDATION |
| Stale version в одной записи выборки | CONFLICT, остальные версии не изменены |
| Чужой ответственный | VALIDATION |
| Контакт со связанной сделкой | Вся bulk delete отклонена, свободный контакт сохранён |
| Принудительный отказ audit INSERT на второй записи | STORAGE; первая запись и её аудит тоже откатились |
| AGENT reassign двух контактов | Обе version увеличены, два audit events |
| MANAGER delete двух контактов | Обе записи удалены, два audit events |
| Selected CSV | Точная выборка IDs |
| Фильтр на 5001 контакте | VALIDATION с лимитом 5000; тихой обрезки нет |

Браузер с реальными данными:

- SSR передал первую страницу из 20 контактов; видны все восемь колонок, относительное время, этапы и владельцы.
- Выбор на первой и второй страницах сохранён при возврате; header checkbox получил indeterminate. Клавиша Space управляет checkbox.
- CSV выбранных двух контактов скачан и прочитан: ровно две строки данных. Имя `=SUM(1,2)` и компания с пробельным префиксом формулы экранированы апострофом и корректными CSV кавычками.
- Bulk reassign через диалог и bulk delete двух контактов прошли; SQL подтвердил новые owner/version и audit, удалённые контакты отсутствуют.
- Быстрый ввод трёх вариантов строки дал один запрос примерно через 300 ms после последнего input. Stage-фильтр, asc sorting по имени, карточка контакта и пустой результат работают.
- Задержка ответа показывает Skeleton; имитация сетевого отказа показывает error, повторный запрос восстанавливает таблицу. Ошибка в консоли при намеренном abort ожидаема; свежий финальный переход — без console errors/pageerror.
- Для MANAGER видны export/reassign/delete; для AGENT только reassign; READONLY не видит мутации/экспорт. Серверные отказы проверены независимо от скрытых кнопок.
- Визуально осмотрены desktop 1440 px и mobile 390 px, обе темы. Mobile document scrollWidth=390 при viewport=390; горизонтальный scroll локален таблице. Размер 50 показывает всю текущую небольшую выборку. Reduced motion сокращает animation duration до 0.00001s.

Артефакты в игнорируемом `.playwright-mcp`: task007-initial.png, task007-mobile-dark.png, task007-mobile-light.png, task007-desktop-light.png, task007-final-light.png, evo-contacts.csv.

Собственные временные workspace, пользователи, Session, контакты/сделка и audit удалены. Отдельные 5001 записи проверки лимита и временное SQL CHECK удалены. Другие данные не менялись. Проверочный real-auth сервер 3001 и PostgreSQL остановлены, explicit demo на 3000 оставлен работающим. `.env` не менялся; временный AUTH_SECRET не сохранён.

## Границы

Новая таблица требует реального входа и PostgreSQL, как CRM API TASK-006. В текущем explicit demo показывает состояние подключения; файлы демо не подставляются вместо БД. Форма создания/редактирования контакта не входит в TASK-007, как и миграция старых Document сделок на Deal. Фильтры хранятся в состоянии страницы, не в URL. Экспорт ограничен 5000 результатами, selection/bulk — 100 записями. Полный автоматический набор интеграционных проверок остаётся CHECKPOINT.
