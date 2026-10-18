import { ModulePage } from "@/components/blocks/module-page";
import { CrmNavigation } from "@/modules/crm/components/crm-navigation";

/** Load the authenticated deals workspace and expose the normalized contact directory. */
export default function Page() { return <section><CrmNavigation active="deals" /><ModulePage domain="crm" /></section>; }
