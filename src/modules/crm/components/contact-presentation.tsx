
import { useI18n } from "@/i18n/use-i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";
import type { ContactAssignee, ContactTableRow } from "../types";

export const CONTACT_STAGE_LABELS = { LEAD: "Лид", PROSPECT: "Потенциальный", CUSTOMER: "Клиент", INACTIVE: "Неактивен" } as const;
const stageTones = { LEAD: "info", PROSPECT: "warning", CUSTOMER: "success", INACTIVE: "muted" } as const;

/** Render a textual stage with semantic color tokens and a redundant status dot. */
export function ContactStageBadge({ stage }: { stage: ContactTableRow["stage"] }) {
  const { t } = useI18n();

  const tone = stageTones[stage];
  return <Badge variant="outline" className="whitespace-nowrap border-transparent" style={{ color: `hsl(var(--color-${tone}))`, background: `hsl(var(--color-${tone === "muted" ? "hover" : `${tone}-soft`}))` }}><span className="size-1.5 rounded-full bg-current" aria-hidden="true" />{t(CONTACT_STAGE_LABELS[stage])}</Badge>;
}

/** Display an assignee avatar with an accessible name and an initials fallback. */
export function ContactAssigneeAvatar({ owner }: { owner: ContactAssignee | null }) {
  const { t } = useI18n();

  return owner ? <span className="flex items-center gap-2.5" title={owner.name}><Avatar className="size-7 border"><AvatarImage src={owner.avatar ?? undefined} alt="" /><AvatarFallback className="bg-secondary text-[10px] font-medium text-secondary-foreground">{initials(owner.name)}</AvatarFallback></Avatar><span className="max-w-32 truncate text-xs">{owner.name}</span></span> : <span className="text-xs text-muted-foreground">{t("Не назначен")}</span>;
}
