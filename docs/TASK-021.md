# TASK-021 — Projects Task Kanban + List

19 октября 2026. Выполнено.

## Результат

`/projects`: нормализованные Task/Project. Переключатель Kanban/List, общие search/project/assignee/priority и дополнительный status в List. Карточка показывает приоритет, avatar исполнителя и due date; просрочка имеет текстовую метку, DONE не помечается просроченным. Срок — до конца выбранного дня Москвы. Даты без изменения сохраняют исходный timestamp.

Kanban: TODO | IN_PROGRESS | IN_REVIEW | DONE, четыре самостоятельные страницы по 20 карточек, pointer/keyboard DnD, отдельная ручка, visual-only DragOverlay, select-alternative. Shared createKanbanDnd/useKanbanSensors извлечены из CRM pipeline; CRM использует те же адаптеры после рефакторинга. Пустые колонки поддержаны. Перенос меняет статус; порядок updatedAt desc/id asc, ручное ранжирование внутри колонки не добавлялось. Position/parentId существующих задач сохраняются.

List: TanStack Table v8, паттерн CRM Contacts — manualPagination/manualSorting, stable getRowId, whitelist title/status/priority/dueAt/updatedAt и NULLS LAST для срока. Приоритет сортируется в enum-порядке LOW/MEDIUM/HIGH/URGENT. Board/list читаются из одного RepeatableRead snapshot, страницы ограничены и clamp по count. Literal/Cyrillic search использует общий sqlTextMatch. Старый CANCELLED сохранён в read-only истории List, без пятой рабочей колонки.

Task CRUD и минимальное создание проекта (code/name) позволяют работать с пустым workspace без скрытого seed. Project и активный workspace-member выбираются общим RecordPicker с поиском/пагинацией по 20. Проект существующей задачи менять нельзя, parent/hierarchy не редактируются; leaf delete защищает подзадачи. Прежний JSON-реестр и его actions сохранены в `/projects/documents`, без смешивания/автомиграции; старый count badge отображается только в реестре.

READONLY читает, AGENT+ создают/меняют, MANAGER+ удаляют. Сервер берёт workspace/роль из live session, проверяет strict Zod, версии и tenant relations. Serializable mutations и audit атомарны; только гарантированный P2034 rollback допускает retry. DONE сохраняет completedAt, reopening очищает его, same-status — no-op. При конфликте/неизвестном исходе перенос возвращает отображение к snapshot с явной ошибкой и блокировкой до refresh; подтверждённый commit не откатывается при ошибке последующего чтения.

Migration `20261019000500_task_review_status` переименовывает PostgreSQL enum REVIEW → IN_REVIEW на месте. Модели/FK/данные сохраняются; 10 миграций локальной БД актуальны.

## Проверки

- Финальные `npm run build`, `npx tsc --noEmit --noUnusedLocals --noUnusedParameters`, Prisma validate/status/schema diff и `git diff --check` прошли. Новых зависимостей нет.
- Миграция на PostgreSQL 17.10: созданная до неё REVIEW-задача сохранила ID, projectId и version=1, статус стал IN_REVIEW.
- Реальные HTTP/Auth.js/PostgreSQL: task create/update/delete, все четыре статуса, completedAt/reopening/no-op, срок 25.10.2026 → 20:59:59.999Z, stale versions и два конкурентных переноса — один успех/один конфликт. Подмена workspace/старый REVIEW/неверные даты/чужой проект/чужой или inactive assignee отклонены. Родитель с подзадачей не удаляется. Пять ролей/live membership и tenant isolation, включая SUPER_ADMIN, подтверждены.
- Пагинация: 23 совпадения → 20+3 для TODO и List, без пересечения; чрезмерная страница clamp до второй. Literal `%_` не становится wildcard, кириллица работает. CANCELLED остаётся вне четырёх колонок, доступен в List и не меняется через API.
- Сбой audit откатывает task create/update/status/delete и project create целиком, включая версии/count/completedAt. По одной успешной UI операции create/edit/delete соответствует ровно один audit event. Временный constraint удалён.
- Браузер: pointer и keyboard переносы, select-alternative, создание/редактирование/удаление задачи, минимальный проект и пустое состояние, project/assignee pickers внутри Sheet, поиск, server sort, переключение видов. Ctrl+Enter и Escape. Конфликт после изменения второй сессией: UI rollback TODO/locked, refresh получает реальный IN_REVIEW. При искусственном обрыве сети — один запрос, повтор заблокирован до refresh.
- CRM regression: shared-hook keyboard NEW → QUALIFIED и возврат в пустой NEW сохранены в БД, версия сделки 3. Прежний Projects реестр открывается отдельно и остаётся пустым при наличии нормализованных задач.
- READONLY: create/drag отсутствуют, 5 status selects disabled; AGENT: create и 5 drag handles, delete отсутствует. Обычная свежая консоль — 0 errors/warnings; искусственный network abort проверялся отдельно.
- Обе темы/1440 px, mobile 390×844, Sheet 390×844, reduced motion. Устранено переполнение от absolute sr-only label: TaskCard получил relative, как CRM DealCard. Итоговая ширина документа 390 px в обоих видах; Kanban scroll region 350/1072 px, таблица прокручивается внутри. Основные итоговые скриншоты сохранены после завершения анимаций.
- Loading скрывает старую доску; при остановке PostgreSQL показана ошибка сервиса авторизации, видимых карточек/строк 0, демоданные не появляются.

Проверки выполнены одноразовыми командами и в браузере. Тестовых файлов вне CHECKPOINT не создавалось. Собственные workspace/users/projects/tasks/CRM fixtures/audits и metadata удалены; cookies очищены, локальные серверы остановлены. Изменения TASK-018–020 сохранены; commit/push не выполнялись. Внешняя production-миграция не выполнялась.

## Скриншоты

[Kanban dark](screenshots/task-021-kanban-dark.png), [Kanban light](screenshots/task-021-kanban-light.png), [List dark](screenshots/task-021-list-dark.png), [List light](screenshots/task-021-list-light.png), [mobile](screenshots/task-021-kanban-mobile.png), [mobile board](screenshots/task-021-kanban-mobile-board.png), [mobile list](screenshots/task-021-list-mobile.png), [форма dark](screenshots/task-021-task-form-dark.png), [форма mobile](screenshots/task-021-task-form-mobile.png), [empty](screenshots/task-021-empty-light.png), [конфликт](screenshots/task-021-move-conflict.png), [loading](screenshots/task-021-loading.png), [PostgreSQL error](screenshots/task-021-postgres-error.png), [CRM regression](screenshots/task-021-crm-regression.png).
