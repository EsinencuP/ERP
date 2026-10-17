"use server";

import * as service from "./service";
import { getInvoices as query } from "./queries";

/** Read finance records from a Server Action. */
export async function getInvoices() { return query(); }
/** Create a validated finance document. */
export async function createInvoice(input: unknown) { return service.createInvoice(input); }
/** Update a versioned finance document. */
export async function updateInvoice(id: string, version: number, input: unknown) { return service.updateInvoice(id, version, input); }
/** Delete an eligible finance document. */
export async function deleteInvoice(id: string, version: number) { return service.deleteInvoice(id, version); }
