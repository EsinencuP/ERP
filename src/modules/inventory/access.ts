import "server-only";
import { authorize, getSession } from "@/lib/auth";
import { err } from "@/lib/errors";

/** Resolve live workspace identity and inventory permissions; normalized stock requires real PostgreSQL. */
export async function getInventoryContext(operation: "read" | "create" | "update" | "delete" = "read") {
  const session = await getSession(); if (!session.ok) return session;
  if (session.data.demo) return err("CONFIGURATION", "Каталог и остатки требуют PostgreSQL и реального входа");
  if (operation !== "read") { const access = authorize(session.data, "inventory", operation); if (!access.ok) return access; }
  return session;
}
