"use client";
import { useEffect, useRef, useState } from "react";
import type { Result } from "@/types/shared";
import { getLeavePendingCount } from "./actions";

/** Refresh the authorized pending badge after navigation, window focus and committed leave changes. */
export function useLeavePendingCount(initialData: Result<number> | null, pathname: string): Result<number> | null {
  const [data, setData] = useState(initialData), sequence = useRef(0), previousPath = useRef(pathname), enabled = initialData !== null;
  useEffect(() => { sequence.current++; setData(initialData); }, [initialData]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    function handleRefresh() { const request = ++sequence.current; getLeavePendingCount().then((result) => { if (active && request === sequence.current) setData(!result.ok && result.error.code === "FORBIDDEN" ? null : result); }).catch(() => { if (active && request === sequence.current) setData({ ok: false, error: { code: "STORAGE", message: "Согласования недоступны" } }); }); }
    if (previousPath.current !== pathname) { previousPath.current = pathname; handleRefresh(); }
    window.addEventListener("focus", handleRefresh); window.addEventListener("hr-leaves-changed", handleRefresh);
    return () => { active = false; window.removeEventListener("focus", handleRefresh); window.removeEventListener("hr-leaves-changed", handleRefresh); };
  }, [pathname, enabled]);
  return data;
}
