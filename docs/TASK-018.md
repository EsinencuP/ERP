# TASK-018 — HR Employee Directory + Org Chart

19 октября 2026. **Закрыт.**

`/hr` использует нормализованный Employee: Grid (Avatar с инициалами, Name, Position, Department, Status) и List с переключателем без сброса фильтров/страницы. Добавлены серверные literal search, department/status и пагинация по 12. Профиль создаётся/редактируется через shared Sheet; руководитель выбирается поиском. Удаление сохраняет сотрудников с подчинёнными или историей отпусков. Прежние Document-данные доступны отдельно в `/hr/documents`.

`/hr/org-chart`: рекурсивный EmployeeBranch по существующей manager self-relation. Корни — сотрудники без руководителя; ветки раскрываются кнопками с aria-expanded/controls. Показаны все статусы. Перед рендером проверяется целостность всего графа, включая циклы без корня. Полный граф ограничен 2000 узлами с явной ошибкой превышения, без тихого усечения. Отделы фильтра ограничены 500 distinct names. Новых моделей, миграций и зависимостей нет.

Live workspace/RBAC проверяются на сервере. READONLY читает, AGENT/MANAGER создают и редактируют, HR delete — ADMIN/SUPER_ADMIN. Version и atomic audit защищают изменения; Serializable isolation и recursive ancestor query предотвращают self/descendant/concurrent cycles. User/login и зарплата не создаются. Общий sqlTextMatch вынесен из Inventory для кириллицы при PostgreSQL collation C; Inventory сохраняет прежний API.

## Проверки

- Финальные `npm run build` и `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` успешны.
- Prisma validate/status/diff: 8 применённых миграций, различий со схемой нет.
- Настоящие HTTP Server Actions/Auth.js/PostgreSQL: create/read/update/delete, уникальный табельный номер, нормализация, strict input, несуществующая дата, stale version и один audit на update.
- Literal `%`, `_`, backslash и регистр кириллицы; 18 сотрудников, страницы 12 + 6 без пересечения, department/status и два корня оргструктуры. DTO графа не содержит email/userId.
- SUPER_ADMIN/ADMIN/MANAGER/AGENT/READONLY и второй workspace: разрешённые операции, запрещённые записи/HR delete и чужие идентификаторы. SUPER_ADMIN также ограничен своим membership/workspace.
- Self/descendant manager отклонены; два конкурентных назначения A→B/B→A дают ровно один успех. Удаление руководителя с reports запрещено. Искусственный сбой аудита полностью откатывает создание и audit. Двухузловой цикл, внесённый только в собственные fixtures, отклонён чтением графа; 2001 узел возвращает ошибку лимита. Все временные нарушения устранены.
- Legacy HR create/read/delete не меняет normalized directory. Inventory literal/Cyrillic search после выделения общего helper прошёл регрессионную проверку.
- Браузер: одинаковые id в Grid/List; фильтры/страницы; создание, смена руководителя/статуса и удаление. Для UI-профиля подтверждены ровно один created, один updated и один deleted audit. Ctrl+Enter, blur/submit validation, Escape/возврат фокуса, READONLY/foreign, empty/no-match и сворачивание веток Enter/Space проверены.
- Dark/light, desktop 1440 px, mobile 390×844. Общая ширина документа 390 px, таблица прокручивается внутри; Sheet занимает 390×844. Максимальные имя/должность/отдел/номер не переполняют карточку. Reduced motion завершает анимации, обычные переходы: 0 console errors/warnings.
- При остановленной PostgreSQL refresh каталога и оргструктуры скрывает записи и показывает ошибку сервиса, без demo/старого дерева.

Тестовые файлы не создавались: TASK-018 не CHECKPOINT. Проверки выполнялись одноразовыми запросами и в браузере. Собственные workspace, пользователи, сотрудники и audit удалены, временный audit constraint снят. Cookie очищены, проверочные Next.js/PostgreSQL остановлены. Пользовательские данные не затрагивались. Коммит/push для этой задачи не создавались.

Скриншоты: [Grid dark](screenshots/task-018-directory-grid-dark.png), [Grid light](screenshots/task-018-directory-grid-light.png), [List dark](screenshots/task-018-directory-list-dark.png), [List light](screenshots/task-018-directory-list-light.png), [mobile](screenshots/task-018-directory-mobile.png), [empty](screenshots/task-018-directory-empty.png), [профиль](screenshots/task-018-employee-form-dark.png), [профиль mobile](screenshots/task-018-employee-form-mobile.png), [оргструктура light](screenshots/task-018-org-chart-light.png), [dark](screenshots/task-018-org-chart-dark.png), [mobile](screenshots/task-018-org-chart-mobile.png), [loading](screenshots/task-018-org-chart-loading.png), [ошибка PostgreSQL](screenshots/task-018-org-chart-error.png).
