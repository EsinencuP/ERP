import "server-only";
import { Prisma } from "@prisma/client";
import { err, ok } from "@/lib/errors";
import type { Result, SessionContext } from "@/types/shared";
import { withInventoryMutation as withMutation } from "./mutations";
import { productIdSchema, productSchema, productVersionSchema } from "./schema";
import { toProduct } from "./serializers";
import type { Product, ProductInput } from "./types";

async function getVersioned(tx: Prisma.TransactionClient, workspaceId: string, id: string, version: number) {
  if (!productIdSchema.safeParse(id).success || !productVersionSchema.safeParse(version).success) return err("VALIDATION", "Нужны ID и актуальная версия товара");
  const row = await tx.product.findUnique({ where: { id_workspaceId: { id, workspaceId } } });
  if (!row) return err("NOT_FOUND", "Товар не найден");
  return row.version === version ? ok(row) : err("CONFLICT", "Товар уже изменён. Обновите каталог");
}
async function auditProduct(tx: Prisma.TransactionClient, session: SessionContext, action: "created" | "updated" | "deleted", product: Product, before: Product | null) {
  await tx.auditLog.create({ data: { workspaceId: session.workspaceId, actorId: session.userId, actor: session.name, domain: "inventory", action, entityType: "Product", entityId: product.id, title: product.name, before: before ? { ...before } : Prisma.DbNull, after: action === "deleted" ? Prisma.DbNull : { ...product } } });
}

/** Create a validated catalog product; physical quantities are changed only through stock operations. */
export async function createProduct(input: ProductInput): Promise<Result<Product>> {
  return withMutation("create", async (tx, session) => {
    const parsed = productSchema.safeParse(input); if (!parsed.success) return err("VALIDATION", "Проверьте поля товара", { fields: parsed.error.flatten() });
    const data = parsed.data, row = await tx.product.create({ data: { ...data, workspaceId: session.workspaceId, category: data.category || null, description: data.description || null } });
    const product = toProduct(row, "0.000"); await auditProduct(tx, session, "created", product, null); return ok(product);
  });
}

/** Edit catalog fields using an immutable opening version, preserving warehouse balances and cost price. */
export async function updateProduct(id: string, version: number, input: ProductInput): Promise<Result<Product>> {
  return withMutation("update", async (tx, session) => {
    const current = await getVersioned(tx, session.workspaceId, id, version); if (!current.ok) return current;
    const parsed = productSchema.safeParse(input); if (!parsed.success) return err("VALIDATION", "Проверьте поля товара", { fields: parsed.error.flatten() });
    const balance = await tx.stockItem.aggregate({ where: { workspaceId: session.workspaceId, productId: id }, _sum: { qty: true } }), stock = balance._sum.qty?.toFixed(3) ?? "0.000", data = parsed.data;
    const row = await tx.product.update({ where: { id_workspaceId: { id, workspaceId: session.workspaceId }, version }, data: { ...data, category: data.category || null, description: data.description || null, version: { increment: 1 } } });
    const product = toProduct(row, stock); await auditProduct(tx, session, "updated", product, toProduct(current.data, stock)); return ok(product);
  });
}

/** Delete an unused current-version product; preserve every stock balance and invoice reference. */
export async function deleteProduct(id: string, version: number): Promise<Result<Product>> {
  return withMutation("delete", async (tx, session) => {
    const current = await getVersioned(tx, session.workspaceId, id, version); if (!current.ok) return current;
    const [stock, invoice] = await Promise.all([tx.stockItem.count({ where: { workspaceId: session.workspaceId, productId: id } }), tx.invoiceItem.count({ where: { workspaceId: session.workspaceId, productId: id } })]);
    if (stock || invoice) return err("CONFLICT", "Товар связан с остатками или счетами. Деактивируйте его вместо удаления");
    const product = toProduct(current.data, "0.000"); await tx.product.delete({ where: { id_workspaceId: { id, workspaceId: session.workspaceId }, version } });
    await auditProduct(tx, session, "deleted", product, product); return ok(product);
  });
}
