import * as React from "react";
import { cn } from "@/lib/utils";

/** Shared form input; forwards its ref to React Hook Form. */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) { return <input className={cn("input motion", className)} ref={ref} {...props} />; });
