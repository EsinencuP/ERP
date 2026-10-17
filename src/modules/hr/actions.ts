"use server";

import * as service from "./service";
import { getEmployees as query } from "./queries";

/** Read hr records from a Server Action. */
export async function getEmployees() { return query(); }
/** Create a validated hr document. */
export async function createEmployee(input: unknown) { return service.createEmployee(input); }
/** Update a versioned hr document. */
export async function updateEmployee(id: string, version: number, input: unknown) { return service.updateEmployee(id, version, input); }
/** Delete an eligible hr document. */
export async function deleteEmployee(id: string, version: number) { return service.deleteEmployee(id, version); }
