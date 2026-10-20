import { ModulePage } from "@/components/blocks/module-page";
import { HrNavigation } from "@/modules/hr/components/employee-presentation";

/** Preserve legacy HR documents without mixing them into the normalized directory. */
export default function Page() { return <><HrNavigation section="legacy" /><ModulePage domain="hr" /></>; }
