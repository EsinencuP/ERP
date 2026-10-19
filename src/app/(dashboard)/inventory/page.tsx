import { ErrorPanel } from "@/components/ui/feedback";
import { getProducts } from "@/modules/inventory/queries";
import { productFiltersSchema } from "@/modules/inventory/schema";
import { ProductTable } from "@/modules/inventory/components/product-table";
import { InventoryNavigation } from "@/modules/inventory/components/product-presentation";

/** Load a normalized inventory page after server-side workspace authorization. */
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const params = await searchParams, parsed = productFiltersSchema.safeParse({ search: params.q ?? "" });
  if (!parsed.success) return <ErrorPanel error={{ code: "VALIDATION", message: "Проверьте поиск товаров" }} />;
  return <><InventoryNavigation /><ProductTable key={parsed.data.search} initialSearch={parsed.data.search} initialData={await getProducts(parsed.data)} /></>;
}
