import type { DefaultSession } from "next-auth";
import type { ErrorCode, Role } from "@/types/shared";

declare module "next-auth" {
  interface User { role?: Role; workspaceId?: string; workspaceName?: string; sessionId?: string; }
  interface Session {
    user: { id: string; role: Role; workspaceId: string; workspaceName: string } & DefaultSession["user"];
    authError?: ErrorCode;
    demo?: boolean;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    workspaceId?: string;
    workspaceName?: string;
    sessionId?: string;
    sessionExpires?: string;
    authError?: ErrorCode;
  }
}
