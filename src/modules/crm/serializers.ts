import type { Contact as DbContact, Activity as DbActivity, Prisma } from "@prisma/client";
import type { Activity, Contact, ContactActivity, ContactTableRow, Deal, PipelineDeal } from "./types";

export const dealContactInclude = { contact: { select: { id: true, name: true, company: true } } } as const;
export const contactOwnerInclude = { owner: { select: { user: { select: { id: true, name: true, avatar: true } } } } } as const;
export const dealPipelineInclude = {
  ...dealContactInclude, ...contactOwnerInclude,
  activities: { select: { id: true, subject: true, type: true, createdAt: true }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 1 },
} as const satisfies Prisma.DealInclude;
export const contactActivityInclude = { assignedTo: { select: { user: { select: { id: true, name: true, avatar: true } } } }, deal: { select: { id: true, title: true, stage: true } } } as const satisfies Prisma.ActivityInclude;
type DealRow = Prisma.DealGetPayload<{ include: typeof dealContactInclude }>;

/** Serialize contact timestamps for React Server Actions and audit snapshots. */
export function toContact(row: DbContact): Contact { return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }; }

/** Add a bounded owner summary without exposing Membership or authentication fields. */
export function toContactTableRow(row: Prisma.ContactGetPayload<{ include: typeof contactOwnerInclude }>): ContactTableRow {
  const { owner, ...contact } = row;
  return { ...toContact(contact), owner: owner?.user ?? null };
}

/** Serialize Decimal minor units exactly and DATE independently of the server timezone. */
export function toDeal(row: DealRow): Deal {
  return { ...row, value: row.value.toFixed(0), expectedCloseDate: row.expectedCloseDate?.toISOString().slice(0, 10) ?? null, closedAt: row.closedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

/** Serialize pipeline relations without leaking membership data or unbounded activity history. */
export function toPipelineDeal(row: Prisma.DealGetPayload<{ include: typeof dealPipelineInclude }>): PipelineDeal {
  const { owner, activities, ...deal } = row;
  const activity = activities[0];
  return { ...toDeal(deal), owner: owner?.user ?? null, lastActivity: activity ? { ...activity, createdAt: activity.createdAt.toISOString() } : null };
}

/** Serialize nullable activity timestamps without returning Date instances. */
export function toActivity(row: DbActivity): Activity {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), dueAt: row.dueAt?.toISOString() ?? null, completedAt: row.completedAt?.toISOString() ?? null };
}

/** Serialize a timeline entry with safe assignee and linked-deal summaries. */
export function toContactActivity(row: Prisma.ActivityGetPayload<{ include: typeof contactActivityInclude }>): ContactActivity {
  const { assignedTo, deal, ...activity } = row;
  return { ...toActivity(activity), assignee: assignedTo?.user ?? null, deal };
}
