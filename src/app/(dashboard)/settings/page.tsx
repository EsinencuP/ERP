import { Settings } from "@/components/blocks/settings";
import { ErrorPanel } from "@/components/ui/feedback";
import { getSession } from "@/lib/auth";

/** Load authenticated appearance, profile and role settings. */
export default async function Page() { const session = await getSession(); return session.ok ? <Settings session={session.data} /> : <ErrorPanel error={session.error} />; }
