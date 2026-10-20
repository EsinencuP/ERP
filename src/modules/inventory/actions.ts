"use server";
import { localizeResult } from "@/i18n/server";

import { revalidatePath } from "next/cache";
import { createDocument, updateDocument, deleteDocument, getDocuments } from "@/lib/document-service";
import type { Result } from "@/types/shared";
import * as service from "./service";
import * as queries from "./queries";
import * as warehouseQueries from "./warehouse-queries";
import * as warehouseService from "./warehouse-service";
import * as movementQueries from "./movement-queries";
import * as analytics from "./analytics";
import { createStockMovement as createMovement } from "./movement-service";
import type { ProductFilters, ProductInput, WarehouseFilters, WarehouseInput, MovementFilters, StockMovementInput, InventoryDashboardFilters } from "./types";

function revalidateInventory<T>(result: Result<T>) { if (result.ok) { try { revalidatePath("/", "layout"); } catch { console.error("Inventory cache revalidation failed after commit"); } } return result; }
/** Read active-product KPIs and low/zero-stock suggestions after live workspace authorization. */
export async function getInventoryDashboard(filters: InventoryDashboardFilters = {}) { return localizeResult(await analytics.getInventoryDashboard(filters)); }
/** Read a filtered page of normalized products and exact multi-warehouse totals. */
export async function getProducts(filters: ProductFilters = {}) { return localizeResult(await queries.getProducts(filters)); }
/** Read one authorized product with exact total stock. */
export async function getProduct(id: string) { return localizeResult(await queries.getProduct(id)); }
/** Read the global active low/zero-stock alert count for the sidebar. */
export async function getInventoryStockAlert() { return localizeResult(await queries.getInventoryStockAlert()); }
/** Create an audited catalog product. */
export async function createProduct(input: ProductInput) { return localizeResult(await revalidateInventory(await service.createProduct(input))); }
/** Edit a current-version catalog product without modifying stock quantities. */
export async function updateProduct(id: string, version: number, input: ProductInput) { return localizeResult(await revalidateInventory(await service.updateProduct(id, version, input))); }
/** Delete only an unused product after server canDelete authorization. */
export async function deleteProduct(id: string, version: number) { return localizeResult(await revalidateInventory(await service.deleteProduct(id, version))); }
/** Read the tenant warehouse catalog. */
export async function getWarehouses(filters: WarehouseFilters = {}) { return localizeResult(await warehouseQueries.getWarehouses(filters)); }
/** Create a versioned warehouse with atomic audit. */
export async function createWarehouse(input: WarehouseInput) { return localizeResult(await revalidateInventory(await warehouseService.createWarehouse(input))); }
/** Edit warehouse metadata without changing historical balances or movements. */
export async function updateWarehouse(id: string, version: number, input: WarehouseInput) { return localizeResult(await revalidateInventory(await warehouseService.updateWarehouse(id, version, input))); }
/** Delete an unused warehouse only. */
export async function deleteWarehouse(id: string, version: number) { return localizeResult(await revalidateInventory(await warehouseService.deleteWarehouse(id, version))); }
/** Read a product/warehouse quantity and its expected balance version. */
export async function getStockPosition(productId: string, warehouseId: string) { return localizeResult(await movementQueries.getStockPosition(productId, warehouseId)); }
/** Read an immutable product ledger page. */
export async function getProductMovements(productId: string, filters: MovementFilters = {}) { return localizeResult(await movementQueries.getProductMovements(productId, filters)); }
/** Read paginated warehouse quantities for a product. */
export async function getProductStockPositions(productId: string, page = 1) { return localizeResult(await movementQueries.getProductStockPositions(productId, page)); }
/** Read product totals, positions and timeline in parallel. */
export async function getProductInventory(productId: string, filters: MovementFilters = {}, positionsPage = 1) { return localizeResult(await movementQueries.getProductInventory(productId, filters, positionsPage)); }
/** Append IN/OUT/ADJUSTMENT or a paired TRANSFER; ledger update/delete operations do not exist. */
export async function createStockMovement(input: StockMovementInput) { return localizeResult(await revalidateInventory(await createMovement(input))); }
/** Read the preserved Document catalog. */
export async function getProductDocuments() { return localizeResult(await getDocuments("inventory")); }
/** Create a preserved legacy Document product. */
export async function createProductDocument(input: unknown) { return localizeResult(await createDocument("inventory", input)); }
/** Update a preserved legacy Document product. */
export async function updateProductDocument(id: string, version: number, input: unknown) { return localizeResult(await updateDocument("inventory", id, version, input)); }
/** Delete a preserved legacy Document product. */
export async function deleteProductDocument(id: string, version: number) { return localizeResult(await deleteDocument("inventory", id, version)); }
