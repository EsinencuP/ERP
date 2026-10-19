import "server-only";
import { authorize, getSession } from "@/lib/auth";
import { err } from "@/lib/errors";

/** Resolve live tenant identity and enforce real storage and finance write/delete permissions. */
export async function getFinanceContext(operation: "read" | "create" | "update" | "delete" = "read") {
  const session = await getSession(); if (!session.ok) return session;
  if (session.data.demo) return err("CONFIGURATION", "Финансовые данные требуют PostgreSQL и реального входа");
  if (operation !== "read") { const access = authorize(session.data, "finance", operation); if (!access.ok) return access; }
  return session;
}
