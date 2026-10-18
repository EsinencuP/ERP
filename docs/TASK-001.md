# TASK-001 — Инициализация + Дизайн-система

Статус: **ЗАКРЫТ**. Дата: 17 октября 2026.

## Критерии приёмки

- Существующая Next.js 15 App Router инициализация сохранена: TypeScript strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, Tailwind CSS, `src/` и alias `@/*`. Вложенный проект `erp-template` не создавался поверх рабочего ERP.
- Все указанные зависимости присутствуют в `package.json` и lock-файле: Prisma, Auth.js v5, RHF/Zod, TanStack Table/Virtual, Recharts, DnD Core/Sortable, Lucide, CVA/clsx/tailwind-merge, date-fns, Sonner и cmdk.
- Shadcn настроен на Slate, CSS variables и New York. Добавлены недостающие компоненты через CLI; использующиеся Button/Input/Badge/Dialog сохранены с совместимым API.
- В `src/components/ui/` есть все 20 запрошенных файлов: button, input, label, textarea, select, table, badge, avatar, dropdown-menu, dialog, sheet, sidebar, card, form, command, popover, calendar, separator, skeleton, toast. Дополнительно — sonner и tooltip.
- HSL-палитра централизована в `globals.css`: фон, поверхности, границы, foreground/muted, primary и четыре семантических статуса. В светлой теме primary равен `262 80% 50%`, в `.dark` светлота адаптирована для контраста. Все прежние компоненты переведены на новый формат токенов.
- `.dark` управляется общим ThemeProvider; выбор сохраняется в браузере. CSS aliases обеспечивают единую палитру бизнес-экранов и Shadcn. Тени тоже используют CSS variable.
- Geist и Geist Mono подключены из `next/font/google` с латиницей и кириллицей. Inter не используется. При сборке шрифты загружаются Next.js, браузер получает их локально.
- Компоненты имеют entrance animations с reduced-motion. Исправлено перекрытие disabled-opacity анимацией; публичные UI context hooks используют Result вместо `throw`, добавлены JSDoc.
- В `docs/architecture.md` добавлен раздел **Design System**. Интерактивный каталог — `/design-system`, доступен через защищённый dashboard layout, без изменения бизнес-данных.

## Совместимость команд с существующим проектом

`create-next-app` и Shadcn init не запускались повторно поверх файлов: требуемая конфигурация применена к существующему проекту. Next.js остаётся версии 15 согласно мастер-плану. Prisma остаётся совместимой версии 6.19.3.

Auth.js v5 опубликован как beta; установлен и закреплён `next-auth@5.0.0-beta.32`. Установка пакета в этой задаче не заменяет существующую авторизацию.

Старый Toast удалён из актуального Shadcn registry. Требуемый файл `toast.tsx` предоставляет `toast` и Toaster через поддерживаемый Sonner, который также указан в задании. Это документированная совместимость, без второй конкурирующей системы уведомлений.

## Проверки

- `npm run build` — успешно, включая `/design-system` и все существующие маршруты.
- `npm run typecheck -- --noUnusedLocals --noUnusedParameters` — успешно.
- Файлы всех запрошенных компонентов присутствуют. В коде нет явных `any`, `throw`, hex-цветов в классах и прямых цветовых utility-классов.
- В браузере проверены default/outline/secondary/ghost/destructive/link/disabled Button, Badge, Avatar, Select, DropdownMenu, Dialog, Sheet, Command, форма с Zod, Calendar/Popover, Sidebar, Table, Textarea, Skeleton и уведомления.
- Проверены ошибки пустой формы и успешная отправка без изменения бизнес-данных. Select меняет значение; Dialog/Sheet закрываются Escape; Command фильтрует и выполняет пример.
- Calendar на русском: выбор 20 октября 2026 отображается в кнопке, Popover закрывается. На мобильном календарь имеет ширину 250 px и помещается в экран 390 px.
- Тема light сохраняется после reload, class равен `light`, primary — `262 80% 50%`. Переключение обратно в dark работает. Disabled-кнопка имеет computed opacity `0.5`.
- При reduced motion у Skeleton длительность `0.00001s`, число итераций `1`.
- В браузере шрифты загружаются только с локальных `/_next/static/media/*.woff2`. Проверен dashboard: SVG-график использует `hsl(var(--color-primary))`.
- На ширинах 1440 и 390 px просмотрены новые компоненты. При 390 px ширина body тоже 390 px. Мобильное меню открывается и закрывается.
- После интерактивных сценариев нет ошибок/предупреждений консоли.
- Финальный `npm start`: `/design-system` и восемь бизнес/входных экранов вернули HTTP 200; на свежем production-переходе консоль содержит 0 ошибок и 0 предупреждений. Сервер проверки остановлен после завершения; запуск для работы — `npm run dev`.

Тестовые файлы не создавались: по закону 7 автоматические тесты относятся к CHECKPOINT.

Скриншоты: [тёмная тема](screenshots/task-001-catalog-dark.png), [светлая тема](screenshots/task-001-catalog-light.png), [мобильный каталог](screenshots/task-001-catalog-mobile.png), [мобильный календарь](screenshots/task-001-calendar-mobile.png), [dashboard](screenshots/task-001-dashboard-dark.png).

## Границы результата

Закрыт именно TASK-001. Авторизация Auth.js, подключение живой PostgreSQL и новые бизнес-функции этой задачей не реализуются и не считаются проверенными. Следующие пользовательские задания ещё не закрывались.
