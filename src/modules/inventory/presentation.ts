import type { StockMovement } from "./types";
/** Human-readable ledger operations; immutable movement codes remain unchanged. */
export const STOCK_MOVEMENT_LABELS: Record<StockMovement["type"], string> = { IN: "Приход", OUT: "Списание", ADJUSTMENT: "Корректировка", TRANSFER_IN: "Перемещение: приход", TRANSFER_OUT: "Перемещение: списание" };
