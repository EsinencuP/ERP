# TASK-008 — CRM Deal Pipeline (Kanban DnD)

Статус: **ЗАКРЫТ**. Дата: 18 октября 2026.

## Реализация

- `/crm/pipeline/page.tsx` — Server Component: getDealsByStage → initialData + initialNow → DealKanban. В CRM добавлена вкладка «Воронка», прежние Contacts и Document Deals сохранены.
- DndContext → шесть KanbanColumn с SortableContext → DealCard/useSortable. Пустая колонка остаётся droppable. DragOverlay использует только визуальное содержимое, без повторного draggable.
- PipelineDeal: точные строковые копейки, company/contact, expectedCloseDate, безопасный owner summary id/name/avatar, одна последняя Activity id/subject/type/createdAt. Вложенный Activity query ограничен workspace и take=1; история не загружается целиком.
- Карточка: tabular-nums, форматирование Decimal без number-конверсии, дата закрытия, avatar/fallback, последняя активность, progressbar. Вероятность вычисляется по этапу: 10/25/50/75/100/0%; подпись прямо указывает «по этапу». Отдельное поле probability не добавлялось.
- Мышь/touch — отдельная drag handle; клавиатура — пробел/Left/Right/пробел, в том числе пустой этап; Escape и drop вне доски отменяют. Список этапов в карточке даёт доступную альтернативу.
- Перенос optimistic: карточка/total сразу меняются, затем updateDealStage(id,version,stage) проверяет auth/RBAC/workspace/version и сохраняет audit атомарно. При Result error восстанавливается snapshot. До refresh следующая запись заблокирована.
- Если ответ мутации потерян, показано прежнее состояние с требованием refresh. После подтверждённого commit ошибка последующего чтения не откатывает сохранённый этап. Одна операция in flight исключает перезапись другого локального результата при rollback.
- По 20 карточек на странице каждого этапа, независимая пагинация. Порядок updatedAt desc/id asc; drag внутри этапа не сохраняет произвольный порядок. После успешного переноса первые страницы перечитываются для согласованных counts.
- Initial skeleton, pending/error/retry/empty, aria-live/localized DnD announcements, CSS tokens, Geist и reduced motion. Успешные CRM actions инвалидируют также `/crm/pipeline`.
- Новых зависимостей и миграций нет; обновлены architecture, modules/crm, references, roadmap и verification.

## Проверки

Финальные `npm run build`, `npm run typecheck`, `git diff --check` прошли. Сборка Next.js 15.5.28/Prisma 6.19.3 без ошибок. Hex-совпадений в src/components нет; в новом коде explicit any/throw отсутствуют. Тестовые файлы вне CHECKPOINT не создавались.

Ручные браузерные, HTTP и SQL проверки на production-сборке с реальными Credentials/JWT и локальной PostgreSQL 17.10:

| Сценарий | Подтверждённый результат |
| --- | --- |
| Шесть этапов и ограниченная начальная выборка | Шесть колонок, total включает записи за пределами первой страницы |
| Поля карточки | Компания, сумма/валюта, дата, owner avatar и последняя Activity отображаются; null-поля имеют явные состояния |
| Несколько Activity | Выбрана последняя MEETING, старый CALL не выдан вместо неё; дата ISO |
| Безопасный DTO | Owner содержит только id/name/avatar; value=99999999999999999999 возвращён точно |
| Pointer drag с задержанным ответом | До ответа карточка уже QUALIFIED и aria-busy=true; после подтверждения probability=25 |
| Keyboard в пустой NEGOTIATION | Этап сохранён, probability=75 |
| Реальные touch events через Chromium CDP | Перенос в WON, probability=100; SQL подтвердил version/closedAt/audit |
| Native stage select | Меняет этап через тот же Server Action |
| Drop вне доски и Escape | Этап не изменён, mutation requests=0 |
| Чужой workspace | Update даёт NOT_FOUND; query возвращает только собственную сделку |
| READONLY | Server Action даёт FORBIDDEN; все handle/select disabled; чтение и пагинация доступны |
| AGENT | Разрешённый updateDealStage успешен |
| Concurrent stale version | Snapshot восстановлен, новые переносы disabled до успешного refresh |
| Отказ INSERT аудита | Карточка вернулась в NEW; SQL stage=NEW/version=1, audit=0 |
| Commit подтверждён, последующее чтение оборвано | Карточка сохраняет QUALIFIED, без ложного rollback |
| Сервер сохранил PROPOSAL, ответ потерян | UI показывает прежний QUALIFIED и требует refresh; refresh восстанавливает реальный PROPOSAL |
| Пагинация NEW | Первая страница 20 карточек, вторая показывает оставшиеся; возврат работает |
| Пустой workspace | Empty state виден, шесть колонок, ноль карточек |
| Relative time и гидратация | Первичное серверное время стабильно; свежий финальный переход без pageerror/console errors |

Намеренные сетевые abort дают ожидаемые network errors в диагностической консоли. На свежем финальном переходе после устранения имитаций ошибок нет. Проверки не требуют считать неуспешную мутацию сохранённой.

## Визуальная проверка

Осмотрены desktop 1440×1050 и mobile 390×844, светлая и тёмная темы. Большая сумма остаётся целой строкой, overflow=false, computed font-variant-numeric=tabular-nums. Для длинной суммы используется меньший размер шрифта. Пустые аватар/дата/активность не заменяются выдуманными данными.

На mobile исправлено выпадение absolute sr-only labels из scroll-контейнера: article создаёт relative containing block. Финально document scrollWidth=390 при viewport=390, board clientWidth=350/scrollWidth=1808 — горизонтальная прокрутка локальна доске. Reduced motion сокращает animation duration до 0.00001s.

Снимки в игнорируемом `.playwright-mcp`: task008-desktop-light.png, task008-desktop-dark.png, task008-mobile-light.png, task008-mobile-dark.png, task008-large-amount.png.

## Очистка и границы

Свои временные три workspace, шесть пользователей, Session, Contact/Deal/Activity и audit удалены. Временный SQL CHECK для отказа audit удалён. Другие данные не менялись. Проверочный сервер 3001 и PostgreSQL остановлены; explicit demo на 3000 оставлен работающим. `.env` не менялся, временный AUTH_SECRET не сохранялся.

Новая воронка требует реального входа и PostgreSQL, как API TASK-006. В explicit demo показывает состояние подключения, прежние учебные сделки доступны отдельной вкладкой. Формы создания/редактирования Deal и миграция Document-данных остаются следующими задачами. Нет persistent порядка внутри этапа, индивидуального probability и автоматического Invoice при WON. Полный автоматический набор сценариев остаётся CHECKPOINT.
