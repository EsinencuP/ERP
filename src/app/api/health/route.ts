import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWorkspaceState } from "@/lib/repository";

export const dynamic = "force-dynamic";

/** Return an authenticated Result-shaped readiness response without secrets. */
export async function GET() {
  const session = await getSession();
  if (!session.ok) return NextResponse.json(session, { status: session.error.code === "UNAUTHORIZED" ? 401 : session.error.code === "FORBIDDEN" ? 403 : 503 });
  const state = await getWorkspaceState(session.data);
  if (!state.ok) return NextResponse.json(state, { status: 503 });
  return NextResponse.json({ ok: true, data: { status: "ready", mode: session.data.demo ? "demo" : "postgresql", version: "0.1.0" } });
}
