# English / Русский — локализация

Дата: 20 октября 2026. Английский — язык по умолчанию. Settings → Language переключает русский; выбор сохраняется для текущего браузера на год и действует на всех страницах, в том числе после выхода. Новый браузер начинает с английского.

## Реализация

- next-intl 4.14.9: request config, серверный locale и NextIntlClientProvider. URL маршрутов не меняются.
- Cookie evo_locale принимает только en/ru; неизвестные значения дают en. Сохранение через updateLanguage требует действующей сессии. Cookie HttpOnly, SameSite=Lax, Secure при HTTPS; preference не меняет workspace/роль/версию бизнес-записей.
- src/i18n/en.json и ru.json: 1703 системных сообщения. useI18n для синхронных компонентов, getI18n для async Server Components/обработчиков. Tagged templates разделяют текст и интерполяции. Нет глобального изменяемого языка и DOM-подмены текста.
- Server Actions/API переводят ошибки Result на границе; клиентские ошибки и Zod messages переводятся при показе. Успешные payload, имена, названия, описания, заметки, коды, enum/status и данные БД сохраняются.
- Даты/валюты/количества/проценты/графики получают locale явно. Точные копейки/BigInt и правила UTC/Europe/Moscow не изменяются. Invoice count использует Intl.PluralRules: счёт/счёта/счетов.
- PDF переводит заголовки/статусы/служебные подписи и форматирует суммы/даты. CSV переводит заголовки и системные категории/статусы, сохраняя пользовательские поля и машинно-читаемые точные числа/ISO даты.
- Settings исправлен для одинакового SSR/первого клиентского render при сохранённой светлой теме.

## Термины

| English | Русский |
| --- | --- |
| Workspace | Рабочее пространство |
| Dashboard | Обзор |
| Receipts / Dashboard revenue | Поступления |
| Revenue (P&L) | Выручка |
| Outstanding | К оплате |
| Paid MTD | Оплачено с начала месяца |
| Low stock / Minimum stock | Низкий запас / Минимальный запас |
| Organization chart | Оргструктура |
| Reporting to | Руководитель |
| Leave allowance | Годовой лимит отпуска |
| Custom period | Свой период |

CRM, ERP, SKU, P&L, Kanban, API, валютные и технические коды могут оставаться профессиональными терминами.

## Проверки

- Сверены все 1703 пары каталогов: нет пустых русских значений и расхождений параметров {0}, {1}. В английских значениях нет кириллических системных строк.
- В браузере просмотрены Dashboard, CRM Contacts/Pipeline, Finance Invoices/Dashboard/Expenses/Payments/Reports, Inventory Products/Dashboard/Warehouses, HR Directory/Leaves/Org Chart, Projects Tasks/Overview, Settings. Английские экраны сохраняют намеренно русские имена клиента/описания.
- Проверены en по умолчанию в отдельном browser context, неверная cookie fr → en, тумблер en ↔ ru и reload/navigation. На Settings после исправления темы нет hydration error.
- PDF счёта скачан на en/ru, отрисован Poppler и визуально проверен: подписи, даты, суммы, кириллическое пользовательское описание и заметка сохранены.
- P&L CSV содержит английские/русские подписи и категории соответственно; API validation и unauthorized messages проверены на двух языках.
- Settings просмотрен в светлой теме, на ширине 375 px без горизонтального переполнения.
- Build/typecheck/schema validation: результаты финального запуска фиксируются в verification.md. Новые тестовые файлы вне CHECKPOINT не создавались.

Снимки: [English](screenshots/localization-settings-en.png), [Русский](screenshots/localization-settings-ru.png), [375 px](screenshots/localization-settings-mobile.png).

## Добавление текста

Добавить сообщение с одинаковыми параметрами в оба JSON каталога и вызывать t только для системного текста. Пользовательские поля выводить напрямую; переменные внутри переводимой фразы передавать через tagged template. Locale форматтера передавать явно. Новые TASK-024—030 ещё не реализованы: их экраны должны использовать этот же слой локализации.
