/**
 * Roles have one home, one path and two label lengths: a short badge label
 * ("Admin") and the full title the profile panel shows ("Administrator
 * Pusat"). They used to be re-declared in the login, the guard, the dashboard
 * and two profile screens.
 */
export const ROLE_PATHS = {
  ADMIN: "/admin",
  NAKES: "/nakes",
  PMO: "/pmo",
  PASIEN: "/pasien",
  FASKES: "/faskes",
} as const;

export const ROLE_LABELS = {
  ADMIN: "Admin",
  NAKES: "Tenaga Kesehatan",
  PMO: "PMO",
  PASIEN: "Pasien",
  FASKES: "Faskes",
} as const;

export const ROLE_TITLES = {
  ADMIN: "Administrator Pusat",
  NAKES: "Tenaga Kesehatan",
  PMO: "Pengawas Menelan Obat",
  PASIEN: "Pasien Terdaftar",
  FASKES: "Faskes",
} as const;

export type Role = keyof typeof ROLE_PATHS;

const normalise = (role?: string | null): Role | null => {
  const key = (role ?? "").toUpperCase();
  return key in ROLE_PATHS ? (key as Role) : null;
};

/** Where a role belongs after sign-in. */
export function roleHome(role?: string | null, fallback = "/pasien"): string {
  const key = normalise(role);
  return key ? ROLE_PATHS[key] : fallback;
}

/** Short label for chips and tables. */
export function roleLabel(role?: string | null): string {
  const key = normalise(role);
  return key ? ROLE_LABELS[key] : (role ?? "-");
}

/** Full title for the profile panel. */
export function roleTitle(role?: string | null): string {
  const key = normalise(role);
  return key ? ROLE_TITLES[key] : (role ?? "-");
}
