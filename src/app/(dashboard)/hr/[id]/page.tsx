import { getEmployeeProfile } from "@/modules/hr/profile-queries";
import { EmployeeProfile } from "@/modules/hr/components/employee-profile";
import { HrNavigation } from "@/modules/hr/components/employee-presentation";

/** Load one authorized employee's profile, documents and current-year leave balance. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <><HrNavigation /><EmployeeProfile key={id} employeeId={id} initialData={await getEmployeeProfile(id)} /></>;
}
