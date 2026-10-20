"use server";
import { localizeResult } from "@/i18n/server";


import * as service from "./service";
import { getProjects as query } from "./queries";
import { revalidatePath } from "next/cache";
import * as taskQueries from "./task-queries";
import * as taskService from "./task-service";
import type { TaskFilters, TaskInput, TaskProjectInput, TaskStatus } from "./task-types";
import type { Result } from "@/types/shared";
import * as overviewService from "./overview-service";
import type { OverviewProjectInput, OverviewFilters } from "./overview-types";
import * as overviewQueries from "./overview-queries";

function revalidateTasks<T>(result: Result<T>) { if (result.ok) { try { revalidatePath("/projects", "layout"); } catch { console.error("Projects revalidation failed after commit"); } } return result; }
/** Read normalized project progress, budget usage, team previews and timeline dates. */
export async function getProjectOverview(filters: OverviewFilters = {}) { return localizeResult(await overviewQueries.getProjectOverview(filters)); }
/** Read a bounded authorized project team page. */
export async function getProjectTeam(id: string, filters: { page?: number } = {}) { return localizeResult(await overviewQueries.getProjectTeam(id, filters)); }
/** Create a project plan with budget, manager and calendar period. */
export async function createOverviewProject(input: OverviewProjectInput) { return localizeResult(await revalidateTasks(await overviewService.createOverviewProject(input))); }
/** Update a project plan using the opening version and shared Projects RBAC. */
export async function updateOverviewProject(id: string, version: number, input: OverviewProjectInput) { return localizeResult(await revalidateTasks(await overviewService.updateOverviewProject(id, version, input))); }
/** Read normalized tasks in bounded Kanban columns and a sorted list. */
export async function getTaskWorkspace(filters: TaskFilters = {}) { return localizeResult(await taskQueries.getTaskWorkspace(filters)); }
/** Search normalized project options. */
export async function getTaskProjects(filters: { search?: string; page?: number } = {}) { return localizeResult(await taskQueries.getTaskProjects(filters)); }
/** Resolve the tenant-scoped project selected by a deep link or an existing expense. */
export async function getTaskProject(id: string) { return localizeResult(await taskQueries.getTaskProject(id)); }
/** Search active tenant members for task assignment. */
export async function getTaskAssignees(filters: { search?: string; page?: number } = {}) { return localizeResult(await taskQueries.getTaskAssignees(filters)); }
/** Create the minimal normalized project needed to organize tasks. */
export async function createTaskProject(input: TaskProjectInput) { return localizeResult(await revalidateTasks(await taskService.createTaskProject(input))); }
/** Create an audited normalized task. */
export async function createTask(input: TaskInput) { return localizeResult(await revalidateTasks(await taskService.createTask(input))); }
/** Update a task using its opening version. */
export async function updateTask(id: string, version: number, input: TaskInput) { return localizeResult(await revalidateTasks(await taskService.updateTask(id, version, input))); }
/** Change a current task's Kanban status. */
export async function updateTaskStatus(id: string, version: number, status: TaskStatus) { return localizeResult(await revalidateTasks(await taskService.updateTaskStatus(id, version, status))); }
/** Delete a leaf task with the shared manager/admin permission. */
export async function deleteTask(id: string, version: number) { return localizeResult(await revalidateTasks(await taskService.deleteTask(id, version))); }

/** Read projects records from a Server Action. */
export async function getProjects() { return localizeResult(await query()); }
/** Create a validated projects document. */
export async function createProject(input: unknown) { return localizeResult(await service.createProject(input)); }
/** Update a versioned projects document. */
export async function updateProject(id: string, version: number, input: unknown) { return localizeResult(await service.updateProject(id, version, input)); }
/** Delete an eligible projects document. */
export async function deleteProject(id: string, version: number) { return localizeResult(await service.deleteProject(id, version)); }
