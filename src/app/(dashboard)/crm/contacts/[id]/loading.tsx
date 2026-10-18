import { ContactDetailSkeleton } from "@/modules/crm/components/contact-detail-skeleton";

/** Announce record loading while the Server Component retrieves the contact and timeline. */
export default function Loading() { return <ContactDetailSkeleton />; }
