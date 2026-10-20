import type { Result } from "@/types/shared";
import type { DealDashboardData } from "@/modules/crm/analytics";
import type { FinanceDashboardData } from "@/modules/finance/types";
import type { InventoryStockAlert } from "@/modules/inventory/types";

export type DashboardActivity = { id: string; actor: string; domain: string; action: string; title: string; entityType: string | null; entityId: string | null; createdAt: string };
export type DashboardData = { finance: Result<FinanceDashboardData>; deals: Result<DealDashboardData>; stock: Result<InventoryStockAlert>; pending: Result<number>; activity: Result<DashboardActivity[]> };
