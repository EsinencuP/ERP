import type { AppError, ErrorCode, Result } from "@/types/shared";

/** Construct a typed failure without throwing. */
export function failure<T = never>(code: ErrorCode, message: string, meta?: Record<string, unknown>): Result<T> {
  const error: AppError = meta ? { code, message, meta } : { code, message };
  return { ok: false, error };
}

/** Wrap a successful application value. */
export function success<T>(data: T): Result<T> { return { ok: true, data }; }
