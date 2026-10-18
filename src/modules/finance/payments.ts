"use server";

import { z } from "zod";
import { authorize, getSession } from "@/lib/auth";
import { failure } from "@/lib/errors";
import { commitDocument, getWorkspaceState } from "@/lib/repository";
import { generateId } from "@/lib/utils";
import type { DocumentRecord, Payment, Result } from "@/types/shared";

const paymentSchema = z.object({ documentId: z.string().min(1), version: z.number().int().positive(), amount: z.number().int().positive().max(2_000_000_000), reference: z.string().uuid() });

/** Atomically record a positive receipt and derive invoice status from the settled total. */
export async function createPayment(input: unknown): Promise<Result<DocumentRecord>> {
  const session = await getSession();
  if (!session.ok) return session;
  const permitted = authorize(session.data, "finance", "update");
  if (!permitted.ok) return permitted;
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return failure("VALIDATION", "Введите положительную сумму платежа (не более 20 млн ₽)");
  const state = await getWorkspaceState(session.data);
  if (!state.ok) return state;
  const invoice = state.data.documents.find((row) => row.id === parsed.data.documentId && row.domain === "finance");
  if (!invoice) return failure("NOT_FOUND", "Счёт не найден");
  if (invoice.version !== parsed.data.version) return failure("CONFLICT", "Счёт уже изменён. Обновите страницу");
  if (invoice.data.status === "Черновик") return failure("CONFLICT", "Сначала отправьте счёт клиенту");
  const total = state.data.payments.filter((row) => row.documentId === invoice.id).reduce((sum, row) => sum + row.amount, 0) + parsed.data.amount;
  if (total > invoice.data.amount) return failure("VALIDATION", "Сумма платежа превышает остаток по счёту");
  const stamp = new Date().toISOString();
  const payment: Payment = { id: generateId(), documentId: invoice.id, workspaceId: session.data.workspaceId, amount: parsed.data.amount, reference: parsed.data.reference, createdAt: stamp };
  const record: DocumentRecord = { ...invoice, version: invoice.version + 1, updatedAt: stamp, data: { ...invoice.data, status: total === invoice.data.amount ? "Оплачен" : "Частично оплачен" } };
  return commitDocument(session.data, record, { id: generateId(), workspaceId: session.data.workspaceId, actor: session.data.name, domain: "finance", action: "payment", title: invoice.data.title, createdAt: stamp }, payment);
}
