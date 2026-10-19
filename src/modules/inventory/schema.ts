import { z } from "zod";
import { baseRecordSchema } from "@/lib/record-schema";
import { definition } from "./config";

export const schema = baseRecordSchema.extend({ status: z.enum(definition.statuses), subtitle: z.string().trim().min(1, "Заполните поле").max(160) });

export const STOCK_STATUSES = ["in_stock", "low_stock", "out_of_stock"] as const;
export const productIdSchema = z.string().trim().min(1).max(128);
export const productVersionSchema = z.number().int().positive().max(2_147_483_646);
export const productQuantitySchema = z.string().regex(/^\d{1,17}(\.\d{1,3})?$/, "Количество: неотрицательное число, до 3 знаков после точки");
export const PRODUCT_CURRENCIES = ["RUB", "USD", "EUR"] as const;
export const productSchema = z.object({
  sku: z.string().trim().min(1, "Введите SKU").max(64), name: z.string().trim().min(1, "Введите наименование").max(200),
  category: z.string().trim().max(100).default(""), description: z.string().trim().max(10000).default(""),
  unit: z.string().trim().min(1, "Укажите единицу").max(32).default("pcs"),
  currency: z.enum(PRODUCT_CURRENCIES).default("RUB"), salePrice: z.string().regex(/^\d{1,20}$/, "Цена в целых копейках, до 20 цифр"),
  minStock: productQuantitySchema.default("0"), isActive: z.boolean().default(true),
}).strict();
export const productFormSchema = productSchema.extend({ salePrice: z.string().regex(/^\d{1,18}(\.\d{1,2})?$/, "Цена: неотрицательное число, до 2 знаков после точки") });
export const productFiltersSchema = z.object({
  page: z.number().int().min(1).max(1000000).default(1), pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).default(""), category: z.string().trim().max(100).optional(),
  stockStatus: z.enum([...STOCK_STATUSES, "attention"]).optional(), active: z.enum(["active", "inactive", "all"]).default("active"),
}).strict();
export const inventoryDashboardFiltersSchema = z.object({ page: z.number().int().min(1).max(1000000).default(1), pageSize: z.number().int().min(1).max(100).default(20), search: z.string().trim().max(200).default(""), stockStatus: z.enum(["low_stock", "out_of_stock"]).optional() }).strict();

export const warehouseSchema = z.object({ code: z.string().trim().min(1, "Введите код склада").max(32), name: z.string().trim().min(1, "Введите название склада").max(200), address: z.string().trim().max(2000).default(""), isActive: z.boolean().default(true) }).strict();
export const warehouseFiltersSchema = z.object({ page: z.number().int().min(1).max(1000000).default(1), pageSize: z.number().int().min(1).max(100).default(20), search: z.string().trim().max(200).default(""), active: z.enum(["active", "inactive", "all"]).default("all") }).strict();
export const MOVEMENT_KINDS = ["IN", "OUT", "ADJUSTMENT", "TRANSFER"] as const;
const movementBase = z.object({ productId: productIdSchema, warehouseId: productIdSchema, stockVersion: z.number().int().min(0).max(2_147_483_646), reference: z.string().trim().max(128).default(""), notes: z.string().trim().max(1000).default("") });
const positiveQuantity = productQuantitySchema.refine((value) => /[1-9]/.test(value), "Количество должно быть больше нуля");
export const stockMovementSchema = z.discriminatedUnion("type", [
  movementBase.extend({ type: z.literal("IN"), quantity: positiveQuantity }).strict(),
  movementBase.extend({ type: z.literal("OUT"), quantity: positiveQuantity }).strict(),
  movementBase.extend({ type: z.literal("ADJUSTMENT"), quantity: z.string().regex(/^-?\d{1,17}(\.\d{1,3})?$/, "Корректировка: ненулевая дельта, до 3 знаков").refine((value) => /[1-9]/.test(value), "Корректировка не может быть нулевой") }).strict(),
  movementBase.extend({ type: z.literal("TRANSFER"), quantity: positiveQuantity, targetWarehouseId: productIdSchema, targetStockVersion: z.number().int().min(0).max(2_147_483_646) }).strict(),
]).refine((value) => value.type !== "TRANSFER" || value.warehouseId !== value.targetWarehouseId, { path: ["targetWarehouseId"], message: "Выберите другой склад назначения" });
export const movementFiltersSchema = z.object({ page: z.number().int().min(1).max(1000000).default(1), pageSize: z.number().int().min(1).max(100).default(20), type: z.enum(MOVEMENT_KINDS).optional() }).strict();
