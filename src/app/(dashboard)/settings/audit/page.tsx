import { AuditWorkspace } from "@/modules/settings/components/audit-workspace";
import { getAuditLog } from "@/modules/settings/actions";
export const dynamic = "force-dynamic";
/** Read the latest tenant audit events through the ADMIN+ service boundary. */
export default async function Page() { return <AuditWorkspace initial={await getAuditLog()} />; }
