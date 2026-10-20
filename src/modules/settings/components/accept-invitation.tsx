"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/use-i18n";
import { ROLE_LABELS } from "@/lib/permissions";
import { createSession } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InvitationPreview } from "../types";
import { createInvitedMembership } from "../actions";

/** Redeem the email-bound link and enter its workspace with verified credentials. */
export function AcceptInvitation({ token, invitation }: { token: string; invitation: InvitationPreview }) {
  const { t } = useI18n(), [pending, setPending] = useState(false), [error, setError] = useState(""), [accepted, setAccepted] = useState(false), [blocked, setBlocked] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending || blocked) return; const fields = new FormData(event.currentTarget), password = String(fields.get("password") ?? ""); setPending(true); setError("");
    try {
      if (!accepted) { const result = await createInvitedMembership({ token, name: String(fields.get("name") ?? ""), password }); if (!result.ok) { setError(result.error.message); return; } setAccepted(true); }
      const session = await createSession({ email: invitation.email, password, invitationToken: token });
      if (!session.ok) { setError(session.error.message); return; } window.location.assign("/");
    } catch { setBlocked(true); setError(t("The operation could not be confirmed. Reload this page before trying again")); } finally { setPending(false); }
  }
  return <section className="panel w-full max-w-md p-6 sm:p-8"><h1 className="text-2xl font-semibold tracking-tight">{t(accepted ? "Invitation accepted" : "Join workspace")}</h1><p className="mt-3 text-sm">{invitation.workspaceName}</p><p className="muted mt-2 break-all text-xs">{invitation.email} · {t(ROLE_LABELS[invitation.role])}</p><p className="muted my-5 text-xs leading-relaxed">{t(accepted || invitation.existingAccount ? "Enter your existing account password to sign in. Your account profile will be preserved." : "Choose your name and a password of at least 12 characters.")}</p><form onSubmit={handleSubmit} className="space-y-4"><fieldset disabled={pending} className="space-y-4">{!invitation.existingAccount && !accepted && <div><label htmlFor="invite-name" className="field-label">{t("Name")}</label><Input id="invite-name" name="name" autoComplete="name" minLength={2} maxLength={160} required /></div>}<div><label htmlFor="invite-password" className="field-label">{t("Password")}</label><Input id="invite-password" name="password" type="password" autoComplete={invitation.existingAccount || accepted ? "current-password" : "new-password"} minLength={invitation.existingAccount || accepted ? 1 : 12} maxLength={200} required /></div></fieldset>{error && <p role="alert" className="text-xs text-destructive">{t(error)}</p>}<Button type="submit" disabled={pending || blocked} className="w-full">{t(pending ? "Please wait…" : accepted ? "Sign in" : "Accept invitation")}</Button></form><Link href="/login" className="mt-5 inline-block text-xs text-primary">{t("Back to sign in")}</Link></section>;
}
