# Evo ERP — Developer Guide

Evo ERP is a workspace-scoped ERP template. This is the technical guide for developers and coding agents. Read it before making changes; all ten Architecture Laws below remain mandatory. The user-facing manual is [INSTRUCTIONS.md](../INSTRUCTIONS.md).

Sources: [architecture and ADRs](architecture.md), [roadmap](roadmap.md), [requirement clarifications](contradictions.md), [verification evidence](verification.md), [reference projects](references.md). References inform patterns, not feature parity or permission to copy code without checking its license.

## Quick Start (5 минут)

Prerequisites: Git, Node.js 24 LTS, npm, Docker Engine and Compose v2. The first build requires network access and may take longer than five minutes. In a **new checkout**, run:

```powershell
npm ci
Copy-Item .env.example .env
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64url'))"
```

If `.env` already exists, keep it instead of overwriting it. Paste the generated secret into NEXTAUTH_SECRET in `.env`, then:

```powershell
docker compose up --build -d
docker compose run --rm seed
```

Open [http://localhost:3000/login](http://localhost:3000/login). The explicitly imported sample account is **admin@erp.dev / Admin123!**. Ordinary app startup does not create it. The sample contains 26 contacts, 16 pipeline deals, 5 CRM register records, 5 invoices, 15 products, 3 warehouses, 8 employees and 3 projects with tasks, plus five additional training members and supporting records.

English is the default language; select Russian in Settings. Business currency is EUR. For a real installation use bootstrap with custom credentials, as described below.

## Tech Stack

| Area | Implementation |
| --- | --- |
| Application | Next.js 15 App Router, React 19, TypeScript 5 |
| Database | PostgreSQL; Prisma Client/CLI 6.19.3; SQL migrations |
| Authentication | NextAuth 5.0.0-beta.32, Credentials/JWT, revocable server registry |
| UI | Shadcn/Radix, Tailwind 3, semantic CSS variables, Geist Sans/Mono, Sonner |
| Forms | React Hook Form, Zod |
| Data interfaces | TanStack Table, DnD Kit and shared Kanban hooks |
| Reporting | Recharts, @react-pdf/renderer, CSV Route Handlers |
| Localization/dates | next-intl, date-fns, workspace-aware formatters |
| Initialization/containers | Faker sample seed; Node 24 Debian slim; postgres:16-alpine |

The lockfile defines exact versions. Use npm ci; major upgrades require separate validation. NextAuth v5 is a pinned beta. Docker uses PostgreSQL 16; earlier checks also used PostgreSQL 17, whose data directory cannot be mounted into a PostgreSQL 16 container.

## Environment Setup (.env variables)

`.env.example` is the committed template. `.env`, `.env.local`, `.data/`, credentials and database files are ignored. Never publish secrets or use NEXT_PUBLIC_ for database/auth secrets. Next.js reads its environment files; standalone scripts read only the files explicitly specified by their command.

| Variable | Purpose / default |
| --- | --- |
| DATABASE_URL | Required PostgreSQL connection. Host example: `postgresql://erp:erp_local_only@localhost:5433/erp?schema=public`; Compose supplies an internal URL to postgres:5432. |
| NEXTAUTH_SECRET / AUTH_SECRET | Stable random auth secret; AUTH_SECRET takes precedence. Use a unique value per real installation. |
| NEXTAUTH_URL / AUTH_URL | Public origin, initially http://localhost:3000; AUTH_URL takes precedence. Use the real HTTPS origin externally. |
| AUTH_TRUST_HOST | Compose sets true for its known host setup; review host/proxy trust elsewhere. |
| ERP_DEMO_MODE | false for PostgreSQL. true explicitly enables the separate legacy demo mode; never use it to hide DB failure. |
| POSTGRES_PASSWORD | Compose password; erp_local_only is a local sample default. For real use select a strong URL-safe value and set a matching host DATABASE_URL. |
| POSTGRES_PORT / APP_PORT | Host ports 5433 / 3000, bound to 127.0.0.1. Changing APP_PORT also requires the matching auth URL. |
| SEED_PUBLIC_SAMPLE | Explicit production build opt-in for the isolated public training workspace. Off by default; use only when publishing fictional sample data. |
| SEED_MODE | sample for the isolated sample workspace; bootstrap for an administrator without sample business records. |
| SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD | Sample credentials above; bootstrap requires an explicit email and password of at least 12 characters. |
| SEED_WORKSPACE_NAME | Initialized company name. |
| SEED_REFERENCE_DATE | Optional YYYY-MM-DD UTC anchor for reproducible sample dates; empty uses today's UTC date. |
| SEED_ONLY_IF_EMPTY | Optional bootstrap guard: true prevents creating a new administrator when another user already exists. |
| NODE_ENV | production in the app container. |
| NEXT_OUTPUT_STANDALONE | Internal Docker build flag: 1 produces standalone output. |
| VERCEL_ENV | Platform-provided; vercel-build migrates only production. |

Prisma commands and db:seed use `.env`; the Node seed command does not automatically read `.env.local`. For isolated checks override DATABASE_URL in the process instead of overwriting a working `.env`. Do not print full connection URLs, cookies or tokens.

## Running Locally

With Next.js on the host and PostgreSQL in Compose:

```powershell
npm ci
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev
```

Use the host connection/port from `.env`; postgres resolves inside Compose, not on the host. Open http://localhost:3000. Seed is explicit initialization, not recovery from a connection error.

For production mode on the host:

```powershell
npm run build
npm start
```

For an empty real installation set SEED_MODE=bootstrap, custom administrator email/password and SEED_ONLY_IF_EMPTY=true before migrations/seed. Bootstrap preserves existing account credentials/memberships. Sample reruns preserve the initialized workspace instead of resetting edits. Do not import the public sample account into a real shared installation.

| Command | Purpose |
| --- | --- |
| npm run build | Prisma generation and Next production build/type validation |
| npx tsc --noEmit / npm run typecheck | Strict TypeScript check |
| npx prisma validate | Schema check; does not prove migration execution |
| npm run db:generate | Regenerate Prisma Client |
| npm run db:migrate | Deploy checked-in migrations |
| npm run db:seed / npx prisma db seed | Explicit sample/bootstrap dispatch |
| npm run db:studio | Inspect an authorized database target |
| npm run check:crm | Existing CRM checkpoint suite |
| npm run check:finance-inventory | Existing Finance/Inventory checkpoint suite |
| npm run check:hr-projects-settings | Existing HR/Projects/Settings checkpoint suite |

Checkpoint suites have local DB/base URL guards and create temporary tenants. Read their reports/scripts before running; never point them at production or remove guards to obtain a passing run.

## Docker Setup

```powershell
docker compose up --build -d
docker compose run --rm seed
docker compose ps -a
docker compose logs --tail 50 app migrate
```

Startup: PostgreSQL health → successful migration job → app. Seed belongs to the optional tools profile and runs only explicitly. The standalone app image runs as non-root; Prisma CLI/Faker stay in the tools image. Fonts, CSS and PDFKit assets are bundled for PDF generation.

`/login` is liveness. `/api/health` requires authentication and checks PostgreSQL, reporting mode=postgresql in its Result. Healthy Next.js alone is not proof of a working DB.

```powershell
docker compose stop
docker compose up -d
```

Stop retains data. The erp_postgres16 volume is separate from the former PG17 volume; back up/migrate explicitly when changing versions. Do not delete volumes as a troubleshooting shortcut. Seed/no-op guarantees and container evidence: [TASK-027](TASK-027.md).

Vercel production uses npm run vercel-build: environment validation, Prisma generation, reviewed migrations, optional administrator-only bootstrap, Next build. The explicit SEED_PUBLIC_SAMPLE=true production build flag runs sample initialization instead of bootstrap; both markers preserve existing data on repeat. Preview does not migrate/seed the shared database. Provision isolated environment databases separately; see [DEPLOYMENT.md](DEPLOYMENT.md).

The published user manual is generated from INSTRUCTIONS.md into public/user-guide.html by scripts/build-user-guide.mjs during host/Vercel builds. Do not edit the generated file. AGENTS.md points agents here for development rules.

## Project Structure

```text
src/
  app/                    Routes, Server Components, loading/error, API
    (auth)/               Login and invitation redemption
    (dashboard)/          Authenticated workspace
    api/                  Auth, health, CSV, invoice PDF
  modules/                crm, finance, inventory, hr, projects, settings, dashboard
  components/ui/          Shared Shadcn/Radix primitives
  components/layout/      Sidebar, header, commands, providers
  components/blocks/      Composed screens and legacy blocks
  hooks/                  Permissions, Kanban DnD, reusable UI hooks
  lib/                    DB/auth/permissions/errors/utils, legacy document layer
  types/                  Shared serializable contracts
  i18n/                   English/Russian catalogs and helpers
prisma/                   Schema, SQL migrations, explicit seed
public/fonts/             PDF fonts and third-party license
scripts/                  Checkpoint suites, Vercel build
docs/                     ADRs, task/checkpoint evidence, module guides
```

New features use normalized models/services. Document/DocumentPayment remain transitional, with separate /documents routes in most modules; /crm still hosts the legacy deal table. Normalized contacts, pipeline, invoices and KPIs do not substitute legacy documents for their data.

## Module Guide (CRM / Finance / Inventory / HR / Projects)

| Module | Entry points | Responsibilities |
| --- | --- | --- |
| CRM | /crm/contacts, /crm/contacts/[id], /crm/pipeline | Contact/Deal/Activity, six stages, server pagination, versioned bulk, MANAGER+ CSV. [CRM](modules/crm.md) |
| Finance | /finance, /finance/payments, /finance/expenses, /finance/dashboard, /finance/reports | Invoice/items/payment workflow, EUR, PDF, P&L. [Finance](modules/finance.md) |
| Inventory | /inventory, /inventory/[id], /inventory/warehouses, /inventory/dashboard | Per-warehouse balances and immutable ledger. [Inventory](modules/inventory.md) |
| HR | /hr, /hr/[id], /hr/org-chart, /hr/leaves | Employees, manager hierarchy, doc links, manual allowance, leave. [HR](modules/hr.md) |
| Projects | /projects, /projects/overview | Versioned Kanban/List, budget/progress/team, CSS Grid timeline. [Projects](modules/projects.md) |

Money is Decimal(20,0) **eurocents**, quantity Decimal(20,3), taxRate Decimal(5,2). Round each qty × unitPrice to cents; subtotal sums lines; taxAmount rounds subtotal × taxRate / 100; total adds tax. Never convert arbitrary money to JS Number. Invoice DRAFT → SENT; PAID derives from receipts, OVERDUE from due date/workspace calendar. Only unpaid drafts can be edited/deleted. Payments cannot exceed balance; stock movements cannot be edited/deleted by any role.

Finance/Main Dashboard Revenue uses receipts. P&L uses full invoice totals including tax on their final-payment date, excludes partial payments, then subtracts dated expenses. This is management reporting, not a general ledger. Existing RUB data was converted once at the user-confirmed 1 EUR = 93 RUB; historical audit/stock movements remain unchanged.

HR days exclude weekends, not public holidays. Annual allowance is manual per employee/year; absent differs from zero. Approved annual leave reduces balance; pending is separate. Project progress is DONE/all tasks; budget usage sums linked expenses. Shared DnD changes status, not a persisted custom card rank.

The root Dashboard composes queries with Promise.all/no-store. Settings owns per-workspace configuration, users/invitations and ADMIN+ audit. See [Dashboard](modules/dashboard.md), [Settings](modules/settings.md), [dependencies/RBAC](architecture.md).

## Adding a New Module (шаблон с кодом)

Follow [architecture.md](architecture.md). This **illustrative normalized Notes module** shows a read/update; /notes is not an existing feature. Add the model/migration and regenerate Prisma before compiling these examples. Creation/deletion, UI, localization and navigation remain parts of the new module's requirements.

Add `notes WorkspaceNote[]` to the existing Workspace model, then:

```prisma
model WorkspaceNote {
  id          String    @id @default(cuid())
  workspaceId String
  title       String    @db.VarChar(200)
  version     Int       @default(1)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Restrict)

  @@unique([id, workspaceId])
  @@index([workspaceId, updatedAt, id])
}
```

Add nonempty-title/version > 0 SQL checks in the reviewed migration. Cross-tenant references need composite foreign keys, as in existing models. Do not replace migrations with db push: Prisma schema does not express all checks/triggers.

`src/modules/notes/types.ts`:

```ts
export type WorkspaceNote = { id: string; title: string; version: number };
```

`schema.ts`:

```ts
import { z } from "zod";
export const noteChangeSchema = z.object({
  id: z.string().cuid(),
  version: z.number().int().min(1).max(2147483646),
  title: z.string().trim().min(1).max(200),
}).strict();
```

`access.ts`:

```ts
import "server-only";
import { getSession } from "@/lib/auth";
import { err } from "@/lib/errors";
import type { Result, SessionContext } from "@/types/shared";

/** Resolve the live tenant; Notes requires PostgreSQL. */
export async function getNotesContext(): Promise<Result<SessionContext>> {
  const session = await getSession();
  if (!session.ok) return session;
  return session.data.demo
    ? err("CONFIGURATION", "Notes requires PostgreSQL") : session;
}
```

`queries.ts`:

```ts
import "server-only";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import { getNotesContext } from "./access";
import { noteChangeSchema } from "./schema";
import type { Result } from "@/types/shared";
import type { WorkspaceNote } from "./types";

/** Read a note in the live workspace without trusting a client tenant ID. */
export async function getNote(id: string): Promise<Result<WorkspaceNote>> {
  const context = await getNotesContext();
  if (!context.ok) return context;
  if (!noteChangeSchema.shape.id.safeParse(id).success)
    return err("VALIDATION", "Check the note ID");
  try {
    const row = await db.workspaceNote.findUnique({
      where: { id_workspaceId: { id, workspaceId: context.data.workspaceId } },
      select: { id: true, title: true, version: true },
    });
    return row ? ok(row) : err("NOT_FOUND", "Note not found");
  } catch { return err("STORAGE", "Notes could not be loaded"); }
}
```

`service.ts`:

```ts
import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import { canWrite } from "@/lib/permissions";
import { getNotesContext } from "./access";
import { noteChangeSchema } from "./schema";
import type { Result } from "@/types/shared";
import type { WorkspaceNote } from "./types";

/** Update a captured version and audit it in one serializable transaction. */
export async function updateNote(input: unknown): Promise<Result<WorkspaceNote>> {
  const context = await getNotesContext();
  if (!context.ok) return context;
  if (!canWrite(context.data.role)) return err("FORBIDDEN", "Notes are read-only");
  const parsed = noteChangeSchema.safeParse(input);
  if (!parsed.success) return err("VALIDATION", "Check the note and version");
  const { id, title, version } = parsed.data;
  const { workspaceId, userId, name } = context.data;
  try {
    return await db.$transaction(async (tx) => {
      const member = await tx.membership.findUnique({
        where: { userId_workspaceId: { userId, workspaceId } },
        include: { user: { select: { isActive: true } } },
      });
      if (!member?.isActive || !member.user.isActive || !canWrite(member.role))
        return err("FORBIDDEN", "Your workspace access changed");
      const before = await tx.workspaceNote.findUnique({
        where: { id_workspaceId: { id, workspaceId } },
        select: { id: true, title: true, version: true },
      });
      if (!before) return err("NOT_FOUND", "Note not found");
      if (before.version !== version) return err("CONFLICT", "Reload the note");
      // All Result guards precede writes. A write/audit exception aborts the transaction.
      const after = await tx.workspaceNote.update({
        where: { id_workspaceId: { id, workspaceId }, version },
        data: { title, version: { increment: 1 } },
        select: { id: true, title: true, version: true },
      });
      await tx.auditLog.create({ data: {
        workspaceId, actorId: userId, actor: name, domain: "notes",
        action: "updated", entityType: "WorkspaceNote", entityId: id,
        title: after.title, before: { ...before }, after: { ...after },
      } });
      return ok(after);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError
      && ["P2025", "P2034"].includes(error.code)
      ? err("CONFLICT", "Reload the note")
      : err("STORAGE", "The note could not be saved");
  }
}
```

`actions.ts`:

```ts
"use server";
import { revalidatePath } from "next/cache";
import { localizeResult } from "@/i18n/server";
import * as queries from "./queries";
import * as service from "./service";

/** Read through the authorized public action boundary. */
export async function getNote(id: string) {
  return localizeResult(await queries.getNote(id));
}

/** Save through the service; a refresh failure does not undo the commit. */
export async function updateNote(input: unknown) {
  const result = await service.updateNote(input);
  if (result.ok) {
    try { revalidatePath("/notes"); }
    catch { console.error("Notes cache refresh failed after commit"); }
  }
  return localizeResult(result);
}
```

Add components/ and a Server Component page using authorized queries. Lists need bounded server pagination, whitelisted sorting and visible error/empty states. Add loading/error boundaries, shared forms, en/ru messages (including example errors), semantic colors, entrance/reduced motion and mobile behavior. Register Sidebar/header, command palette and useNewRecordAction for creation.

The shared Domain union still drives legacy Record<Domain,...> registries. Do not invent a Document adapter just to satisfy those maps. Review whether to extend/refactor the registry or retain an explicit normalized access boundary as Settings does. Wire the new audit domain/entity into DTOs, readers, safe summaries and links before exposing it. A string audit.domain in PostgreSQL does not make every UI reader understand a new domain.

## RBAC & Permissions

Read tenant/actor/role from the live server session. Scope every query and related ID to its workspace. Composite FK protect references; DB RLS is not implemented. SUPER_ADMIN has no cross-workspace bypass. UI usePermissions is not authorization.

| Role | Create/update | Delete | Export | Manage users | Read workspace |
| --- | --- | --- | --- | --- | --- |
| SUPER_ADMIN | Yes | Yes | Yes | Yes | Yes |
| ADMIN | Yes | Yes | Yes | Yes | Yes |
| MANAGER | Yes | Yes, except HR | Yes | No | Yes |
| AGENT | Yes | No | No | No | Yes |
| READONLY | No | No | No | No | Yes |

Source: [permissions.ts](../src/lib/permissions.ts); complete [operation matrix](architecture.md). Workflow constraints apply to every role. Leave approval/annual allowance requires MANAGER+; Employee/doc-link deletion ADMIN+; PDF/CSV MANAGER+; configuration writes, members and full audit ADMIN+. Only SUPER_ADMIN manages SUPER_ADMIN assignments. Self-access changes and removal of the last active administrator are protected.

Settings is one versioned row per workspace with atomic audit. Deactivating Membership revokes its workspace sessions. JWT access checks the DB session registry and active Membership/current role; client claims cannot select a tenant or retain removed rights. Session lifetime is 12 hours. Field-level HR/payroll ACL is absent.

## Architecture Laws (все 10 законов)

The original ten laws remain mandatory. TASK-030 explicitly authorizes its commit/push/release; the default restriction on future file-only commits remains.

1. **TypeScript:** strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes; no any. Business operations return Result<T,E>, not throws for expected failures. AppError has code/message/optional serializable meta. Components return JSX, HTTP handlers serialize Result, framework callbacks keep their required signatures.
2. **Naming:** handlers are handleXxx; Server Actions use getXxx/createXxx/updateXxx/deleteXxx.
3. **Colors:** only CSS variables/semantic tokens in components. Palette values live centrally in src/app/globals.css. No direct color utilities/hex classes bypassing tokens.
4. **Design:** Geist Sans + Geist Mono, no Inter. No blue CTA #3b82f6 or cyan/purple gradients. Every visible component has entrance animation with prefers-reduced-motion support.
5. **Modules:** src/modules/<domain>/{types,schema,actions,queries,service}.ts and components/. Additional configuration/domain-operation files are allowed.
6. **DRY:** inspect src/components/ui, src/hooks and src/types/shared.ts before introducing components, hooks or types. Reuse shared table/form/Kanban patterns.
7. **Checks:** new test files only in an assigned CHECKPOINT. Ordinary tasks run build and visual checks of changed UI; typecheck is allowed for diagnosis. Never replace failed PostgreSQL with demo data.
8. **Documentation:** public functions have JSDoc; architectural changes immediately update architecture.md and domain docs.
9. **Git:** feat(module): TASK-NNN description, or fix:/docs:/refactor:/chore:. No commits for file-only tasks without an explicit commit/push/release request. Preserve unrelated edits; do not force-push/rewrite shared history as a shortcut.
10. **Contradictions:** a real law conflict stops dependent implementation. Record requirements/alternatives/consequences in [contradictions.md](contradictions.md); resume dependent work only after resolution.

Mandatory data/security rules: session-derived tenant/role, captured versions for updates, atomic write/audit, immutable stock ledger, eurocent money, plain DTOs and no SQL/stack/secret leakage. Validate before writes: returning err from a Prisma transaction callback does not roll back preceding writes. Unexpected write failures abort the transaction. Retry only documented guaranteed-rollback conflicts, never arbitrary business/external side effects.

## Server Actions Reference

Client components import src/modules/<domain>/actions.ts; Server Components may call server-only queries for initial data. Do not import DB/auth into client code. Actions localize Result/revalidate after commit; access/query/service enforce security/workflow. Consult module types for exact input/defaults.

| File | Normalized action families |
| --- | --- |
| crm/actions.ts | getContacts/getContactDetail/getContactActivities/getContactDeals/getContactAssignees/getContactsForExport; createContact/updateContact/deleteContact; deleteContacts/updateContactsAssignee; getDeals/getDealsByStage/createDeal/updateDealStage/createActivity |
| finance/actions.ts | getInvoices/getInvoice/createInvoice/updateInvoice/updateInvoiceStatus/deleteInvoice/createInvoicePayment; getPayments/getPayableInvoices; getExpenses/getExpense/createExpense/updateExpense/deleteExpense; getFinanceDashboard/getFinanceExport/getPnlReport |
| inventory/actions.ts | getProducts/getProduct/createProduct/updateProduct/deleteProduct; getWarehouses/createWarehouse/updateWarehouse/deleteWarehouse; getStockPosition/getProductMovements/getProductStockPositions/getProductInventory/createStockMovement; getInventoryDashboard/getInventoryStockAlert |
| hr/actions.ts | getEmployees/getEmployee/getEmployeeDepartments/getEmployeeOrgChart/createEmployee/updateEmployee/deleteEmployee; getLeaves/getLeavePendingCount/createLeave/updateLeaveStatus; getEmployeeProfile; createEmployeeDocumentLink/updateEmployeeDocumentLink/deleteEmployeeDocumentLink/updateEmployeeLeaveAllowance |
| projects/actions.ts | getTaskWorkspace/getTaskProjects/getTaskProject/getTaskAssignees/createTaskProject/createTask/updateTask/updateTaskStatus/deleteTask; getProjectOverview/getProjectTeam/createOverviewProject/updateOverviewProject |
| settings/actions.ts | getMembers/updateMember/getInvitations/createInvitation/deleteInvitation/createInvitedMembership/getAuditLog; getAppConfiguration/updateAppConfiguration |

Legacy actions remain for transitional screens; they do not replace normalized services. Auth uses createSession/deleteSession in src/lib/auth-actions.ts. Lists use filter DTOs; updates/deletes normally take id/version plus input. Settings includes version in its input. Absent Settings/allowance/stock have documented version-zero creation cases. Payment takes the invoice's captured version.

Handle Result.ok and VALIDATION/UNAUTHORIZED/FORBIDDEN/NOT_FOUND/CONFLICT/STORAGE/CONFIGURATION explicitly. Reload/review on CONFLICT; do not blindly retry an uncertain payment. Keep export authorization and CSV cell protection on the server.

| HTTP route | Contract |
| --- | --- |
| /api/auth/[...nextauth] | Auth.js transport |
| /api/health | Authenticated app/DB readiness |
| /api/finance/invoices/[id]/pdf | MANAGER+ invoice PDF with local fonts/CSS assets |
| /api/reports/export?type=pnl&from=YYYY-MM-DD&to=YYYY-MM-DD | MANAGER+ fresh P&L CSV; currency is EUR |

## Customization Guide

- **Company/formatting:** Settings controls name/logo/timezone/date format/notification flags. Logo is validated inline PNG ≤256 KB and ≤1024 × 1024; no arbitrary URL fetch. Use ConfigurationProvider/useAppFormat in clients and configuredDate/configuredTimestamp on servers. DATE remains calendar-only; timestamps use workspace timezone. Defaults never hide storage errors.
- **Language:** add matching en/ru catalog entries in src/i18n and preserve placeholders. Translate labels/errors/PDF/CSV; do not translate persisted enums or user text. Cookie evo_locale stores language; invalid values fall back to en.
- **Theme:** edit central HSL tokens and semantic mappings; reuse ThemeProvider/UI/reduced-motion. The shared portfolio palette, typography, radii and migration brief are defined in [VISUAL_ECOSYSTEM.md](VISUAL_ECOSYSTEM.md). Header chrome remains dark in both themes using its own tokens. Check both themes, keyboard focus, disabled states and 375 px.
- **Forms/tables/boards:** reuse RHF/Zod sheets, TanStack pagination and shared DnD. Save through versioned Server Actions with visible network/conflict errors.
- **Permissions:** change canonical permissions and server guards together, then UI. Unknown roles fail closed; Employee.managerId does not imply an ACL.
- **Schema/seed/deploy:** add SQL migrations, validate real PostgreSQL, preserve sample isolation/explicit seed and third-party font licenses. Keep secrets and environment databases separate.

## Known Limitations

- Legacy Document coexistence. Historical reports may mention RUB/USD or fixed Moscow behavior; final architecture defines EUR and workspace Settings.
- Task dueDate is saved at end-of-day +03:00 regardless of the configured timezone. Finance/Projects have helper imports in both directions.
- Invitations are one-time links; no email/push transport, MFA, password reset, login rate limiter or full workspace-switch UI. Auth.js v5 is beta.
- Workspace readers can read ordinary HR data; no field-level payroll ACL. Documents/receipts are links, not secure file uploads/storage.
- No accounting ledger, refunds/allocations, accrual reports or FX engine. Inventory lacks reservations/lots/FIFO; leave lacks public holidays/accrual/carryover.
- Kanban persists status, not custom rank. Palette searches navigation/actions and bounded legacy records, not every normalized entity.
- Audit is append-only by application convention; only StockMovement has a DB immutability trigger. No universal outbox/workflow engine/idempotency API.
- Initial next/font builds fetch Geist and need network; runtime PDF uses local fonts/CSS/PDFKit assets.
- Each installation needs backups, monitoring, environment isolation and security review. Local checkpoint success does not verify an external deployment.

## Contributing

Read this guide, architecture, roadmap and domain docs first. Work on a focused branch, preserve existing edits and follow all ten laws. Never commit .env, cookies, credentials or local PostgreSQL data.

Ordinary tasks require build and relevant UI checks. At CHECKPOINT also run requested DB/integration verification and trace UI → action/API → PostgreSQL → rendered result. Record exact commands/results/limitations in verification.md and the checkpoint report. New tests belong only to an assigned CHECKPOINT.

Commit when authorized; PR descriptions explain behavior and evidence. Do not announce a release/merge/tag before its checkpoint passes. A Git tag does not publish an npm package; this application's manifest is private.

## License (MIT)

Project source is available under the [MIT License](../LICENSE). Fonts retain their [OFL license](../public/fonts/OFL-Geist.txt); dependencies retain their respective licenses. Reference projects in [references.md](references.md) keep their own licenses.
