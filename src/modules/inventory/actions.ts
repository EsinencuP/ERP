"use server";

import * as service from "./service";
import { getProducts as query } from "./queries";

/** Read inventory records from a Server Action. */
export async function getProducts() { return query(); }
/** Create a validated inventory document. */
export async function createProduct(input: unknown) { return service.createProduct(input); }
/** Update a versioned inventory document. */
export async function updateProduct(id: string, version: number, input: unknown) { return service.updateProduct(id, version, input); }
/** Delete an eligible inventory document. */
export async function deleteProduct(id: string, version: number) { return service.deleteProduct(id, version); }
