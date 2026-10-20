# CHECKPOINT-04 — TASK-018—TASK-025

Дата: 2026-10-20. Реальная локальная PostgreSQL 17.10, production Next.js 15.5.28, два isolated workspace и пять ролей плюс foreign administrator.

## Автоматические проверки

Команда `npm run check:hr-projects-settings` — **9/9 PASS** (8 подзадач + родительский test):

1. Date-only invariance, timestamp timezone, DST Europe/Paris, invalid dates.
2. Singleton per tenant, все роли читают, ADMIN+ writes, strict DTO, fixed EUR, invalid timezone/PNG rejection.
3. Captured version conflict, конкурентное сохранение (один успех), принудительный audit failure откатывает Settings и Workspace.name.
4. HR directory/manager tree/cycle guard/foreign ID/READONLY; документы сотрудника и вручную заданный leave allowance.
5. Leave weekdays (пятница→понедельник = 2), overlap protection, approval RBAC/version, leave balance.
6. Projects task workflow, stale moves, tenant isolation, progress, team и budget usage из Expense.
7. Finance month boundary UTC/Los Angeles: Paid MTD и P&L, payment date filter/CSV timezone; Main Dashboard SSR с KPI, charts, invoice и stock alert; PDF download.
8. Settings Users + last login/session revocation, одноразовое приглашение, audit разных модулей без logo data; notification flags сохраняются. Повреждённая конфигурация даёт STORAGE без fallback.

Регрессии: `npm run check:finance-inventory` — **9/9 PASS**, `npm run check:crm` — **9/9 PASS**. Новый bootstrap с Settings/audit и повторный seed/idempotency проверены отдельно; временный аккаунт удалён.

## Browser / визуальная проверка

- Реальный вход ADMIN, company name save сразу обновляет Sidebar, PNG upload/save, persistence после reload, preview timezone/date format.
- Notification flags: all off → empty notification state; created on → только создание записей. Audit остаётся полным.
- READONLY: company fields disabled, Save отсутствует; серверные crafted mutations запрещены.
- HR directory/org chart/profile/approved leaves. Hire date 01.01.2026 сохраняется при America/Los_Angeles.
- Projects: keyboard DnD (Space → ArrowLeft → Space) DONE → IN_REVIEW сохранён; List/TanStack Table, Overview/CSS Grid timeline.
- Главная: 2 Recharts, recent invoice, low-stock banner, activity feed. Finance значения в EUR.
- PDF ru скачан из HTTP и просмотрен после Poppler, даты по конфигурации; logo fixture принят. CSV проверен с реальным timezone metadata.
- EN/RU, light/dark, reduced motion, mobile 375 px без внешнего overflow; browser console warnings/errors = 0 в финальном проверенном потоке.

## Завершение

`npm run build`, `npx tsc --noEmit`, `npx prisma validate` — PASS. `: any` и console.log в src отсутствуют. EN/RU keys/placeholders совпадают, статические t-сообщения покрыты. Финальная проверка не означает завершение TASK-026—030/релиза v1.0.0.

Снимки: `screenshots/task025-*.png`, `screenshots/checkpoint04-*.png`. Временные fixture tenants/users удалены после проверки; исходные данные и ранее применённые EUR conversion audits сохранены.
