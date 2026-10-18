"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import type { SessionContext } from "@/types/shared";

/** Hydrate useSession with the already validated workspace, avoiding a loading permission flash. */
export function AuthSessionProvider({ session, children }: { session: SessionContext; children: React.ReactNode }) {
  const initialSession: Session = { expires: session.expires, demo: session.demo, user: { id: session.userId, role: session.role, name: session.name, email: session.email, workspaceId: session.workspaceId, workspaceName: session.workspaceName } };
  return <SessionProvider session={initialSession} refetchInterval={session.demo ? 0 : 60} refetchOnWindowFocus={!session.demo}>{children}</SessionProvider>;
}
