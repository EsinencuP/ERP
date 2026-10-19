import { getInventoryDashboard } from "@/modules/inventory/analytics";
import { InventoryDashboard } from "@/modules/inventory/components/inventory-dashboard";
import { InventoryNavigation } from "@/modules/inventory/components/product-presentation";

/** Load the normalized workspace inventory overview with replenishment alerts. */
export default async function Page() { return <><InventoryNavigation section="dashboard" /><InventoryDashboard initialData={await getInventoryDashboard()} /></>; }
