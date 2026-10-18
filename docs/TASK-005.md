# TASK-005 — Layout Shell (Sidebar + Header)

Статус: **ЗАКРЫТ**. Дата: 18 октября 2026, Europe/Moscow.

## Реализация

- `navigation.ts`: единый список Overview → Dashboard; Business → CRM/Finance/Inventory; Operations → HR/Projects; System → Settings. Sidebar, breadcrumbs и глобальный поиск используют этот список.
- `app-sidebar.tsx`: существующий Shadcn Sidebar/Sheet, desktop 248 px / compact 80 px, mobile 288 px. Состояние сохраняется в sidebar_state cookie и читается при SSR; переходы внутри shell его сохраняют. Compact-links имеют aria-label и Tooltip. Меню прокручивается отдельно от страницы.
- `app-header.tsx`: управление Sidebar, breadcrumbs, поиск, уведомления, профиль и next-themes toggle. Header и Settings меняют одну сохранённую тему erp-theme. Нейтральная иконка до mount предотвращает hydration mismatch.
- `(dashboard)/template.tsx`: fade-in route content 150 ms, persistent AppShell не перемонтируется. Состояния форм/страниц сбрасываются обычным поведением Next.js template при смене сегмента.
- Активная ссылка имеет фон/цвет и aria-current; один indicator перемещается transform transition 180 ms. Позиция пересчитывается по ссылке и ResizeObserver. Root не активируется для других модулей.
- Desktop collapse/spacer использует CSS transition 200 ms из shared Sidebar. Глобальный reduced-motion override сокращает движения. Общие keyframes переименованы в component-enter, чтобы не перекрывать enter из tailwindcss-animate и slide у Sheet.
- Escape, overlay/кнопка закрытия и переход закрывают мобильный Sheet. После обычного закрытия фокус возвращается на Header trigger; переключение viewport закрывает мобильную панель. Cmd/Ctrl+B переключает Sidebar, Cmd/Ctrl+K — поиск.
- Совместимый `/favicon.ico` перенаправляет на существующий icon.svg; старые вкладки больше не получают 404.

Новые зависимости не добавлены. Бизнес-записи и конфигурация auth/БД не менялись. Layout документирован в architecture.md. Обязательные STOP-условия Sidebar/theme/active state подтверждены фактически и включены в [CHECKPOINT-01](CHECKPOINT-01.md).

## Проверка и артефакты

Финальные build/typecheck прошли. В браузере проверены все семь переходов, persistent Header DOM и новая route DOM, ширины/длительности transitions, сохранение collapse/темы после reload, синхронизация Settings, mobile Tab trap, Escape/close/focus, reduced motion, поиск и login page.

Скриншоты: [desktop dark](screenshots/task-005-desktop-dark.png), [compact](screenshots/task-005-collapsed.png), [desktop light](screenshots/task-005-desktop-light.png), [mobile](screenshots/task-005-mobile-menu.png). Финальная консоль без ошибок/предупреждений. На 390 px общий documentWidth=390; таблицы прокручиваются внутри контейнеров. Проверочный сервер оставлен доступным на http://127.0.0.1:3000/ с существующим явным деморежимом.
