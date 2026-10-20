import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { baseRecordSchema, domainSchema } from "@/lib/record-schema";
import { createDemoState } from "@/lib/demo-data";
import { failure, success } from "@/lib/errors";
import type { Result, WorkspaceState } from "@/types/shared";

const root = path.join(process.cwd(), ".data");
const file = path.join(root, "demo-workspace.json");
const stateSchema = z.object({
  baseCurrency: z.literal("EUR").optional(),
  documents: z.array(z.object({ id: z.string(), workspaceId: z.literal("demo-workspace"), domain: domainSchema, version: z.number().int().positive(), createdAt: z.string(), updatedAt: z.string(), data: baseRecordSchema })),
  events: z.array(z.object({ id: z.string(), workspaceId: z.literal("demo-workspace"), actor: z.string(), domain: domainSchema, action: z.enum(["created", "updated", "deleted", "payment"]), title: z.string(), createdAt: z.string() })),
  payments: z.array(z.object({ id: z.string(), workspaceId: z.literal("demo-workspace"), documentId: z.string(), amount: z.number().int().positive(), reference: z.string(), createdAt: z.string() })),
});
const demoGlobal = globalThis as unknown as { erpDemoQueue?: Promise<unknown> };

/** Serialize local demo operations and atomically replace the JSON file on successful writes. */
export async function withDemoState<T>(handleOperation: (state: WorkspaceState) => Result<T>, write = false): Promise<Result<T>> {
  const handleRun = async (): Promise<Result<T>> => {
    try {
      await mkdir(root, { recursive: true });
      let state: WorkspaceState;
      try {
        const parsed = stateSchema.safeParse(JSON.parse(await readFile(file, "utf8")) as unknown);
        if (!parsed.success) return failure("STORAGE", "Файл демоданных повреждён. Восстановите его из резервной копии");
        state = { documents: parsed.data.documents, events: parsed.data.events, payments: parsed.data.payments, ...(parsed.data.baseCurrency ? { baseCurrency: parsed.data.baseCurrency } : {}) };
        if (!state.baseCurrency) {
          const documents = structuredClone(state.documents), payments = structuredClone(state.payments);
          for (const row of documents) { row.data.amount = Math.round(row.data.amount / 93); row.version++; }
          for (const row of payments) { row.amount = Math.round(row.amount / 93); if (row.amount <= 0) return failure("STORAGE", "A demo payment cannot be represented in euro cents"); }
          state = { ...state, documents, payments, baseCurrency: "EUR" };
          await writeFile(`${file}.tmp`, JSON.stringify(state, null, 2), "utf8");
          await rename(`${file}.tmp`, file);
        }
      } catch (error: unknown) {
        if (typeof error !== "object" || error === null || !("code" in error) || error.code !== "ENOENT") return failure("STORAGE", "Не удалось прочитать демоданные");
        state = createDemoState();
        await writeFile(`${file}.tmp`, JSON.stringify(state, null, 2), "utf8");
        await rename(`${file}.tmp`, file);
      }
      const result = handleOperation(state);
      if (write && result.ok) {
        await writeFile(`${file}.tmp`, JSON.stringify(state, null, 2), "utf8");
        await rename(`${file}.tmp`, file);
      }
      return result;
    } catch { return failure("STORAGE", "Не удалось сохранить демоданные. Проверьте права доступа к .data"); }
  };
  const task = (demoGlobal.erpDemoQueue ?? Promise.resolve()).then(handleRun, handleRun);
  demoGlobal.erpDemoQueue = task;
  return task;
}

/** Read an isolated copy of the persisted demo workspace. */
export async function getDemoState(): Promise<Result<WorkspaceState>> { return withDemoState((state) => success(structuredClone(state))); }
