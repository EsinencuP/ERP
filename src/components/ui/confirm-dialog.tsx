"use client";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/feedback";

/** Require an explicit product confirmation before deleting a record. */
export function ConfirmDialog({ title, description, busy, error, onConfirm, onClose, confirmLabel = "Удалить запись", disabled = false }: { title: string; description: string; busy: boolean; error: string; onConfirm: () => void; onClose: () => void; confirmLabel?: string; disabled?: boolean }) {
  return <AlertDialog.Root open onOpenChange={function handleOpenChange(open) { if (!open && !busy) onClose(); }}><AlertDialog.Portal><AlertDialog.Overlay className="fixed inset-0 z-50 bg-[hsl(var(--color-overlay))] backdrop-blur-sm" /><AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-[hsl(var(--color-surface))] p-6"><AlertDialog.Title className="text-lg font-medium">{title}</AlertDialog.Title><AlertDialog.Description className="muted mb-6 mt-3 text-xs leading-relaxed">{description}</AlertDialog.Description>{error && <p className="mb-4 text-xs text-[hsl(var(--color-danger))]" role="alert">{error}</p>}<div className="flex justify-end gap-2"><AlertDialog.Cancel asChild><Button variant="outline" disabled={busy}>Отмена</Button></AlertDialog.Cancel><Button variant="destructive" disabled={busy || disabled} onClick={onConfirm}>{busy && <Spinner />}{confirmLabel}</Button></div></AlertDialog.Content></AlertDialog.Portal></AlertDialog.Root>;
}
