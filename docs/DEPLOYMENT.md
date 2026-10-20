# Vercel production deployment

18 октября 2026. Project: `erp`, team: `themrack26-1196s-projects`. Public URL: https://erp-xi-pink.vercel.app. Git: https://github.com/EsinencuP/ERP, production branch `main`. Node.js 24.x, Next.js 15.5.28, Prisma 6.19.3.

## Найдено и исправлено

В GitHub/Vercel оставался старый неполный коммит `784441f`: root layout отсутствовал, build падал с `(dashboard)/finance/page.tsx doesn't have a root layout`, домен отдавал DEPLOYMENT_NOT_FOUND. Актуальные foundation/CRM commits опубликованы; сборка `8ffc84f` прошла.

В проекте уже была Prisma Postgres интеграция с server-only DATABASE_URL, но не было AUTH_SECRET/AUTH_URL и миграций. Production настроен с ERP_DEMO_MODE=false, устойчивым случайным AUTH_SECRET и AUTH_URL=https://erp-xi-pink.vercel.app. Секреты не выводились, не коммитились и не помещались в NEXT_PUBLIC.

`06ed6f7` добавляет vercel.json и scripts/vercel-build.mjs. Pipeline: Prisma generate → production-only prisma migrate deploy → optional idempotent first bootstrap → next build. Все четыре миграции применены успешно. Данные не сбрасывались; демозаписи не импортировались. Preview пропускает миграции и bootstrap: существующая интеграция пока связывает Preview и Production с одной базой. Для безопасной разработки с реальными данными следующая настройка — отдельная preview-БД.

Создан первый ADMIN и пустое пространство «Evo ERP». Технический логин admin@evo-erp.local; случайный пароль хранится только в игнорируемом локальном `.data/vercel-admin-credentials.json` с Windows ACL владельца. Он не записан в отчёт. Production bootstrap проверяет SEED_ONLY_IF_EMPTY; существующие аккаунты/пароли не заменяет. SEED_ADMIN_EMAIL/PASSWORD/WORKSPACE_NAME удалены из настроек Vercel после создания; финальный redeploy выполняется без bootstrap env.

## Проверка published system

- `npm run build` локально прошёл; cloud vercel-build успешно применил миграции, создал admin и скомпилировал Next.js. Репозиторий и проект связаны, root directory — корень, framework — Next.js.
- Production HTTPS `/login` визуально открылся с Credentials form, без публичного demo-доступа.
- Неверный пароль отклонён; правильный даёт ADMIN session и Secure/HttpOnly cookie.
- Anonymous `/api/health` → 401 (ожидаемая защита). После входа → `{ok:true,data:{status:"ready",mode:"postgresql",version:"0.1.0"}}`.
- Authenticated `/`, `/crm/contacts`, `/crm/pipeline`, `/finance`, `/inventory`, `/hr`, `/projects`, `/settings` → HTTP 200, без server exception page.
- На опубликованных Server Actions: createContact → detail SSR/DB read → update stage/company/tags → filtered getContacts → deleteContact → NOT_FOUND. Pipeline читает шесть этапов. Временный smoke contact удалён штатным действием; audit сохранён по правилам системы.
- Signout очистил сессию. Server Action IDs для cloud-проверки прочитаны из опубликованных JS chunks: локальные Windows IDs отличаются от Linux build и не использовались как признак отказа приложения.

Автоматические тестовые файлы в задаче не добавлялись; выполнены CLI/HTTP/визуальные проверки. Данные локальной .env не менялись. Production schema/health проверялись в настоящей Prisma Postgres, без demo fallback.

## Обслуживание

Push в main запускает production build с сохранёнными миграциями. Не заменять DATABASE_URL локальным адресом или PRISMA_DATABASE_URL без проверки совместимости. AUTH_SECRET сохранять устойчивым; его смена отзывает JWT. Bootstrap пароль после первого запуска не хранить в env. Для работы пользователя использовать credentials из локального файла, затем организовать собственное управление аккаунтами/паролями.

Этот запуск не добавляет MFA/rate limiting, password reset UI, workspace switching и остальные будущие ERP-сервисы. CHECKPOINT-02 подтверждает CRM-сценарии; текущий деплой подтверждает сборку и основные операции на Vercel.

## Публичный учебный набор — 20.10.2026

По прямому запросу пользователя опубликовано отдельное Evo Sample Company с public sample credentials и пятью дополнительными участниками. Одноразовый production build flag SEED_PUBLIC_SAMPLE=true выполнил transactional sample import, обычные production builds по-прежнему не запускают его автоматически. Private bootstrap account и прежние компании не присоединялись к sample. User manual теперь доступен на /user-guide.html, developer rules — docs/DEVELOPER_GUIDE.md.

Deployment dpl_ByTVBzdTeqo8dyajPiwLYrAaPCKA READY; источник 643ce79. Scope/project проверены через Vercel CLI перед deploy. .vercelignore явно исключает .data/.env/local DB при CLI uploads. Подтверждённые проверки public Users/Audit/CRM/модулей и инструкция: [USER_GUIDE_PUBLIC_SAMPLE.md](USER_GUIDE_PUBLIC_SAMPLE.md).
