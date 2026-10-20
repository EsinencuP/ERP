"use server";
import { localizeResult } from "@/i18n/server";

import { revalidatePath } from "next/cache";
import { createDocument, updateDocument, deleteDocument, getDocuments } from "@/lib/document-service";
import type { Result } from "@/types/shared";
import * as service from "./service";
import * as queries from "./queries";
import * as leaveQueries from "./leave-queries";
import * as leaveService from "./leave-service";
import * as profileQueries from "./profile-queries";
import * as profileService from "./profile-service";
import type { EmployeeFilters, EmployeeInput, LeaveFilters, LeaveInput, EmployeeProfileFilters, EmployeeDocumentLinkInput, LeaveAllowanceInput } from "./types";
function revalidateHr<T>(result: Result<T>) { if (result.ok) { try { revalidatePath("/hr", "layout"); } catch { console.error("HR cache revalidation failed after commit"); } } return result; }
function revalidateLeaves<T>(result: Result<T>) { if (result.ok) { try { revalidatePath("/", "layout"); } catch { console.error("Leave cache revalidation failed after commit"); } } return result; }
/** Read an employee's complete profile with year-scoped leave balance and document pagination. */
export async function getEmployeeProfile(id: string, filters: EmployeeProfileFilters = {}) { return localizeResult(await profileQueries.getEmployeeProfile(id, filters)); }
/** Add a named external document reference to the employee profile. */
export async function createEmployeeDocumentLink(employeeId: string, input: EmployeeDocumentLinkInput) { return localizeResult(await revalidateHr(await profileService.createEmployeeDocumentLink(employeeId, input))); }
/** Edit an existing employee document reference using its opening version. */
export async function updateEmployeeDocumentLink(id: string, version: number, input: EmployeeDocumentLinkInput) { return localizeResult(await revalidateHr(await profileService.updateEmployeeDocumentLink(id, version, input))); }
/** Remove a current-version employee document reference with HR deletion permission. */
export async function deleteEmployeeDocumentLink(id: string, version: number) { return localizeResult(await revalidateHr(await profileService.deleteEmployeeDocumentLink(id, version))); }
/** Assign explicit annual leave allowance with live manager authorization. */
export async function updateEmployeeLeaveAllowance(employeeId: string, version: number, input: LeaveAllowanceInput) { return localizeResult(await revalidateHr(await profileService.updateEmployeeLeaveAllowance(employeeId, version, input))); }
/** Read a tenant-filtered leave register. */
export async function getLeaves(filters: LeaveFilters = {}) { return localizeResult(await leaveQueries.getLeaves(filters)); }
/** Read the authorized manager's workspace pending counter. */
export async function getLeavePendingCount() { return localizeResult(await leaveQueries.getLeavePendingCount()); }
/** Submit a PENDING application with server-computed weekdays. */
export async function createLeave(input: LeaveInput) { return localizeResult(await revalidateLeaves(await leaveService.createLeave(input))); }
/** Apply one manager decision using the captured request version. */
export async function updateLeaveStatus(id: string, version: number, status: "APPROVED" | "REJECTED") { return localizeResult(await revalidateLeaves(await leaveService.updateLeaveStatus(id, version, status))); }
/** Read the normalized workspace directory. */
export async function getEmployees(filters: EmployeeFilters = {}) { return localizeResult(await queries.getEmployees(filters)); }
/** Read one authorized employee profile. */
export async function getEmployee(id: string) { return localizeResult(await queries.getEmployee(id)); }
/** Read available department filters. */
export async function getEmployeeDepartments() { return localizeResult(await queries.getEmployeeDepartments()); }
/** Read the complete bounded manager hierarchy. */
export async function getEmployeeOrgChart() { return localizeResult(await queries.getEmployeeOrgChart()); }
/** Create a validated employee profile. */
export async function createEmployee(input: EmployeeInput) { return localizeResult(await revalidateHr(await service.createEmployee(input))); }
/** Update the captured employee version and manager relationship. */
export async function updateEmployee(id: string, version: number, input: EmployeeInput) { return localizeResult(await revalidateHr(await service.updateEmployee(id, version, input))); }
/** Delete a current-version unreferenced employee with HR RBAC. */
export async function deleteEmployee(id: string, version: number) { return localizeResult(await revalidateHr(await service.deleteEmployee(id, version))); }
/** Read preserved HR documents separately from Employee. */
export async function getEmployeeDocuments() { return localizeResult(await getDocuments("hr")); }
/** Create a preserved legacy HR document. */
export async function createEmployeeDocument(input: unknown) { return localizeResult(await createDocument("hr", input)); }
/** Update a preserved legacy HR document. */
export async function updateEmployeeDocument(id: string, version: number, input: unknown) { return localizeResult(await updateDocument("hr", id, version, input)); }
/** Delete an eligible legacy HR document. */
export async function deleteEmployeeDocument(id: string, version: number) { return localizeResult(await deleteDocument("hr", id, version)); }
