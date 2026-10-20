import { getInvitationPreview } from "@/modules/settings/queries";
import { AcceptInvitation } from "@/modules/settings/components/accept-invitation";
import { ErrorPanel } from "@/components/ui/feedback";
export const dynamic = "force-dynamic";
export const metadata = { title: "Workspace invitation", robots: { index: false, follow: false }, referrer: "no-referrer" };
/** Preview an unexpired one-time invitation without granting workspace access. */
export default async function Page({ params }: { params: Promise<{ token: string }> }) { const { token } = await params, result = await getInvitationPreview(token); return <main id="main-content" className="flex min-h-dvh items-center justify-center p-6">{result.ok ? <AcceptInvitation token={token} invitation={result.data} /> : <ErrorPanel error={result.error} />}</main>; }
