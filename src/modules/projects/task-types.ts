import type { z } from "zod";
import type { PaginatedResponse } from "@/types/shared";
import type { TASK_STATUSES, TASK_PRIORITIES, taskSchema, taskFiltersSchema, taskProjectSchema } from "./task-schema";

export type TaskStatus = typeof TASK_STATUSES[number];
export type TaskPriority = typeof TASK_PRIORITIES[number];
export type TaskProject = { id: string; code: string; name: string };
export type TaskAssignee = { id: string; name: string; avatar: string | null };
export type Task = { id: string; projectId: string; project: TaskProject; parentId: string | null; title: string; description: string | null; status: TaskStatus | "CANCELLED"; priority: TaskPriority; assignedToId: string | null; assignedTo: TaskAssignee | null; dueAt: string | null; dueDate: string; completedAt: string | null; version: number; updatedAt: string };
export type TaskInput = z.input<typeof taskSchema>;
export type TaskProjectInput = z.input<typeof taskProjectSchema>;
export type TaskFilters = z.input<typeof taskFiltersSchema>;
export type TaskBoard = Record<TaskStatus, PaginatedResponse<Task>>;
export type TaskWorkspaceData = { board: TaskBoard; list: PaginatedResponse<Task> };
