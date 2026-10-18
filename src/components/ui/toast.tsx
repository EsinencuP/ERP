"use client";

/** Compatibility entry point: the deprecated Shadcn Toast uses the supported Sonner implementation. */
export { toast, type ExternalToast } from "sonner";
export { Toaster } from "@/components/ui/sonner";
