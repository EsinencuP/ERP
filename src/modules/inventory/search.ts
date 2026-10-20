import "server-only";
/** Preserve the inventory API while sharing the literal SQL search implementation with HR. */
export { sqlTextMatch as inventoryTextMatch } from "@/lib/sql-search";
