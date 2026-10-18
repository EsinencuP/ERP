"use client";

import { useEffect, useRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Native keyboard-accessible checkbox with a real indeterminate selection state. */
export function SelectionCheckbox({ indeterminate = false, className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { indeterminate?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return <input {...props} ref={ref} type="checkbox" aria-checked={indeterminate ? "mixed" : Boolean(props.checked)} className={cn("motion-fade size-4 shrink-0 cursor-pointer rounded border-border accent-[hsl(var(--color-primary))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50", className)} />;
}
