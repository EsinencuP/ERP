import { MembersWorkspace } from "@/modules/settings/components/members-workspace";
import { getMembers, getInvitations } from "@/modules/settings/actions";
import { getSettingsContext } from "@/modules/settings/access";
import { ErrorPanel } from "@/components/ui/feedback";
export const dynamic = "force-dynamic";
/** Authorize ADMIN+ and load the current workspace directory and invitations in parallel. */
export default async function Page() { const session = await getSettingsContext(); if (!session.ok) return <ErrorPanel error={session.error} />; const [members, invitations] = await Promise.all([getMembers(), getInvitations()]); return <MembersWorkspace session={session.data} initialMembers={members} initialInvitations={invitations} now={new Date().toISOString()} />; }
