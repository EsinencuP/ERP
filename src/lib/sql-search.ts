import "server-only";
import { Prisma } from "@prisma/client";

/** Match literal text with explicit Cyrillic folding even on PostgreSQL's C collation. */
export function sqlTextMatch(value: Prisma.Sql, search: string): Prisma.Sql {
  return Prisma.sql`position(${search.toLowerCase()} in lower(translate(${value}, 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ', 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя'))) > 0`;
}
