import type { z } from "zod";
import type { PaginatedResponse } from "@/types/shared";
import type { overviewProjectSchema, overviewFiltersSchema, PROJECT_STATUSES } from "./overview-schema";
import type { TaskAssignee } from "./task-types";

export type ProjectStatus = typeof PROJECT_STATUSES[number];
export type OverviewProjectInput = z.input<typeof overviewProjectSchema>;
export type OverviewFilters = z.input<typeof overviewFiltersSchema>;
export type ProjectTeamMember = TaskAssignee & { isManager: boolean; active: boolean };
export type OverviewProject = { id: string; code: string; name: string; description: string | null; status: ProjectStatus; budget: string; currency: string; managerId: string | null; manager: TaskAssignee | null; startDate: string | null; endDate: string | null; version: number; tasks: { total: number; done: number; cancelled: number }; spent: string; expenseCount: number; otherCurrencies: { currency: string; amount: string; count: number }[]; team: { total: number; preview: ProjectTeamMember[] } };
export type ProjectOverviewData = PaginatedResponse<OverviewProject> & { asOf: string };
