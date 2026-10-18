import type { AppError, ErrorCode, Result } from "@/types/shared";

/** Create a serializable application error, omitting absent optional metadata. */
export function createError(code: ErrorCode, message: string, meta?: Record<string, unknown>): AppError {
  return meta === undefined ? { code, message } : { code, message, meta };
}

/** Wrap a successful value with a literal discriminant for Result narrowing. */
export function ok<T>(data: T): { ok: true; data: T } { return { ok: true, data }; }

/** Construct the failure branch of Result without exposing an exception. */
export function err(code: ErrorCode, message: string, meta?: Record<string, unknown>): { ok: false; error: AppError } {
  return { ok: false, error: createError(code, message, meta) };
}

/** Recognize AppError, failed Result or Prisma P2025 without importing server code. */
export function isNotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = "ok" in error && error.ok === false && "error" in error ? error.error : error;
  return typeof candidate === "object" && candidate !== null && "code" in candidate && (candidate.code === "NOT_FOUND" || candidate.code === "P2025");
}

/** Compatibility wrapper for existing services that specify a result payload type. */
export function failure<T = never>(code: ErrorCode, message: string, meta?: Record<string, unknown>): Result<T> {
  return err(code, message, meta);
}

/** Compatibility name for the shared success constructor. */
export const success = ok;
