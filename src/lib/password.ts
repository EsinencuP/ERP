import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { failure, success } from "@/lib/errors";
import type { Result } from "@/types/shared";

/** Hash an admin-provided password with a unique scrypt salt. */
export function hashPassword(password: string): Result<string> {
  try {
    const salt = randomBytes(16).toString("hex");
    return success(`${salt}:${scryptSync(password, salt, 64).toString("hex")}`);
  } catch { return failure("CONFIGURATION", "Не удалось подготовить пароль"); }
}

/** Compare scrypt hashes in constant time; malformed hashes fail closed. */
export function verifyPassword(password: string, stored: string): Result<boolean> {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return success(false);
    const expected = Buffer.from(hash, "hex");
    const actual = scryptSync(password, salt, 64);
    return success(expected.length === actual.length && timingSafeEqual(expected, actual));
  } catch { return failure("UNAUTHORIZED", "Не удалось проверить пароль"); }
}
