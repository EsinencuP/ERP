import { ContactsTableSkeleton } from "@/modules/crm/components/contacts-table-skeleton";

/** Show an accessible table placeholder during the initial Server Component request. */
export default function Loading() { return <ContactsTableSkeleton />; }
