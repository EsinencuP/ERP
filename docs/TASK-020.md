# TASK-020 — HR Employee Profile Page

19 октября 2026. Выполнено по согласованному варианту: ручной годовой лимит и именованные ссылки на документы.

## Результат

`/hr/[id]`: header с Avatar/Name/Position/Status; слева Personal/Contact/Docs, справа Leave balance и Reporting to. Переходы из Grid/List, оргструктуры и карточки руководителя. Общая EmployeeFormSheet редактирует рабочий профиль; отсутствующие данные не подменяются вымышленными полями. Avatar использует инициалы.

Документы: title, http(s) URL и необязательное примечание, CRUD с пагинацией по 10. Ссылка открывается в новой вкладке с noopener/noreferrer, credentials и небезопасные схемы запрещены сервером и повторно при рендере. Файлы остаются во внешнем хранилище, сервер URL не запрашивает. AGENT+ добавляют/меняют, удаляют ADMIN/SUPER_ADMIN по существующей HR-политике.

LeaveAllowance: явный целый лимит 0…9999 рабочих дней на сотрудника/календарный год; назначают MANAGER/ADMIN/SUPER_ADMIN. Отсутствие записи показывает «Не задан», нулевой лимит сохраняется как 0. Год выбирается вручную, по умолчанию текущий год Москвы. Остаток = лимит − APPROVED ANNUAL weekdays в выбранном году, включая будущие одобренные дни. PENDING отдельно и не уменьшает остаток. Пересекающий Новый год отпуск делится по календарным границам; отрицательный остаток отображается.

Новая additive migration `20261019000400_employee_profile` добавляет EmployeeDocumentLink и LeaveAllowance с составными tenant FK, unique/check/index. Все записи проходят live session/tenant, strict Zod, version и Serializable transaction с atomic audit; retry только P2034. Allowance version=0 только при отсутствии записи. Сотрудники с документами/лимитами защищены от удаления.

## Проверки

- `npm run build`, `npx tsc --noEmit --noUnusedLocals --noUnusedParameters`, `git diff --check` — успешно.
- Prisma validate, migrate deploy/status и schema diff на изолированной PostgreSQL 17.10: 9 миграций актуальны, различий нет. Старые данные не переписаны, новых зависимостей нет.
- Реальные HTTP/Auth.js/PostgreSQL: профиль/manager/пустые данные; ручной лимит create/update, отсутствие/0/отрицательный остаток; documents CRUD и страницы 10+2 без пересечений. Проверены stale versions, строгие фильтры, неверные year/days/URLs, foreign id, READONLY/AGENT/MANAGER/ADMIN/SUPER_ADMIN и live смена membership. Чужие tenant записи недоступны, SUPER_ADMIN не обходит workspace.
- ANNUAL 28.12.2026–05.01.2027 = 7 рабочих дней: 4 относятся к 2026, 3 к 2027. PENDING = 4 отдельно; SICK/REJECTED/CANCELLED не уменьшают ежегодный баланс. Лимит 22 даёт остаток 18; 0 в 2027 даёт −3; без лимита 2028 — «Не задан». После UI изменения лимита на 24 остаток 2026 = 20.
- Параллельные изменения одной версии документа/лимита: один успех и один конфликт. Аудит документа содержит ровно одно событие на каждую успешную операцию. Сбой audit полностью откатывает document create/update/delete и allowance create/update. Numeric CHECK и составной tenant FK подтверждены прямыми отклонёнными запросами.
- Браузер: создание/редактирование/удаление документа, inline validation URL/required, редактирование телефона, лимит/год, пагинация, переходы к руководителю/оргструктуре. Ctrl+Enter, Escape и возврат фокуса. UI READONLY без write controls, AGENT без allowance/delete. Две темы, 1440 px desktop, 390×844 mobile/Sheet, document width 390 px, reduced motion. Обычная консоль — 0 errors/warnings.
- Loading скрывает прежний профиль. Остановленная PostgreSQL показывает ошибку авторизации/сервиса, прежние данные и документы убраны; demo fallback отсутствует.

Проверки выполнены одноразовыми командами и в браузере; тестовых файлов вне CHECKPOINT не создавалось. Собственные workspace/users/employees/leaves/documents/allowances/audits и временный audit constraint удалены; cookies очищены, локальные Next.js/PostgreSQL остановлены. Изменения TASK-018/019 сохранены. Коммит/push не выполнялись.

## Границы

Это ручная календарная настройка, без автоматического accrual/carryover, праздников, half-days и payroll. Лимит информирует о балансе, не блокирует согласование заявки. Независимые документы/count/manager/balance читаются Promise.all; баланс/лимит согласованы одним SQL statement, весь профиль не является единым snapshot. Доступ к внешнему файлу управляется его хранилищем. Миграция внешнего production не выполнялась.

Скриншоты: [dark](screenshots/task-020-profile-dark.png), [light](screenshots/task-020-profile-light.png), [mobile](screenshots/task-020-profile-mobile.png), [mobile balance](screenshots/task-020-leave-balance-mobile.png), [empty](screenshots/task-020-profile-empty.png), [документ](screenshots/task-020-document-form-light.png), [документ mobile](screenshots/task-020-document-form-mobile.png), [лимит](screenshots/task-020-allowance-form.png), [loading](screenshots/task-020-profile-loading.png), [ошибка PostgreSQL](screenshots/task-020-profile-error.png).
