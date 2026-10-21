export type UserRole = "ADMIN" | "NAKES" | "PMO" | "PASIEN" | "FASKES";

export type TibyUser = {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: UserRole;
  facility_id?: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};
