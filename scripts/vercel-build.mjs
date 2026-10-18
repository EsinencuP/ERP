import { spawn } from "node:child_process";

/** Run a local build tool without shell interpolation or exposing environment values. */
function runTool(label, args) {
  console.info(label);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { stdio: "inherit", windowsHide: true });
    child.once("error", () => resolve({ ok: false, error: { code: "CONFIGURATION", message: `${label}: не удалось запустить процесс` } }));
    child.once("exit", (code) => resolve(code === 0 ? { ok: true, data: true } : { ok: false, error: { code: "CONFIGURATION", message: `${label}: команда завершилась с ошибкой` } }));
  });
}

/** Apply reviewed migrations only in production, optionally bootstrap, then compile Next.js. */
async function handleBuild() {
  const production = process.env.VERCEL_ENV === "production";
  if (production) {
    const missing = ["DATABASE_URL", "AUTH_SECRET", "AUTH_URL"].filter((key) => !process.env[key]);
    if (missing.length) return { ok: false, error: { code: "CONFIGURATION", message: `Production: задайте ${missing.join(", ")}` } };
    if (process.env.ERP_DEMO_MODE === "true") return { ok: false, error: { code: "CONFIGURATION", message: "Файловый деморежим несовместим с Vercel. Используйте PostgreSQL и ERP_DEMO_MODE=false" } };
  }
  const steps = [["Prisma Client", ["node_modules/prisma/build/index.js", "generate"]]];
  if (production) {
    steps.push(["Production migrations", ["node_modules/prisma/build/index.js", "migrate", "deploy"]]);
    if (process.env.SEED_ADMIN_EMAIL || process.env.SEED_ADMIN_PASSWORD) {
      process.env.SEED_ONLY_IF_EMPTY = "true";
      steps.push(["Administrator bootstrap", ["--import", "tsx", "prisma/seed.ts"]]);
    }
  }
  steps.push(["Next.js production build", ["node_modules/next/dist/bin/next", "build"]]);
  for (const [label, args] of steps) { const result = await runTool(label, args); if (!result.ok) return result; }
  return { ok: true, data: true };
}

handleBuild().then((result) => { if (!result.ok) { console.error(result.error.message); process.exitCode = 1; } }).catch(() => { console.error("Не удалось завершить Vercel build"); process.exitCode = 1; });
