import type { Request } from "express";
import type { UserRole } from "@tiby/ts-shared";

export interface AuthSessionUser {
  id: string;
  name?: string;
  email?: string;
  role: UserRole;
  username?: string | null;
  facilityId?: string | null;
  facility_id?: string | null;
  mustConfirmConsent?: boolean;
  must_confirm_consent?: boolean;
}

export interface AuthenticatedRequest extends Request {
  session?: {
    user: AuthSessionUser;
    session?: {
      id: string;
      userId: string;
      token: string;
      expiresAt: Date;
    };
  };
  user?: AuthSessionUser;
}
