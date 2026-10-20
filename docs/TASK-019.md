# TASK-019 — HR Leave Management

19 октября 2026. **Закрыт.**

`/hr/leaves`: форма employee/type/startDate/endDate/reason, таблица с поиском, status/type и серверной пагинацией. По умолчанию показана очередь PENDING. Detail содержит полную причину, даты, рабочие дни и автора решения. Workflow: **PENDING → APPROVED / REJECTED**, terminal records доступны для чтения. Редактирование/удаление и новые переходы в существующий CANCELLED не добавлялись.

Дни вычисляются date-fns на клиенте и повторно сервером: differenceInBusinessDays(end,start) + рабочий end. Обе даты включены, суббота/воскресенье исключены. Праздники, переносы, half days и отпускные балансы не вводятся. Неверные/обратные даты, нулевые периоды и >9999 рабочих дней отклонены. Decimal days хранится/передаётся точно; days/status/workspace/approver не принимаются из формы.

AGENT+ создают заявки для сотрудников своего workspace; READONLY читает. MANAGER/ADMIN/SUPER_ADMIN принимают решения по всему workspace, без отдельного ACL по manager self-relation. Live membership, version/PENDING guard и atomic audit обязательны. Создание и одобрение для TERMINATED запрещены; pending можно отклонить. Пересекающиеся PENDING/APPROVED заявки одного сотрудника блокируются Serializable-транзакцией, REJECTED не блокирует повторную подачу. Employee.status не меняется автоматически от будущего отпуска.

Manager sidebar badge считает все PENDING независимо от таблицы. Поддерживает desktop/collapsed/mobile, 99+ с полным доступным текстом; ноль скрыт, ошибка отображается как !. AGENT/READONLY/demo не получают badge. Count читается параллельно с остальными layout данными и обновляется по navigation/focus/Refresh/committed changes. PostgreSQL error не подменяется нулями или demo.

## Проверки

- `npm run build` и `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` — успешно.
- Prisma validate/status/diff — успешно, 8 миграций актуальны, различий нет. Новых зависимостей/миграций нет.
- date-fns helper: один рабочий день = 1; пятница–понедельник = 2; неделя = 5; выходные без рабочих дней отклонены; leap day, invalid/reversed dates, capacity. Moscow/Los Angeles/Auckland проверки календарных дат через DST-range прошли.
- Реальные HTTP/Auth.js/PostgreSQL: create PENDING с 2.00 днями, rejection, повторная подача после rejection, approval и запись manager/super actor. Terminal/stale/invalid transition отклонены. Подмена days/status/workspace/approver запрещена. Чужие id/employee, READONLY writes, AGENT decisions/count — запрещены; SUPER_ADMIN остаётся tenant-scoped.
- Два конкурентных пересекающихся create дают один успех; два решения одной версии дают одно решение и один updated audit. Сбой audit откатывает create и decision, включая status/version/approver/count. История Leave блокирует удаление Employee. Старый manager JWT после смены membership на AGENT больше не позволяет count/decision; роль восстановлена после проверки.
- Pending queue: 23 записи, страницы 20 + 3 без пересечения; literal/Cyrillic search и type/status работают. В браузере фильтр оставил 2 строки при глобальном badge 23. После UI create badge 24, approval 23, rejection 22. Проверено ровно по одному create/decision audit UI-заявки, 2.00 дня и правильный manager actor.
- 112 pending отображаются как 99+, accessible hint содержит 112; collapsed/mobile подтверждены. READONLY — без create/decision/badge, AGENT — create без badge. Переиспользованный EmployeePicker проверен также в редактировании руководителя TASK-018.
- Обе темы, desktop 1440 px, mobile 390×844, внутренний scroll таблицы 1000 px, document width 390 px, Sheet 390×844. Validation, Ctrl+Enter, Escape/возврат фокуса, detail/history и reduced motion проверены. Свежая обычная консоль: 0 errors/warnings.
- При остановленной PostgreSQL Refresh показывает ошибку сервиса, строк 0, sidebar !; старые данные/демо не появляются.

Тестовых файлов вне CHECKPOINT не создавалось: проверки выполнялись одноразовыми запросами и в браузере. Все собственные workspace/users/employees/leaves/audits и временный audit constraint удалены. Cookie очищены, Next.js и PostgreSQL остановлены. Предыдущие данные и изменения TASK-018 сохранены. Коммит/push не выполнялись.

Скриншоты: [dark](screenshots/task-019-leaves-dark.png), [light](screenshots/task-019-leaves-light.png), [mobile](screenshots/task-019-leaves-mobile.png), [empty](screenshots/task-019-leaves-empty.png), [форма](screenshots/task-019-leave-form-light.png), [форма mobile](screenshots/task-019-leave-form-mobile.png), [согласование](screenshots/task-019-leave-decision-light.png), [collapsed badge](screenshots/task-019-sidebar-collapsed.png), [ошибка PostgreSQL](screenshots/task-019-leaves-error.png).
