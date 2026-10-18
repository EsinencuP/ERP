import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/lib/auth";
import { getDemoSession, hasAuthSecret, isDemoMode } from "@/lib/auth-service";
import { err } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Expose Auth.js endpoints; the explicit public demo has a matching client identity. */
export async function GET(request: NextRequest) {
  if (isDemoMode() && request.nextUrl.pathname.endsWith("/session")) {
    const demo = getDemoSession();
    return NextResponse.json({ expires: demo.expires, demo: true, user: { id: demo.userId, name: demo.name, email: demo.email, role: demo.role, workspaceId: demo.workspaceId, workspaceName: demo.workspaceName } }, { headers: { "Cache-Control": "no-store" } });
  }
  if (!hasAuthSecret()) return NextResponse.json(err("CONFIGURATION", "Задайте AUTH_SECRET"), { status: 503 });
  return handlers.GET(request);
}

/** Let Auth.js validate CSRF and signed cookies for client sign-in, update and sign-out. */
export async function POST(request: NextRequest) {
  if (!hasAuthSecret()) return NextResponse.json(err("CONFIGURATION", "Задайте AUTH_SECRET"), { status: 503 });
  return handlers.POST(request);
}
