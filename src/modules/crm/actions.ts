"use server";

import * as service from "./service";
import { getDeals as query } from "./queries";

/** Read crm records from a Server Action. */
export async function getDeals() { return query(); }
/** Create a validated crm document. */
export async function createDeal(input: unknown) { return service.createDeal(input); }
/** Update a versioned crm document. */
export async function updateDeal(id: string, version: number, input: unknown) { return service.updateDeal(id, version, input); }
/** Delete an eligible crm document. */
export async function deleteDeal(id: string, version: number) { return service.deleteDeal(id, version); }
