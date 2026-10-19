import { ModulePage } from "@/components/blocks/module-page";
import { InventoryNavigation } from "@/modules/inventory/components/product-presentation";

/** Preserve the explicitly named legacy Document inventory separately from warehouse stock. */
export default function Page() { return <><InventoryNavigation legacy /><ModulePage domain="inventory" /></>; }
