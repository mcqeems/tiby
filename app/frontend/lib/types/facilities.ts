// lib/types/facilities.ts

export interface FacilityItem {
  id: string;
  code: string;
  name: string;
  type: "PUSKESMAS" | "RUMAH_SAKIT" | "KLINIK";
  province: string;
  city: string;
  address?: string;
  phone?: string;
  createdAt?: string;
}

export interface CreateFacilityDto {
  code: string;
  name: string;
  type: "PUSKESMAS" | "RUMAH_SAKIT" | "KLINIK";
  province: string;
  city: string;
  address?: string;
  phone?: string;
}
