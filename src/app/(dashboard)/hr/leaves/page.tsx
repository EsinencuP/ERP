import { getLeaves } from "@/modules/hr/leave-queries";
import { LeaveTable } from "@/modules/hr/components/leave-table";
import { HrNavigation } from "@/modules/hr/components/employee-presentation";

/** Open the workspace leave queue with pending applications selected initially. */
export default async function Page() { return <><HrNavigation section="leaves" /><LeaveTable initialData={await getLeaves({ status: "PENDING" })} /></>; }
