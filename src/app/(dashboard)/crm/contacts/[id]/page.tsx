import { CrmNavigation } from "@/modules/crm/components/crm-navigation";
import { ContactDetailView } from "@/modules/crm/components/contact-detail-view";
import { ContactRecordError } from "@/modules/crm/components/contact-record-error";
import { getContactDetail } from "@/modules/crm/queries";

/** Await Next.js 15 route params and load only the current workspace's contact snapshot. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getContactDetail(id);
  return <section className="motion-fade min-w-0"><CrmNavigation active="contacts" />{result.ok ? <ContactDetailView key={id} initialData={result.data} initialNow={new Date().toISOString()} /> : <ContactRecordError error={result.error} />}</section>;
}
