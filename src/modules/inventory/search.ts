import "server-only";
import { Prisma } from "@prisma/client";

/** Match literal inventory text with explicit Cyrillic folding even on PostgreSQL's C collation. */
export function inventoryTextMatch(value: Prisma.Sql, search: string): Prisma.Sql {
  return Prisma.sql`position(${search.toLowerCase()} in lower(translate(${value}, 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ', 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя'))) > 0`;
}
