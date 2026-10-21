// lib/api/users.ts
import { apiFetch } from "./client";

// Tipe untuk response GET /api/users
export interface UserItem {
  id: string;
  username: string;
  email?: string;
  name: string;
  role: "ADMIN" | "NAKES" | "PMO" | "PASIEN" | "FASKES";
  facilityId?: string | null;
}

// Tipe untuk payload POST /api/users
export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role: string;
  facilityId: string;
  whatsappNumber?: string;
}

export const usersApi = {
  async getMe() {
    return apiFetch<UserItem>("/api/users/me", { method: "GET" });
  },

  // ✅ Ganti any[] dengan UserItem[]
  async getAll(): Promise<UserItem[]> {
    return apiFetch<UserItem[]>("/api/users", { method: "GET" });
  },

  // ✅ Ganti any dengan CreateUserPayload
  async createUser(dto: CreateUserPayload) {
    return apiFetch<UserItem>("/api/users", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return apiFetch<{ success: boolean; message: string }>(
      "/api/users/change-password",
      {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      },
    );
  },

  async resetPassword(userId: string, newPassword: string) {
    return apiFetch<{ success: boolean; message: string }>(
      `/api/users/${userId}/reset-password`,
      {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      },
    );
  },
};
