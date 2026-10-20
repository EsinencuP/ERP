# Проекты

Нормализованный интерфейс задач доступен в `/projects`. Прежний JSON-реестр сохранён в `/projects/documents`, без автоматического переноса данных.

DocType `Project`: `title` — название, `subtitle` — ответственный, `amount` — бюджет в копейках, `date` — обязательный дедлайн, `progress` — целый процент 0–100, `notes` — описание.

Статусы: Планирование → В работе → На проверке → Завершён. Прогресс вводится явно и не меняется автоматически при перемещении. Таблица и kanban работают с одними данными; перемещение проверяет текущую версию и сохраняет аудит.

Actions: `getProjects`, `createProject`, `updateProject`, `deleteProject`. Задачи, участники проекта как User-relations, тайм-трекинг и зависимости — следующий этап. Бюджет проекта не является фактом выручки и не создаёт счёт автоматически.


## Projects Task Kanban + List — TASK-021

`/projects` читает нормализованные Task/Project; прежний Document-реестр сохранён в `/projects/documents` с прежними legacy actions. Четыре колонки TODO/IN_PROGRESS/IN_REVIEW/DONE, priority badge, workspace-member avatar и due date. SQL migration переименовывает TaskStatus.REVIEW в IN_REVIEW на месте, без переписывания задач. Существующий CANCELLED сохранён только для чтения истории в List. DONE заполняет completedAt, reopening очищает его.

ЗАКОН 6: CRM collision detection/keyboard navigation и Pointer/Keyboard sensors вынесены в `src/hooks/use-kanban-dnd.ts`. CRM pipeline сохраняет экспортируемые adapters, Projects использует тот же factory/hook: drop только в колонки, отмена вне board, стрелки через пустую колонку. DragOverlay визуальный, отдельный handle и select-alternative. Перенос меняет статус, ручное ранжирование внутри колонок не добавляется; порядок updatedAt desc/id asc. Position и task hierarchy сохраняются.

List использует CRM-паттерн TanStack v8: getRowId, manualPagination/manualSorting и серверный whitelist sort. Оба вида читаются в одном RepeatableRead snapshot (четыре bounded column pages + list page, по 20). Поиск literal/Cyrillic через shared sqlTextMatch; общие project/assignee/priority/search, status только для List. Страницы clamp по server count. Никаких unbounded task lists. Project/member picker — общий RecordPicker с поиском/пагинацией; inactive user/member не назначается, старое назначение сохраняется при редактировании других полей.

Task CRUD и minimal project create используют live session/workspace и shared Projects RBAC: READONLY читает, AGENT+ создают/меняют, MANAGER+ удаляют leaf task. Serializable transaction, expected version и audit атомарны, retry только гарантированного P2034 rollback. Project ownership/parent не меняются через task form, delete с children запрещён. Due date хранится до конца выбранного дня Москвы; unchanged date сохраняет исходный timestamp. Неизвестный результат DnD откатывает отображение с явной ошибкой и блокирует повтор до refresh; committed status не откатывается при ошибке последующего чтения. Failed refresh скрывает старые данные, demo fallback отсутствует.

## Projects Overview — TASK-022

`/projects/overview` читает страницу из 12 нормализованных проектов и выводит progress (DONE / все Task, включая CANCELLED), бюджет/расходы, distinct team и CSS Grid timeline тех же проектов. Карточки/count/task aggregates/expense aggregates/team preview читаются в одном RepeatableRead snapshot. Search/status/projectId tenant-scoped, literal/Cyrillic search shared sqlTextMatch; страницы clamp. Team = manager UNION task assignees, ID distinct; manager первым, inactive assignments отмечены и сохранены. Preview ≤6, full team pagination по 20, без unbounded user/task arrays.

Budget usage = SUM(Expense.amount) с projectId и той же currency, за всё время. Другие валюты показаны отдельно без FX. Invoice revenue не считается расходом. Суммы Decimal→string/BigInt, только bounded bar % преобразуется в Number. Нулевой бюджет не даёт NaN/Infinity; overspend отображается явно, fill ограничен 100%, текстовый % остаётся точным. Additive migration `20261019000600_project_expenses` добавляет nullable Expense.projectId, composite tenant FK RESTRICT и индекс workspace/project/currency; прежние расходы остаются без проекта. Expense CRUD/picker и filtered deep link позволяют назначить проект, пересчёт derived без ручного spent. Старый update Expense без projectId сохраняет назначение; explicit empty снимает связь.

Настройки проекта (code/name/description/status/budget/currency/manager/startDate/endDate) используют shared Projects mutation helper, RBAC, strict Zod, captured version и atomic audit. Связи contact/task и данные legacy не меняются. Новый manager должен быть active workspace member, прежний inactive сохраняется при других правках. Бюджет не переименовывает валюту связанных расходов: они остаются отдельными валютными суммами. Project status ручной, progress всегда derived из реальных задач.

Timeline строится CSS Grid без Gantt-библиотеки: 1…93 календарных дня, default 6 недель относительно Москвы; UTC day arithmetic без DST drift. Явные Project.startDate/endDate, inclusive single-day bars, clipping по периоду и отдельный текст для незаданных/внешних дат. Частичные периоды не выдумываются. Один и тот же выбранный период сохраняется при фильтрах/страницах/refresh. Internal horizontal scroll и sticky project labels; task progress fill не меняет даты проекта. Deep links связывают overview → tasks/expenses и обратно; ошибки PostgreSQL скрывают прежние карточки/timeline без demo fallback.
