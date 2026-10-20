# Команда / HR

## Нормализованный каталог — TASK-018

`/hr`: Grid с Avatar (инициалы), Name, Position, Department, Status и List с теми же полями, номером/email/руководителем. Переключение не сбрасывает поиск/страницу. Literal SQL-поиск через общий sqlTextMatch поддерживает кириллицу даже на PostgreSQL collation C, символы %/_/backslash не становятся wildcards. Поиск по имени/номеру/должности/отделу/email, department/status и пагинация по 12 выполняются на сервере; page/count выполняются Promise.all. Отделы читаются отдельно (до 500 distinct names); ошибка фильтра не превращается в пустые данные.

Профиль: табельный номер (уникален в workspace), имя, должность, отдел, рабочие email/телефон, календарная дата приёма, ACTIVE/ON_LEAVE/TERMINATED, руководитель. Руководитель ищется среди первых 20 совпадений, можно снять назначение. Strict input не принимает workspace/userId/version; версии передаются отдельно. Создание сотрудника не создаёт User. Payroll/зарплата не добавляются.

Non-modal Sheet/RHF/Zod onBlur, Ctrl/Cmd+Enter/Escape, возвращение фокуса, toast, фиксированная opening version и блокировка повтора при неизвестном результате. Query/action/service используют live workspace. READONLY читает, AGENT+ create/update; delete только ADMIN/SUPER_ADMIN по существующей HR-политике. Удаление с reports/leave history запрещено. Все мутации и audit атомарны в Serializable transaction, только P2034 допускает автоматический retry.

## Оргструктура

`/hr/org-chart`: рекурсивный EmployeeBranch по managerId, несколько корней без руководителя, все статусы. Кнопки с aria-expanded/controls раскрывают прямых подчинённых; вложенные списки поддерживают клавиатуру через обычные buttons. Вся схема прокручивается внутри своей области. DTO ограничен идентификационными/организационными полями, без контактных данных.

Полный набор ограничен 2000 узлами с явной ошибкой превышения, без тихого усечения. Циклы проверяются до рендера, включая компоненты без корня. Сервис отклоняет self-manager и назначение подчинённого руководителем, проверяя tenant-scoped recursive ancestor chain. Concurrent reparent защищён Serializable isolation. Отсутствие/чужой manager возвращает NOT_FOUND. Новые миграции не нужны: self-relation и tenant FK уже есть в TASK-002.

Loading/error/empty состояния явные, Refresh читает свежие данные. Ошибка PostgreSQL не заменяется demo/нулями. Явный demo получает CONFIGURATION в нормализованных вкладках; прежний реестр доступен отдельно.

## Прежний реестр `/hr/documents`

Document Employee: title/name, subtitle/position+department, email, amount/salary, date/hire date, notes и статусы Работает/В отпуске/Неактивен. Данные не смешиваются с Employee и не мигрируются автоматически. Legacy actions явно называются getEmployeeDocuments/createEmployeeDocument/updateEmployeeDocument/deleteEmployeeDocument. MANAGER не удаляет HR, READONLY не пишет. Зарплаты legacy-слоя сохраняют существующие права; отдельная кадровая модель доступа остаётся будущей задачей.


## Управление отпусками — TASK-019

`/hr/leaves`: заявка Employee, type (ANNUAL/SICK/UNPAID/PARENTAL/OTHER), startDate, endDate, reason. Дни вычисляются date-fns differenceInBusinessDays(end,start) + рабочий end, обе даты включены. Суббота/воскресенье исключены, праздники/переносы/half days/остатки отпусков не моделируются. Только положительные 1…9999 целых рабочих дней; хранение Decimal(6,2), DTO string без преобразования arbitrary Decimal → Number. Клиент показывает preview, сервер пересчитывает и не принимает подмену days/status/workspace/approver.

PENDING → APPROVED / REJECTED доступно MANAGER/ADMIN/SUPER_ADMIN по всему workspace; HR self-relation не ограничивает согласование прямыми подчинёнными. AGENT+ создают для сотрудников workspace, READONLY читает. Решение сохраняет actor в approvedById и увеличивает version; повтор/устаревшее решение CONFLICT. Финальные записи неизменяемы через API, CANCELLED доступен только для чтения существующей истории enum, новых переходов в него нет.

Serializable transaction: employee existence/status, overlap check PENDING/APPROVED, insert/update и audit. Параллельные пересекающиеся заявки/решения защищены; audit failure откатывает всё. REJECTED не блокирует повторную заявку. TERMINATED Employee не получает новую/одобренную заявку, отказ допустим. Связанный Leave блокирует удаление Employee. Одобрение не меняет Employee.status: будущее отсутствие не означает отпуск сегодня.

Таблица по умолчанию PENDING, поиск по имени/номеру/отделу (literal Cyrillic), status/type и серверная пагинация. Detail показывает полную причину и автора решения. Формы используют общий EmployeePicker, Sheet/RHF/Zod, Ctrl+Enter/Escape и защиту неизвестного результата. Manager sidebar badge считает все PENDING workspace независимо от таблицы, поддерживает collapsed/mobile/99+, focus/navigation/change refresh; ошибка !, недоступная роль скрывает badge. Layout получает count параллельно с остальными данными.


## HR Employee Profile — TASK-020

`/hr/[id]`: header с Avatar/Name/Position/Status; слева данные Employee, контакты и named document links, справа годовой leave balance и Reporting to. Имена в Grid/List/Org Chart и руководитель ведут в профиль. Профиль редактируется общей EmployeeFormSheet; документы — отдельные versioned EmployeeDocumentLink с title/url/notes. URL только http(s), без credentials, при рендере повторная валидация; файл не загружается и сервер не запрашивает URL.

Новая LeaveAllowance хранит ручной целый лимит 0…9999 рабочих дней на Employee/year, без неявного default. Нет записи → «Не задан», 0 — явный нулевой лимит. Назначают MANAGER/ADMIN/SUPER_ADMIN; version=0 допустима только при отсутствии записи. Остаток = лимит − APPROVED ANNUAL weekdays в выбранном календарном году, включая будущие дни; PENDING отдельно. SQL клипует переходящий отпуск границами года и исключает выходные. Другие типы/статусы не входят; отрицательный остаток сохраняется. Праздники, half-days, автоматические начисления и carryover не моделируются; лимит не блокирует workflow согласования.

Профиль проверяет live session/tenant, независимые документы/count/manager/balance читает Promise.all; баланс и лимит одним SQL statement, документы по 10 на странице. Весь профиль не является единым snapshot. Documents/allowance mutations используют существующий HR RBAC, strict Zod, version, Serializable и atomic audit. Document delete только ADMIN/SUPER_ADMIN. Новые tenant composite FK и CHECK в additive migration `20261019000400_employee_profile`. Employee с документами/лимитами удалять нельзя. PostgreSQL error скрывает прежние данные и не включает demo fallback.
