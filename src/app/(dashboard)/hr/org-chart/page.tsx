import { getEmployeeOrgChart } from "@/modules/hr/queries";
import { EmployeeOrgChart } from "@/modules/hr/components/employee-org-chart";
import { HrNavigation } from "@/modules/hr/components/employee-presentation";

/** Load the authorized workspace's recursive employee hierarchy. */
export default async function Page() { return <><HrNavigation section="org" /><EmployeeOrgChart initialData={await getEmployeeOrgChart()} /></>; }
