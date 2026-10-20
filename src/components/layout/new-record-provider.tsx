"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type NewRecordAction = { label: string; pathname: string; enabled: boolean; run: () => void };
const NewRecordContext = createContext<{ action: NewRecordAction | null; register: (action: NewRecordAction) => () => void } | null>(null);

/** Share the current route's existing create form with keyboard and palette commands. */
export function NewRecordProvider({ children }: { children: React.ReactNode }) {
  const [action, setAction] = useState<NewRecordAction | null>(null);
  const register = useCallback((next: NewRecordAction) => {
    setAction(next);
    return () => setAction((current) => current === next ? null : current);
  }, []);
  return <NewRecordContext.Provider value={{ action, register }}>{children}</NewRecordContext.Provider>;
}

/** Resolve the registered action without requiring a provider in isolated component previews. */
export function useNewRecord() { return useContext(NewRecordContext)?.action ?? null; }

/** Register a permission-aware action and consume a create intent without losing filters. */
export function useNewRecordAction(label: string, handleCreate: () => void, enabled: boolean) {
  const context = useContext(NewRecordContext), register = context?.register;
  const pathname = usePathname(), params = useSearchParams(), router = useRouter();
  const callback = useRef(handleCreate), consumed = useRef(false);
  useEffect(() => { callback.current = handleCreate; });
  useEffect(() => register?.({ label, pathname, enabled, run: () => callback.current() }), [register, label, pathname, enabled]);
  useEffect(() => {
    if (params.get("create") !== "1") { consumed.current = false; return; }
    if (!register || !enabled || consumed.current) return;
    consumed.current = true;
    const next = new URLSearchParams(params.toString()); next.delete("create");
    router.replace(`${pathname}${next.size ? `?${next}` : ""}${window.location.hash}`, { scroll: false });
    callback.current();
  }, [register, enabled, params, pathname, router]);
}
