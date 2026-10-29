import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  basePath: "/api/auth",
  plugins: [
    // displayUsername: false karena server dikonfigurasi dengan displayUsername: false
    usernameClient({ displayUsername: false }),
    adminClient(),
  ],
});

export const { signIn, signOut, useSession } = authClient;

/**
 * Tipe user yang diperkaya dengan field tambahan dari backend Tiby.
 * Gunakan ini saat mengakses data user dari useSession().
 */
export type TibyUser = {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: "ADMIN" | "NAKES" | "PMO" | "PASIEN" | "FASKES";
  facility_id?: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export { ROLE_PATHS } from "./roles";
