# Референсы проекта

Репозитории просмотрены как источники архитектурных и UI-направлений. Код из них не копировался. Список сохраняется для последующей работы; он не означает реализацию всех возможностей референсов.

| Референс | Область применения |
| --- | --- |
| [modern-erp-nextjs](https://github.com/imranbru99/modern-erp-nextjs) | Модули, тёмные поверхности, общий ERP layout |
| [Open Mercato](https://github.com/open-mercato/open-mercato) | Модульный монолит, workspace, tenant и события |
| [TailAdmin](https://github.com/TailAdmin/free-nextjs-admin-dashboard) | Sidebar, dashboard, таблицы и общие блоки |
| [ERPNext](https://github.com/frappe/erpnext) | Направление для DocType и дальнейшей бизнес-логики |
| [Aureus ERP](https://github.com/aureuserp/aureuserp) | Декомпозиция finance и HR |
| [Twenty](https://github.com/twentyhq/twenty) | Workspace и развитие RBAC/пользовательских объектов |
| [IDURAR](https://github.com/idurar/idurar-erp-crm) | Invoice / Payment и CRM workflow |
| [NocoBase](https://github.com/nocobase/nocobase) | Kanban и будущие workflow patterns |

API Next.js 15 и Prisma 6 сверены с первичными материалами через Context7. Локальные UI primitives следуют Radix/Shadcn-style композиции, адаптированы под CSS tokens и правила проекта.

TASK-001: [Shadcn CLI](https://ui.shadcn.com/docs/cli), [theming](https://ui.shadcn.com/docs/theming), [Sonner](https://ui.shadcn.com/docs/components/sonner), [Next.js Fonts](https://nextjs.org/docs/app/api-reference/components/font), [Auth.js installation](https://authjs.dev/getting-started/installation). TailAdmin используется как референс устройства Tailwind/layout, Open Mercato — как референс общего UI-слоя; конкретные шрифты и палитру определяет TASK-001 пользователя.

TASK-002: ERPNext — разделение бизнес-документов и строк счёта; Twenty — глобальный User и участие в Workspace; modern-erp-nextjs — журнал аудита. Конкретная схема проектная, код референсов не переносился. API миграций сверялся с установленным Prisma 6.19.3 и его version-specific материалами; актуальные Prisma 8 команды не применяются к этому проекту. Для фактической проверки миграции использована отдельная локальная PostgreSQL 17 из [embedded-postgres](https://github.com/leinelissen/embedded-postgres), установленная только в игнорируемый `.data`, без зависимости приложения и системной службы.

TASK-003: форматирование дат сверено через Context7 с первичными материалами date-fns: [Unicode tokens](https://github.com/date-fns/date-fns/blob/main/pkgs/core/docs/unicodeTokens.md), [локализация](https://github.com/date-fns/date-fns/blob/main/pkgs/core/docs/i18n.md). Для календарного года и дня месяца используются yyyy/dd; форматирование Date использует локальную timezone среды выполнения, существующий dateLabel сохраняет явно заданную Europe/Moscow.

TASK-004: [Auth.js Credentials](https://authjs.dev/getting-started/authentication/credentials), [RBAC JWT/session callbacks](https://authjs.dev/guides/role-based-access-control), [SessionProvider/useSession](https://authjs.dev/getting-started/session-management/get-session), [module augmentation](https://authjs.dev/getting-started/typescript). API сверены через Context7 и установленный next-auth 5.0.0-beta.32. Twenty используется как направление разделения глобального User и workspace Membership; конкретная матрица пяти ролей — политика этого ERP, а не копия политики Twenty. Применены локальные skills webdev-crm-systems и webdev-api-data: единая матрица, обязательная серверная проверка и изоляция tenant.

TASK-005: TailAdmin — разделение Sidebar/Header и responsive shell; Aureus ERP — группировка модульного меню по задачам. Код референсов не копировался. Жизненный цикл App Router layout/template сверён через Context7 с [Next.js 15 templates](https://github.com/vercel/next.js/blob/v15.1.8/docs/01-app/03-api-reference/03-file-conventions/template.mdx). Используются уже установленные Shadcn Sidebar/Sheet/Tooltip и next-themes, без новых зависимостей. Локальные keyframes названы component-enter, чтобы не перекрывать enter из tailwindcss-animate.
