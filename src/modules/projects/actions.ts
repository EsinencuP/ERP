"use server";

import * as service from "./service";
import { getProjects as query } from "./queries";

/** Read projects records from a Server Action. */
export async function getProjects() { return query(); }
/** Create a validated projects document. */
export async function createProject(input: unknown) { return service.createProject(input); }
/** Update a versioned projects document. */
export async function updateProject(id: string, version: number, input: unknown) { return service.updateProject(id, version, input); }
/** Delete an eligible projects document. */
export async function deleteProject(id: string, version: number) { return service.deleteProject(id, version); }
