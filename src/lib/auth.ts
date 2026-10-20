import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { err, ok } from "@/lib/errors";
import { getCredentialUser, getDemoSession, getSessionIdentity, hasAuthSecret, isDemoMode, SESSION_MAX_AGE } from "@/lib/auth-service";
import { canDeleteDocument, canWrite, isRole } from "@/lib/permissions";
import type { Domain, Result, SessionContext } from "@/types/shared";

export { PERMISSIONS, hasPermission } from "@/lib/permissions";
export { isDemoMode } from "@/lib/auth-service";

/** Auth.js v5 endpoints, JWT authentication and credentials sign-in/out adapters. */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE },
  pages: { signIn: "/login", error: "/login" },
  providers: [Credentials({
    credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" }, invitationToken: { type: "hidden" } },
    async authorize(credentials) {
      const result = await getCredentialUser(credentials);
      return result.ok ? result.data : null;
    },
  })],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        if (user.id) token.id = user.id;
        if (user.role) token.role = user.role;
        if (user.workspaceId) token.workspaceId = user.workspaceId;
        if (user.workspaceName) token.workspaceName = user.workspaceName;
        if (user.sessionId) token.sessionId = user.sessionId;
      }
      const identity = await getSessionIdentity({ ...(token.id ? { id: token.id } : {}), ...(token.workspaceId ? { workspaceId: token.workspaceId } : {}), ...(token.sessionId ? { sessionId: token.sessionId } : {}) });
      if (!identity.ok) {
        if (identity.error.code === "UNAUTHORIZED") return null;
        token.authError = identity.error.code;
        token.role = "READONLY";
        return token;
      }
      delete token.authError;
      token.role = identity.data.role;
      token.name = identity.data.name;
      token.email = identity.data.email;
      token.workspaceName = identity.data.workspaceName;
      token.sessionExpires = identity.data.expires;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id ?? "";
      session.user.role = isRole(token.role) ? token.role : "READONLY";
      session.user.workspaceId = token.workspaceId ?? "";
      session.user.workspaceName = token.workspaceName ?? "";
      if (token.authError) session.authError = token.authError;
      return { ...session, expires: token.sessionExpires ?? session.expires };
    },
  },
  events: {
    async signOut(message) {
      if ("token" in message && message.token?.sessionId) await db.session.deleteMany({ where: { tokenHash: message.token.sessionId } });
    },
  },
});

/** Resolve a live workspace identity from Auth.js; demo access remains an explicit installation mode. */
export async function getSession(): Promise<Result<SessionContext>> {
  if (isDemoMode()) return ok(getDemoSession());
  if (!hasAuthSecret()) return err("CONFIGURATION", "Для входа задайте AUTH_SECRET в окружении сервера");
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.workspaceId) return err("UNAUTHORIZED", "Войдите в рабочее пространство");
    if (session.authError) return err(session.authError, session.authError === "FORBIDDEN" ? "Нет доступа к рабочему пространству" : "Сервис авторизации недоступен. Проверьте PostgreSQL");
    return ok({ userId: session.user.id, name: session.user.name ?? "", email: session.user.email ?? "", role: session.user.role, workspaceId: session.user.workspaceId, workspaceName: session.user.workspaceName, demo: false, expires: session.expires });
  } catch { return err("STORAGE", "Сервис авторизации недоступен. Проверьте подключение к PostgreSQL"); }
}

/** Enforce writes and deletion permissions on every server operation, including the HR exception. */
export function authorize(session: SessionContext, domain: Domain, operation: "create" | "update" | "delete"): Result<true> {
  if (!canWrite(session.role) || (operation === "delete" && !canDeleteDocument(session.role, domain))) return err("FORBIDDEN", "Недостаточно прав для этого действия");
  return ok(true);
}
