import { ContactsTable } from "@/modules/crm/components/contacts-table";
import { CrmNavigation } from "@/modules/crm/components/crm-navigation";
import { getContacts } from "@/modules/crm/queries";

/** Resolve the first tenant-scoped page on the server and hydrate the interactive table. */
export default async function Page() {
  const initialData = await getContacts();
  return <section className="motion-fade"><CrmNavigation active="contacts" /><ContactsTable initialData={initialData} initialNow={new Date().toISOString()} /></section>;
}
