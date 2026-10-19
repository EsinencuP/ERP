# TASK-011 — Finance Invoice CRUD + PDF

Статус: закрыт 18 октября 2026.

`/finance` теперь работает с нормализованными Invoice/InvoiceItem/Payment: реестр с поиском, фильтром статуса и пагинацией, создание, карточка, редактирование и удаление черновиков. Прежние Document/DocumentPayment сохранены в `/finance/documents`; существующие данные не переносились. Контракты и ограничения: [modules/finance.md](modules/finance.md).

Форма использует общие Sheet/Input/Button, RHF/Zod и Sonner. Строки редактируются inline: Description, Qty, UnitPrice и вычисляемый Total; поддерживаются добавление/удаление, до 100 строк, количество до 3 знаков. Цены вводятся в основных единицах RUB/USD/EUR, хранятся целыми копейками. Сервер заново рассчитывает subtotal = Σ(qty×price), taxAmount = subtotal×taxRate/100, total = subtotal+taxAmount. Каждая строка и налог округляются half-up до копейки через BigInt; переполнение Decimal(20,0) отклоняется.

Номер INV-YYYY-NNNN формируется generateId из атомарного InvoiceSequence своего workspace и года issueDate. Номер удалённого черновика не используется повторно; счёт 2024 года получает INV-2024-0001 независимо от текущего года. Год 0001 сохраняет четыре цифры. После выдачи строки и сумма заблокированы. DRAFT → SENT → PAID/OVERDUE/CANCELLED; также возможна отмена черновика. SENT фиксирует выдачу; письмо автоматически не отправляется. Частичный платёж оставляет SENT либо OVERDUE, полная оплата устанавливает PAID. Отмена конечная и недоступна после платежей. Просрочка определяется по UTC календарной дате без записи при GET.

Мутации повторно проверяют live session, workspace, RBAC и version. Счёт, строки/платёж, sequence и audit сохраняются одной Serializable-транзакцией. Дубликат reference, переплата, чужой контакт, stale version и изменение выданного/оплаченного счёта отклоняются. UI блокирует повтор при неизвестном результате записи и предлагает обновить данные. Сбой PostgreSQL возвращает Result, без демофолбэка.

PDF формируется серверным @react-pdf/renderer v4, endpoint `/api/finance/invoices/[id]/pdf`. Проверяются tenant и canExport; ответ attachment/private/no-store, в том числе no-store при ошибках. Локальный статический Geist-Regular.ttf 400 с кириллицей и ₽ подготовлен из Geist 1.800 под OFL; источник и воспроизведение — [fonts README](../public/fonts/README.md). CSS tokens и шрифт включены в Next tracing. Snapshot клиента и исполнителя сохраняет реквизиты выданного счёта. A4, перенос описаний, fixed header/footer и номера страниц. Исправлено исчезновение footer из-за ограничивавшего высоту контейнера.

## Фактические проверки

- Финальные `npm run build`, `npm run typecheck -- --noUnusedLocals --noUnusedParameters`, `git diff --check` — успешно.
- `prisma validate` и `prisma migrate status` — корректная схема, все пять миграций уже применены на локальной PostgreSQL 17.10. Production БД не менялась. Additive migration TASK-011 добавляет snapshots/sequence и инициализирует counter по существующим номерам.
- Одноразовые HTTP/SQL проверки на настоящих Auth.js Server Actions/PostgreSQL: CRUD, version conflict, запрет доверенных total/status, чужие invoice/contact, READONLY write denial, AGENT delete/export denial, отмена/terminal state, запрет изменения/удаления оплаченного счёта и повторного использования номера.
- Платежи 10000 + 20017 коп. закрыли счёт 30017 коп. Дубликат reference и переплата не изменили Payment/audit counts. Проверены subtotal 25014, налог 5003, total 30017; отдельно — суммы выше Number.MAX_SAFE_INTEGER, half-up и overflow.
- PDF endpoint: 200 с `%PDF-`, 401 без входа, 403 READONLY/AGENT, 404 чужой workspace; проверены private/no-store и скачивание кнопкой с корректным именем.
- PDF визуально отрендерен Poppler; обычный счёт — 1 страница, предельный пример со 100 строками, длинным словом и 80 переносами — 17 страниц. Извлечение pypdf подтвердило последнюю строку/комментарий и номера на всех страницах. Первая, промежуточная и последняя страницы осмотрены.
- Браузер: create/edit, preview/server totals, SENT/OVERDUE, overpayment error, частичная/полная оплата с reload, Ctrl+Enter, Escape, удаление с подтверждением, поиск/фильтр/empty, локализованная validation. READONLY скрывает create/export; AGENT сохраняет create без export. Свежий финальный сценарий — без console warnings/errors.
- Desktop 1440 px, dark/light; mobile 390×844: document width = 390, ширина Sheet = 390. Таблица прокручивается внутри контейнера, проверен reduced motion. Тестовые файлы вне CHECKPOINT не создавались.

Собственные временные workspace, пользователи, счета, платежи и audit текущей проверки удалены; ранее существовавшие записи сохранены. Локальные проверочные Next server и PostgreSQL остановлены.

Скриншоты: [dark](screenshots/task-011-detail-dark.png), [light](screenshots/task-011-detail-light.png), [mobile](screenshots/task-011-detail-mobile.png), [форма](screenshots/task-011-form-mobile.png), [PDF](screenshots/task-011-pdf.png), [последняя страница PDF](screenshots/task-011-pdf-last.png).

## Границы

Dashboard и глобальные агрегаты пока читают прежний Document-слой. Юридические/банковские реквизиты не выдумываются; почтовая отправка, возвраты, ledger и налоговый учёт остаются отдельными задачами. Проверки выполнены локально; новый автоматизированный CHECKPOINT, commit и deployment в задачу не входили.
