import { getEmployees, getEmployeeDepartments } from "@/modules/hr/queries";
import { EmployeeDirectory } from "@/modules/hr/components/employee-directory";
import { HrNavigation } from "@/modules/hr/components/employee-presentation";

/** Load the normalized directory and department filters in parallel. */
export default async function Page() { const [employees, departments] = await Promise.all([getEmployees({ pageSize: 12 }), getEmployeeDepartments()]); return <><HrNavigation /><EmployeeDirectory initialData={employees} initialDepartments={departments} /></>; }
