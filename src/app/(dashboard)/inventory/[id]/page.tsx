import { getProductInventory } from "@/modules/inventory/movement-queries";
import { ProductInventory } from "@/modules/inventory/components/product-inventory";
import { InventoryNavigation } from "@/modules/inventory/components/product-presentation";

/** Load authorized product totals, per-warehouse positions and an immutable ledger. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <><InventoryNavigation /><ProductInventory productId={id} initialData={await getProductInventory(id)} /></>; }
