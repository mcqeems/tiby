// lib/api/users.ts
import { apiFetch } from "./client";

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export interface UserItem {
  id: string;
  username: string;
  email?: string;
  name: string;
  role: "ADMIN" | "NAKES" | "PMO" | "PASIEN" | "FASKES";
  facilityId?: string | null;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role: string;
  facilityId: string;
  whatsappNumber?: string;
}

export interface UpdateUserPayload {
  fullName?: string;
  email?: string;
  whatsappNumber?: string | null;
  role?: string;
  facilityId?: string | null;
}

export const usersApi = {
  async getMe() {
    return apiFetch<UserItem>("/api/users/me", { method: "GET" });
  },

  async getAll(): Promise<UserItem[]> {
    return apiFetch<UserItem[]>("/api/users", { method: "GET" });
  },

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
    return apiFetch<ResetPasswordResponse>(
      `/api/users/${userId}/reset-password`,
      {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      },
    );
  },

  async update(userId: string, dto: UpdateUserPayload) {
    return apiFetch<UserItem>(`/api/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  },
};
