# TASK-024 — Users management + EUR

Дата: 2026-10-20.

## Реализовано

- `/settings/users`: Avatar, Name, Email, Role, Status, Last login; TanStack Table, server pagination по 20, Unicode search, role/status filters, loading/empty/errors, адаптация 375 px.
- ADMIN/SUPER_ADMIN: создание email-bound приглашения с ролью и копируемой ссылкой на 7 дней; отзыв, срок, одноразовое принятие. Письма не отправляются: SMTP не настроен, UI прямо сообщает об этом.
- Новый аккаунт задаёт имя и пароль ≥12 символов. Существующий подтверждает текущий пароль; профиль/пароль и другие членства сохраняются. После принятия — вход в приглашённый workspace.
- Изменение роли/деактивация/восстановление с expected version. Self-access, SUPER_ADMIN, последний активный администратор защищены. Изменение доступа отзывает только сессии этого workspace. Глобальная блокировка аккаунта не снимается.
- `/settings/audit`: ADMIN+, последние 100 событий tenant, before/after, recursive secret stripping. Workspace access и audit атомарны; Serializable conflict требует refresh. Tokens/passwords/hashes отсутствуют в списках и аудите.
- EN по умолчанию; полный RU через существующий переключатель Settings. Системные подписи переведены, пользовательские имена и email сохраняются.

## EUR

Пользователь явно подтвердил курс **1 EUR = 93 RUB**. Новые счета, расходы, продукты, сделки, бюджеты и legacy суммы используют только EUR; БД CHECK запрещает другие currency у нормализованных моделей. Форматтеры/формы/KPI/PDF/CSV и explicit demo переведены в евро.

Миграция сначала пересчитывает unitPrice InvoiceItem до целого евроцента, затем line total, subtotal и total по действующей формуле. Поэтому итог может отличаться от прямого деления прежнего invoice total. В локальной БД один счёт со 100 строками получил total=180.00 EUR вместо 179.20 EUR при прямом делении старого total; разница 0.80 EUR вызвана округлением единичных цен. Для остальных проверенных счетов разница ≤0.01 EUR. Последняя оплата полностью оплаченного счёта согласуется с новым итогом; суммы/разницы доступны в before/after audit. Непредставимые положительные суммы, иные валюты или изменение partial→paid останавливают транзакцию целиком. Исторический аудит и StockMovement не переписываются.

В реальной локальной PostgreSQL переведено 6 существующих invoices, 109 строк, 3 receipts; 118 conversion audit событий. Исходные записи не удалялись. Файловое demo получает baseCurrency=EUR и конвертируется ровно один раз; ошибки PostgreSQL не включают demo.

## Проверки

- Финальный `npm run build`: PASS; `npx tsc --noEmit`: PASS; `npx prisma validate`: PASS. Повторный migrate deploy не нашёл pending migrations.
- 1845 пар EN/RU: нет отсутствующих статических t-сообщений, расхождений ключей/плейсхолдеров; нет `: any`/console.log в src.
- Explicit demo: 30 сохранённых записей пересчитаны; повторное чтение не меняет суммы/version.

- Реальные production Server Actions, 2 isolated workspace, 5 ролей: чтение/мутации/RBAC, self/SUPER guards, чужие ID, Unicode literal search, строгие DTO, version conflict.
- Роль, деактивация/восстановление, tenant-only session revocation; last login записывается при реальном входе.
- Приглашения: hashing/secret-free DTO, duplicate, short password, existing password proof/profile preservation, repeat accept, revoke, expiry, expired reissue.
- Принудительная ошибка audit INSERT откатила роль/version; гонка одной версии сохранила ровно одно изменение. Viewer ограничен 100 событиями и удаляет вложенные секреты.
- Browser: invite creation, role change, public link redemption → account → authenticated workspace; AGENT получает отказ на admin route. EN/RU, светлая/тёмная темы, keyboard Esc, mobile 375 px, горизонтальный scroll внутри таблицы.
- EUR migration: dry-run + rollback, затем успешный migrate deploy; согласованы все subtotal/total и payment balances. Исходные исторические before/after сохранены.
- Регрессионный `npm run check:finance-inventory`: 9/9 PASS; прежние fixtures приведены к единственной EUR, проверки остатков/больших чисел сохранены.
- PDF en/ru скачивается из production HTTP, просмотрен после Poppler; P&L CSV в EUR: revenue=120.00, expenses=20.00, profit=100.00.

Снимки: `screenshots/task024-*.png`. TASK-025, CHECKPOINT-04 и релиз TASK-026—030 этим изменением не закрываются.
