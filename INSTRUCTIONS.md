# ERP Template — обязательные правила разработки

Источник требований — мастер-план пользователя от 17 октября 2026. Эти правила обязательны для последующих задач.

1. **TypeScript**: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Не использовать `any`. Бизнес-операции возвращают `Result<T, E>` вместо `throw`. `AppError = { code: ErrorCode; message: string; meta?: Record<string, unknown> }`. JSX-компоненты возвращают JSX; HTTP-обработчики сериализуют Result в ответ.
2. **Именование**: обработчики `handleXxx`. Server Actions: `getXxx`, `createXxx`, `updateXxx`, `deleteXxx`.
3. **Цвета**: только CSS variables в компонентах. Значения палитры объявлять централизованно в `src/app/globals.css`. Не использовать `bg-blue-500`, hex-классы и подобные обходы токенов.
4. **Дизайн**: Geist Sans + Geist Mono. Не Inter. Не синие CTA `#3b82f6`, не голубо-фиолетовые градиенты. Каждому видимому компоненту — entrance animation; учитывать `prefers-reduced-motion`.
5. **Модули**: `src/modules/<domain>/types.ts`, `schema.ts`, `actions.ts`, `queries.ts`, `service.ts`, `components/`. Допускаются дополнительные файлы конфигурации и доменных операций.
6. **DRY**: перед созданием компонентов, hooks или типов проверять `src/components/ui/`, `src/hooks/`, `src/types/shared.ts`.
7. **Проверки**: тесты писать только в CHECKPOINT. В обычных задачах не создавать тесты; выполнять `npm run build` и визуальную проверку. `npm run typecheck` допустим как быстрая диагностика.
8. **Документация**: у каждой публичной функции JSDoc. При архитектурных изменениях сразу обновлять `docs/architecture.md` и документацию домена.
9. **Git**: `feat(module): TASK-NNN description`, либо `fix:`, `docs:`, `refactor:`, `chore:`. Не создавать коммиты, если задача ограничена изменениями файлов.
10. **Противоречия**: конфликт законов = СТОП. Записать в `docs/contradictions.md`, описать варианты и не продолжать зависимую работу до разрешения.

## Design System — TASK-001

База Shadcn: Slate, CSS variables. Токены `--color-*` — каналы HSL, в стилях применять `hsl(var(--color-token))`; допустимы semantic Tailwind-классы, ссылающиеся на эти переменные. `--color-primary` в `:root`: `262 80% 50%`, тёмная тема меняет светлоту для контраста. Основной текст — `--color-foreground`, старый `--color-text` — alias. Тема управляется классом `.dark` через общий ThemeProvider. Шрифты — `Geist` и `Geist_Mono` из `next/font/google`. Старый Toast предоставляется через Sonner. Полные решения — раздел Design System в `docs/architecture.md`.

## Референсы проекта

Список и назначение ссылок — `docs/references.md`. Изучать релевантный референс перед изменением его области. Не переносить код без проверки лицензии; сходство паттернов не означает полную реализацию возможностей исходного продукта.

## Данные и безопасность

- Tenant ID и роль всегда брать из серверной сессии, не из входных данных.
- Все чтения и записи ограничивать workspace. Не обходить shared service прямым Prisma-запросом из UI.
- Деньги хранить целыми копейками. Статус оплаты выводится из поступлений.
- В нормализованной схеме TASK-002 денежные поля — `Decimal(20,0)` в копейках; `Decimal(20,3)` применяется к количествам, `Decimal(5,2)` — к taxRate в процентах. Не превращать произвольный Decimal в JS number. Переходный DocumentPayment сохраняет Int-копейки и старые лимиты.
- Любая мутация создаёт audit event атомарно и проверяет `version`.
- Деморежим — явный opt-in; не использовать как fallback при ошибке PostgreSQL.

## Auth + RBAC — TASK-004

NextAuth v5 Credentials/JWT; src/lib/permissions.ts — единая матрица, auth.ts реэкспортирует PERMISSIONS/hasPermission. Роли SUPER_ADMIN, ADMIN, MANAGER, AGENT, READONLY; VIEWER переименован миграцией. Источник прав — активное Membership текущего workspace, включая SUPER_ADMIN. Любая серверная операция проверяет сессию заново; UI usePermissions не является защитой. Секрет AUTH_SECRET обязателен для реального входа, не должен иметь NEXT_PUBLIC-prefix. Внешний production использует HTTPS. Callback authorize возвращает User/null по контракту Auth.js; фасады/Server Actions возвращают Result и перехватывают исключения библиотеки.
