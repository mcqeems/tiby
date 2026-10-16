import { createAccessControl } from "better-auth/plugins/access";

export const statement = {
  patient: ["create", "read", "update", "delete"],
  checkIn: ["create", "read"],
  ticket: ["read", "update", "close"],
  alert: ["read", "update"],
} as const;

export const ac = createAccessControl(statement);

export const NAKES = ac.newRole({
  patient: ["create", "read", "update", "delete"],
  checkIn: ["read"],
  ticket: ["read", "update", "close"],
  alert: ["read", "update"],
});

export const PMO = ac.newRole({
  patient: ["read"],
  checkIn: ["create", "read"],
  ticket: ["read"],
  alert: [],
});

export const PASIEN = ac.newRole({
  patient: ["read"],
  checkIn: ["create", "read"],
  ticket: [],
  alert: [],
});
