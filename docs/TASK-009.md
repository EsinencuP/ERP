# TASK-009 — CRM Contact Detail + Activity Feed

Статус: закрыт 18 октября 2026.

## Реализация

`/crm/contacts/[id]` — Server Component с await params и первоначальным Result<ContactDetail>. Имя и действие просмотра в TanStack Table открывают страницу контакта. Header показывает initials avatar, имя, stage и доступные по роли действия: редактирование, назначение, удаление. Есть обновление snapshot и возврат к таблице.

Слева — RHF/Zod форма добавления и timeline CALL/EMAIL/MEETING/TASK/NOTE с отдельными иконками, русскими названиями, relative time и точной датой в title. Фильтр type и серверная пагинация по 20 записей сохраняют доступ к полной истории. В timeline входят прямые Activity контакта и прежние deal-only Activity его сделок. AssignedTo обозначает ответственного; автор из этого поля не выводится. Описание отображается как текст.

Справа — Contact Info с email/tel, ответственным, адресом и комментарием; связанные Deal по пять на странице с точной Decimal-суммой; сохраняемые tags. Панели складываются в одну колонку на узком экране. Общий RelativeTime получает серверный initialNow, затем обновляется раз в минуту. Есть loading skeleton, empty/error/retry, live announcements и reduced motion.

Миграция `20261018084403_contact_detail_tags` добавляет Contact.tags с default [] без удаления данных. Zod: максимум 20 непустых тегов по 32 символа, trim и запрет повторов без учёта регистра. SQL CHECK исключает NULL-массив, NULL-элементы и превышение количества. UpdateContact сохраняет tags, version и audit атомарно. Header/edit/assignment используют прежний updateContact; composer — createActivity. Все CRM mutations инвалидируют dynamic detail route.

Чтения сначала проверяют родительский contact в текущем workspace; данные и count согласованы через RepeatableRead. Запись повторно проверяет live session/RBAC, FK workspace и версию. Клиент допускает одну операцию одновременно. При конфликте или неизвестном результате сети запись блокируется до refresh. После подтверждённого commit неудачное перечитывание не провоцирует повторную отправку формы; диалоги остаются закрываемыми.

## Проверки

- Финальный `npm run build` прошёл: Prisma generate, Next.js production compilation и TypeScript без ошибок, detail route включён в сборку.
- `npm run typecheck -- --noUnusedLocals --noUnusedParameters` и `git diff --check` прошли.
- Миграция применена на изолированной PostgreSQL 17.10; `prisma migrate status` — четыре миграции, схема актуальна.
- Через реальные HTTP Server Actions/SQL прошли 33 проверки: anonymous, READONLY/AGENT/ADMIN, два workspace, чужой/несуществующий родитель, фильтр/границы страниц, 25 Activity и 22 Deal, legacy deal-only Activity, безопасные owner/assignee DTO, точные 20-значные копейки, tags validation/default/trim/clear, stale version и atomic audit rollback. Временный отказ audit откатил и contact update, и Activity insert.
- В браузере созданы все пять типов активности, проверены пустая тема, literal HTML в описании, фильтр EMAIL, вторая страница ленты и сделок. После reload записи сохранены. Выполнены edit company, stage change, назначение/снятие owner, add/remove tags и запрет дубля по регистру.
- Связанный contact не удаляется; пустой contact удалён с переходом к таблице. READONLY не имеет composer/edit/tag editor; AGENT имеет запись без удаления; чужой ID показывает отсутствие контакта без раскрытия данных.
- Stale version в открытой странице показала CONFLICT, заблокировала запись и не сохранила тег. Refresh восстановил работу. После успешной записи тега намеренно оборвано перечитывание: draft очищен, дальнейшие записи блокированы; refresh показал сохранённый тег без дубля.
- Desktop 1440×1000 и mobile 390×1000 осмотрены в обеих темах. Document width равен viewport, reduced motion сокращает длительность до 0.00001s. Финальный переход из таблицы в detail без ошибок/предупреждений консоли. Ожидаемый сетевой error при контролируемом abort не учитывается как ошибка финального перехода.

Снимки находятся в игнорируемом `.playwright-mcp`: `task009-final-desktop.png`, `task009-1440-light.png`, `task009-1440-dark.png`, `task009-390-light.png`, `task009-390-dark.png`. Первый итоговый desktop-снимок сделан после завершения entrance animation.

## Границы

Собственные временные два workspace, пять пользователей, восемь Session, Contact/Deal/Activity и 18 audit events удалены. Временный SQL CHECK отказа audit отсутствует. Другие данные не менялись. Проверочный сервер 3001 и PostgreSQL остановлены; explicit demo на 3000 восстановлен, `/api/health` возвращает ready/demo. `.env` не менялся, временный AUTH_SECRET не сохранялся. После очистки detail в demo показывает состояние подключения; демоданные в нормализованную карточку не подставляются.

Activity фиксирует событие: EMAIL не отправляет письмо, CALL не выполняет звонок. Отдельные due-date/deal-assignment controls и изменение существующей Activity не входят в задачу. Контакт не имеет поля фото, поэтому header использует initials. Ссылка «Воронка» ведёт к существующему pipeline; отдельной страницы Deal пока нет. Автоматических повторов Activity create нет; отдельный idempotency key остаётся будущей задачей.

Карточка требует реального входа и PostgreSQL. Explicit demo показывает состояние подключения. Ошибка PostgreSQL не подменяется демоданными. Автоматические тестовые файлы не создавались; полный регрессионный набор остаётся CHECKPOINT.
