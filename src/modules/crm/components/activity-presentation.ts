import { CalendarDays, CheckSquare2, Mail, MessageSquare, Phone, type LucideIcon } from "lucide-react";
import type { ActivityType } from "@prisma/client";

/** Consistent activity labels and icons across the composer and timeline. */
export const ACTIVITY_PRESENTATION = {
  CALL: { label: "Звонок", icon: Phone, tone: "info" },
  EMAIL: { label: "Письмо", icon: Mail, tone: "primary" },
  MEETING: { label: "Встреча", icon: CalendarDays, tone: "warning" },
  TASK: { label: "Задача", icon: CheckSquare2, tone: "success" },
  NOTE: { label: "Заметка", icon: MessageSquare, tone: "muted" },
} as const satisfies Record<ActivityType, { label: string; icon: LucideIcon; tone: string }>;
