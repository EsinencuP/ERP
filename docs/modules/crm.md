# CRM — TASK-006

Нормализованные Contact, Deal и Activity обслуживаются `schema.ts`, `types.ts`, `access.ts`, `queries.ts`, `service.ts`, `actions.ts`. Новая миграция не требуется: используются модели TASK-002. Каждый публичный метод возвращает `Promise<Result<T>>`.

## Контракты

| Метод | Вход | Успешные data |
| --- | --- | --- |
| getContacts | ContactFilters = {} | PaginatedResponse<Contact> |
| getDeals | DealFilters = {} | PaginatedResponse<Deal> |
| getDealsByStage | DealFilters = {} | Record<DealStage, PaginatedResponse<PipelineDeal>> |
| createContact | CreateContactDTO | Contact |
| updateContact | id, version, UpdateContactDTO | Contact |
| deleteContact | id, version | удалённый Contact |
| createDeal | CreateDealDTO | Deal |
| updateDealStage | id, version, stage | Deal |
| createActivity | CreateActivityDTO | Activity |

CreateContactDTO: обязательное name; company, email, phone, address, notes, ownerId — optional/null; stage по умолчанию LEAD. Пустые текстовые поля превращаются в null, email — в lowercase. UpdateContactDTO — непустой partial; отсутствующие поля сохраняются, null очищает nullable-поля.

CreateDealDTO: title, contactId обязательны; stage=NEW, value="0", currency=RUB, ownerId/notes/expectedCloseDate optional/null. Value — целые неотрицательные копейки (до 20 цифр), строка либо безопасный целый number. Ответ всегда строка без потери точности. Currency — три латинские буквы в uppercase. expectedCloseDate — существующая YYYY-MM-DD.

CreateActivityDTO: subject, type (CALL/EMAIL/MEETING/NOTE/TASK), хотя бы contactId или dealId. Если передана только сделка, contactId выводится из неё; оба идентификатора должны соответствовать одному контакту. assignedToId/description/dueAt optional/null; dueAt — ISO timestamp с timezone. Ответ содержит version=1, completedAt=null.

## Фильтры и Kanban

Общие поля: page (1–1000000, default 1), pageSize (1–100, default 20), search (до 200 символов), stage, ownerId (null означает без ответственного), sort={field,direction}. По умолчанию createdAt desc, второй ключ id asc. Неподдерживаемые поля отклоняются.

Контакты: search по name/company/email/phone; sort по createdAt/updatedAt/name/company/email/stage. Сделки: search по title/notes/name и company контакта; дополнительно contactId/currency/minValue/maxValue/expectedCloseFrom/expectedCloseTo. Sort по createdAt/updatedAt/title/value/stage/expectedCloseDate. Диапазоны включают границы; суммы сравниваются как Decimal. Сортировка stage использует порядок Prisma enum.

PaginatedResponse содержит data, total, page, pageSize, totalPages; totalPages=0 при пустом наборе. count и страница читаются в одном RepeatableRead snapshot. Kanban всегда возвращает NEW, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST; page/pageSize применяются отдельно к каждой колонке. stage-фильтр оставляет прочие колонки пустыми. Суммы разных валют автоматически не складываются.

## Доступ и целостность

Каждый запрос повторно проверяет Auth.js сессию, активность пользователя и Membership; workspace из DTO не принимается. READONLY читает, AGENT создаёт/изменяет, удаление доступно MANAGER/ADMIN/SUPER_ADMIN согласно общей матрице. Синтетический демовход получает CONFIGURATION для нормализованного API. Ошибка PostgreSQL получает STORAGE, без демофолбэка.

Owner/assignee должен быть активным участником того же workspace с активным User. При отсутствии ownerId/assignedToId выбирается текущий пользователь, explicit null оставляет запись неназначенной. Все contact/deal references tenant-scoped. Чужая или отсутствующая запись даёт NOT_FOUND без раскрытия данных.

Мутация и AuditLog (actorId, workspaceId, domain=crm, entityType/entityId, JSON before/after) атомарны в Serializable-транзакции. Создание начинает version=1; updateContact/updateDealStage увеличивают version; stale version даёт CONFLICT. Удаление контакта с зависимыми документами даёт CONFLICT; каскадного удаления бизнеса нет. WON/LOST устанавливает closedAt, повтор того же этапа сохраняет дату, возврат в открытый этап очищает её. Даже повтор этапа проверяет/увеличивает version и фиксирует audit.

После успешной мутации инвалидируются `/crm` и `/`. Ошибки валидации/доступа не изменяют данные и аудит. Ошибка audit insert откатывает запись. Конфликты БД не повторяются автоматически: клиент должен перечитать актуальную версию. Отдельная идемпотентность create-запросов пока не реализована.

```ts
const contact = await createContact({ name: "Контакт", email: "contact@example.org" });
if (contact.ok) {
  const deal = await createDeal({ title: "Проект", contactId: contact.data.id, value: "12500000" });
  if (deal.ok) await createActivity({ subject: "Созвон", type: "CALL", dealId: deal.data.id });
}
```

## Переходный экран

Текущие таблица/kanban сделок на `/crm` работают через прежний DocType Document: title/subtitle/email/amount/date/notes и локализованные статусы. Его действия переименованы в getDealDocuments/createDealDocument/updateDealDocument/deleteDealDocument, client-actions использует эти явные имена. Общий `schema` сохранён для совместимости. Нет автоматического копирования, слияния или отображения нормализованных записей в этом экране. Перевод UI и данных планируется отдельно; выигрыш сделки автоматически не создаёт Invoice.

## Таблица контактов — TASK-007

Маршрут `/crm/contacts` получает initialData через Server Component. Переключатель «Контакты / Сделки» доступен на обоих экранах. Текущий интерфейс сделок остаётся Document-совместимым; контакты читают реальные нормализованные таблицы. Explicit demo показывает понятное состояние подключения и не создаёт учебные Contact.

Колонки: checkbox, Avatar+Name, Company, Email, Stage Badge, Assigned Avatar+Name, Created relative, Actions. Действия строки: просмотр карточки; назначение при canWrite; удаление при canDelete. Используются общие Table/Avatar/Badge/Dialog/ConfirmDialog/Button/Skeleton и новая reusable SelectionCheckbox; debounce вынесен в общий hook.

Поиск по name/company/email/phone — 300 ms; этап — серверный фильтр. Сортировка имени/компании/email/этапа/даты создания выполняется сервером по whitelist. PageSize 20/50/100, пагинация по серверному total. Новый поиск/этап/сортировка сбрасывает page=1 и selection. Выбор хранится по id с ожидаемой version и сохраняется при смене страницы/размера; максимум 100 записей. Header checkbox выбирает текущую страницу, поддерживает mixed/indeterminate. Кнопка обновления снимает выбор и перечитывает версии.

| Новый Server API | Контракт |
| --- | --- |
| getContacts | PaginatedResponse<ContactTableRow>, owner={id,name,avatar} или null |
| getContactAssignees(search="") | до 50 активных User/Membership своего workspace, нужен canWrite |
| deleteContacts([{id,version}]) | атомарное удаление 1–100 разных контактов, нужен canDelete |
| updateContactsAssignee([{id,version}], ownerId|null) | атомарное назначение/снятие, нужен canWrite |
| getContactsForExport(filters={}, ids=[]) | выбранные id либо весь фильтр, только MANAGER+, максимум 5000 |

Bulk validates все записи/версии до записи, проверяет активность owner, workspace и зависимости. Событие аудита создаётся для каждого контакта; ошибка аудита, гонка версии или FK откатывает весь набор. Связанные контакты физически не удаляются. Ответы/ошибки соответствуют общему Result; успешные мутации инвалидируют также `/crm/contacts`. Автоматического повтора мутаций нет.

Экспорт CSV включает имя/компанию/email/этап/имя ответственного/ISO createdAt. Выбор и фильтр проверяются на сервере; неизвестный или чужой выбранный id даёт NOT_FOUND, без частичной выгрузки. При >5000 результатов возвращается VALIDATION с предложением сузить фильтр. Экспорт без выбранных строк выгружает весь фильтр, а не только текущую страницу. Общий CSV helper экранирует кавычки и нейтрализует формулы даже после пробельного префикса.

Skeleton существует для начального route loading и последующих запросов. Есть empty/filter-empty, безопасный error с retry, ожидание операции и доступные подписи; stage имеет текст, relative date — ISO dateTime и точную дату в title. Relative time использует одно initialNow для SSR/гидратации. Возврат со страницы после запроса не применяет устаревший ответ.

## Воронка сделок — TASK-008

`/crm/pipeline` работает с нормализованными Deal, не с Document. DndContext → KanbanColumn × 6 (SortableContext) → DealCard (useSortable). Маршруты Contacts и прежних сделок остаются доступны через CRM-вкладки. В деморежиме новая воронка показывает состояние подключения, без подмены БД.

PipelineDeal расширяет базовый DTO: owner={id,name,avatar}|null; lastActivity={id,subject,type,createdAt}|null. Последняя активность — именно связанная со сделкой Activity, по createdAt desc/id asc, take=1 и workspace. Контактная активность без dealId не выдаётся за активность сделки. Карточка показывает точную денежную строку через formatCurrency, tabular-nums, компанию/контакт, expectedCloseDate, аватар, последнюю активность и полосу вероятности. Probability — из централизованной PIPELINE_STAGES: NEW=10, QUALIFIED=25, PROPOSAL=50, NEGOTIATION=75, WON=100, LOST=0; подпись «по этапу». Отдельного probability в БД пока нет.

Drop меняет только stage через updateDealStage(id,version,stage). Межэтапный перенос optimistic: карточка/total меняются сразу, затем сервер подтверждает версию/closedAt и атомарный audit. Одна запись одновременно; на Result error восстанавливается snapshot и требуется refresh. При сетевом обрыве результат неизвестен — показывается предыдущее состояние с требованием refresh. Если mutation уже подтверждена, сбой следующего чтения сохраняет подтверждённый этап. После успеха первые страницы перечитываются; stale версии/чужие IDs/потеря прав никогда не обходятся UI.

Каждая колонка имеет независимые page controls, по 20 строк. Сортировка updatedAt desc/id asc; перестановка внутри того же этапа не вызывает Server Action и не обещает ручной persistent order. Empty columns остаются drop targets. Pointer/touch drag использует отдельную ручку; пробел/Left/Right/пробел позволяют переносить в пустой этап, Escape отменяет. Stage select — равноправный доступный способ. DragOverlay выходит из scroll container, отдельный overlay не вызывает useSortable. Native select и drag заблокированы при READONLY; чтение/пагинация доступны.

Новые UI обрабатывают error/retry/empty/pending и initial skeleton; время последней активности использует серверный initialNow для одинакового SSR/hydration. Анимации/цвета соблюдают tokens и reduced motion. Успешные CRM actions инвалидируют `/crm/pipeline` вместе с другими CRM views. Новых миграций и зависимостей нет.

## Карточка контакта и timeline — TASK-009

`/crm/contacts/[id]` заменяет прежний read-only dialog. Имя контакта и «Открыть контакт» в таблице ведут на настоящую страницу; прямой URL работает через Server Component/await params. Header содержит avatar initials, имя, stage badge/select и разрешённые actions. Слева — RHF/Zod Activity Composer и timeline; справа — Contact Info, пять связанных Deal на странице, tags. При narrow viewport панели складываются в одну колонку.

API: getContactDetail(id) → Result<ContactDetail> (ContactTableRow + первые страницы activities/deals); getContactActivities(id,{page,pageSize,type}) → Result<PaginatedResponse<ContactActivity>>; getContactDeals(id,page) → Result<PaginatedResponse<Deal>> (pageSize=5). Timeline по умолчанию pageSize=20, максимум 50, сортировка createdAt desc/id desc, фильтр CALL/EMAIL/MEETING/TASK/NOTE. Каждое чтение проверяет сессию/workspace и существование Contact; count/страница согласованы RepeatableRead. Timeline включает прямые Activity и deal-only записи с contactId=null через принадлежащую контакту сделку. Чужие tenant/контактные истории не смешиваются.

Activity DTO содержит ISO timestamps, безопасный assignee summary и deal id/title/stage. AssignedTo — ответственный, а не автор: именно так он подписан. Пять типов имеют явные icons/text и relative dates с точной датой в title. Описание — plain text, HTML не исполняется. Composer записывает активность текущего контакта через createActivity; запись EMAIL не отправляет письмо, CALL не выполняет звонок. Формы создания активности используют field validation из activitySchema.

Contact Info доступно редактированию через contactEditSchema/updateContact; header меняет stage и owner, deleteContact сохраняет Restrict. Tags — реальные Contact.tags, новая additive migration. Пределы: 20 тегов по 1–32 символа, без повторов без учёта регистра. Tags/update/назначение создают audit и проверяют Contact.version. Теги могут быть очищены [] и сохраняются после reload; READONLY видит tags, но не редактор.

Клиент сериализует операции, показывает pending/error/empty/skeleton/retry и после подтверждения перечитывает snapshot. Сбой reread не объявляется откатом сохранённой записи; неизвестный результат сети требует refresh перед повтором. При конфликте version формы блокируются до перечитывания, диалоги остаются закрываемыми. Activity create автоматически не повторяется; отдельный idempotency key ещё не реализован. Успешные CRM Actions revalidate dynamic detail route вместе с contacts/pipeline/dashboard. В explicit demo остаётся состояние подключения, без fallback при ошибке БД.

## Формы контактов — TASK-010

ContactFormSheet — общий редактор name/company/email/phone/address/stage/notes. «Новый контакт» и «Редактировать контакт» находятся в нормализованной таблице; header карточки использует ту же Sheet вместо прежнего ContactEditDialog. Owner и tags остаются отдельными уже существующими действиями. Новая форма создания использует createContact, редактирование — updateContact(id,version,input); сервер не принимает tenant/role/version из полей формы.

RHF использует contactFormSchema, полученную из contactSchema; mode и reValidateMode — onBlur. Ошибки у поля имеют aria-invalid/aria-describedby и появляются до отправки. Submit также валидирует всю форму. Cmd/Ctrl+Enter сохраняет только при фокусе в форме; Esc, «Отмена» и X закрывают. Пока запрос выполняется, повторный submit и закрытие заблокированы. Toast Sonner: success после подтверждения записи, error при invalid submit/Result/network error; blur показывает только inline error.

Sheet modal=false не блокирует таблицу: поиск, сортировка и чтение работают, внешние pointer/focus events не закрывают draft. Открытие второй формы и bulk-мутации на время редактора недоступны. Версия контакта зафиксирована при открытии, поэтому внешний update/refresh не превращает форму в неявную запись поверх новой версии. После CONFLICT либо неизвестного результата форма сохраняет draft, блокирует повтор и предлагает закрыть/обновить. Создание автоматически не повторяется. После успешного commit таблица перечитывает текущий фильтр; созданная запись может не входить в этот фильтр. Detail перечитывает snapshot с уже существующей обработкой подтверждённого commit.

На mobile Sheet занимает всю ширину и имеет отдельную прокрутку полей и закреплённый footer. На desktop — правая панель до 512 px. Фокус начинается с имени, после закрытия возвращается на кнопку открытия (или поиск, если строка уже ушла со страницы). READONLY не имеет кнопок создания/редактирования; серверные проверки остаются обязательными.

CHECKPOINT-02: `npm run check:crm` выполняет `scripts/checkpoint-crm.test.mjs` через node:test. Требуются изолированная локальная PostgreSQL localhost:5433/erp и production server 127.0.0.1:3001 с ERP_DEMO_MODE=false/AUTH_URL/AUTH_SECRET. Скрипт проверяет адреса до подключения, создаёт уникальные workspace/users с одноразовым паролем, читает IDs actions из текущей сборки, выполняет HTTP-интеграции и удаляет только свои записи в finally. Проверки реальных blur/focus/keyboard/toast и DnD выполняются браузером отдельно; Node API-проверка их не заменяет.
