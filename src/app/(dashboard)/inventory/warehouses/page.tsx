import { getWarehouses } from "@/modules/inventory/warehouse-queries";
import { WarehouseTable } from "@/modules/inventory/components/warehouse-table";
import { InventoryNavigation } from "@/modules/inventory/components/product-presentation";

/** Load the live tenant warehouse catalog. */
export default async function Page() { return <><InventoryNavigation section="warehouses" /><WarehouseTable initialData={await getWarehouses()} /></>; }
