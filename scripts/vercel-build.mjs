import { spawn } from "node:child_process";

/** Run a local build tool without shell interpolation or exposing environment values. */
function runTool(label, args, extraEnv = {}) {
  console.info(label);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { stdio: "inherit", windowsHide: true, env: { ...process.env, ...extraEnv } });
    child.once("error", () => resolve({ ok: false, error: { code: "CONFIGURATION", message: `${label}: не удалось запустить процесс` } }));
    child.once("exit", (code) => resolve(code === 0 ? { ok: true, data: true } : { ok: false, error: { code: "CONFIGURATION", message: `${label}: команда завершилась с ошибкой` } }));
  });
}

/** Apply reviewed migrations only in production, optionally bootstrap, then compile Next.js. */
async function handleBuild() {
  const production = process.env.VERCEL_ENV === "production";
  if (production) {
    const missing = [];
    if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
    if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) missing.push("AUTH_SECRET/NEXTAUTH_SECRET");
    if (!process.env.AUTH_URL && !process.env.NEXTAUTH_URL) missing.push("AUTH_URL/NEXTAUTH_URL");
    if (missing.length) return { ok: false, error: { code: "CONFIGURATION", message: `Production: задайте ${missing.join(", ")}` } };
    if (process.env.ERP_DEMO_MODE === "true") return { ok: false, error: { code: "CONFIGURATION", message: "Файловый деморежим несовместим с Vercel. Используйте PostgreSQL и ERP_DEMO_MODE=false" } };
  }
  const steps = [["Prisma Client", ["node_modules/prisma/build/index.js", "generate"]]];
  if (production) {
    steps.push(["Production migrations", ["node_modules/prisma/build/index.js", "migrate", "deploy"]]);
    if (process.env.SEED_PUBLIC_SAMPLE === "true") {
      steps.push(["Public training sample", ["--import", "tsx", "prisma/seed.ts"], { SEED_MODE: "sample", SEED_ADMIN_EMAIL: "admin@erp.dev", SEED_ADMIN_PASSWORD: "Admin123!", SEED_WORKSPACE_NAME: "Evo Sample Company", SEED_ONLY_IF_EMPTY: "false" }]);
    } else if (process.env.SEED_ADMIN_EMAIL || process.env.SEED_ADMIN_PASSWORD) {
      steps.push(["Administrator bootstrap", ["--import", "tsx", "prisma/seed.ts"], { SEED_MODE: "bootstrap", SEED_ONLY_IF_EMPTY: "true" }]);
    }
  }
  steps.push(["User guide", ["scripts/build-user-guide.mjs"]]);
  steps.push(["Next.js production build", ["node_modules/next/dist/bin/next", "build"]]);
  for (const [label, args, extraEnv] of steps) { const result = await runTool(label, args, extraEnv); if (!result.ok) return result; }
  return { ok: true, data: true };
}

handleBuild().then((result) => { if (!result.ok) { console.error(result.error.message); process.exitCode = 1; } }).catch(() => { console.error("Не удалось завершить Vercel build"); process.exitCode = 1; });
