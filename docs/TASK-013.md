# TASK-013 — Finance Expenses

Статус: закрыт 19 октября 2026.

Добавлен `/finance/expenses`: серверная таблица расходов, создание, просмотр, редактирование и подтверждаемое удаление. Есть фильтр по категории, поиск по названию/комментарию, фильтр валюты и пагинация. Строки и количество запрашиваются через Promise.all. Раздел доступен из общей FinanceNavigation.

## Модель и контракт

Expense содержит title, amount, currency, category: ExpenseCategory, date, receipt, notes, а также workspace, автора, version и timestamps. Категории: OFFICE, SOFTWARE, TRAVEL, MARKETING, EQUIPMENT, RENT, UTILITIES, OTHER. Суммы — положительные целые копейки Decimal(20,0), DTO передаёт точную строку. Форма принимает основные денежные единицы с точкой или запятой и преобразует их без потери точности. Валюты: RUB/USD/EUR.

Date хранится как календарный PostgreSQL DATE; начальная дата формы определяется в Europe/Moscow. Receipt реализован как необязательная **ссылка на чек**, не загрузка файла: HTTP(S), без credentials, с нормализацией и повторной проверкой при отображении. Ссылка открывается с noopener/noreferrer. Notes сохраняет многострочный комментарий.

Миграция `20261019000100_finance_expenses` добавляет enum, таблицу, индексы и ограничения. Проверяются положительная сумма/version, непустое название, поддерживаемая валюта, дата, длина notes и безопасный формат receipt. Составной FK автора не допускает участника чужого workspace. Существующие таблицы не изменены.

Все операции используют Result, live session/Membership и Finance RBAC. READONLY видит данные; AGENT создаёт и редактирует; MANAGER и выше могут удалять. Workspace и автор берутся на сервере. Обновление/удаление проверяют version; audit записывается атомарно. Общий Serializable mutation helper вынесен из invoice service без изменения политики повторов: повторяется только подтверждённый rollback P2034. Неизвестный сетевой результат и конфликт блокируют повтор до перечитывания.

Форма использует общую non-modal Sheet, RHF/Zod onBlur, Sonner, Ctrl/Cmd+Enter, Escape и возврат фокуса. Обычное закрытие не перезагружает таблицу; после конфликта выполняется обновление. Empty/loading/error состояния явные, демофолбэка при ошибке PostgreSQL нет. Расходы хранятся отдельно от поступлений и не меняют Total Revenue.

## Проверки

- Финальные `npm run build`, `npm run typecheck -- --noUnusedLocals --noUnusedParameters` и `git diff --check` успешны. Тестовые файлы вне CHECKPOINT не создавались.
- На изолированной локальной PostgreSQL 17.10: Prisma validate, применение и повторный deploy миграции, migrate status; diff фактической БД к схеме не обнаружил отличий.
- Одноразовые HTTP/SQL проверки через реальные Auth.js/Server Actions: CRUD, нормализация, восемь категорий, фильтры/search/currency, страницы без пересечений и точное сохранение `9007199254740993` коп.
- READONLY mutation и AGENT delete отклонены, MANAGER delete разрешён. Без входа доступ запрещён. Чужие get/update/delete возвращают NOT_FOUND, список другого workspace пуст. Подмена workspace/автора/version и некорректные money/date/category/currency/receipt отклоняются.
- Stale update/delete дают CONFLICT. Два параллельных изменения одной версии: один успех, один конфликт. Принудительный отказ audit откатывает создание/изменение целиком, включая сумму и version. Временное ограничение аудита снято после проверки. Прямые SQL-записи подтвердили CHECK и составной tenant FK.
- Регрессия общего mutation helper: Invoice DRAFT → SENT → Payment 12000 коп. → PAID; Revenue остаётся 12000 коп. независимо от расходов.
- В браузере: создание 500,25 RUB, изменение на 750,10 USD и другую категорию, просмотр полного комментария/receipt, фильтрация, поиск, пагинация и подтверждённое удаление. Проверены blur validation, отклонение javascript URL, Ctrl+Enter, Escape и возврат фокуса.
- READONLY UI без create/edit/delete, AGENT без delete; другой workspace показывает empty state. Desktop 1440 px в обеих темах и mobile 390×844: нет общего горизонтального overflow, таблица прокручивается внутри контейнера. Свежая консоль обычных переходов без ошибок/предупреждений.
- После остановки PostgreSQL обновление показывает ошибку подключения, строк таблицы нет, демоданные не появляются.

Удалены только fixtures этой проверки: 2 workspace, 5 пользователей/Membership, 26 расходов, 1 invoice с payment, 1 contact, sequence, 10 sessions и 36 audit events. Ранее существовавшие записи сохранены. Проверочные Next server и PostgreSQL остановлены. Production/deployment и Git commits не выполнялись.

Скриншоты: [dark](screenshots/task-013-expenses-dark.png), [light](screenshots/task-013-expenses-light.png), [mobile](screenshots/task-013-expenses-mobile.png), [empty](screenshots/task-013-expenses-empty.png), [форма dark](screenshots/task-013-form-dark.png), [форма mobile](screenshots/task-013-form-mobile.png).

Границы: receipt — URL; файлового хранилища/загрузки, expense approval/reimbursement, ledger и конвертации валют в этой задаче нет.
