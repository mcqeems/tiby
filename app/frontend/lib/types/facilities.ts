export interface FacilityItem {
  id: string;
  code: string;
  name: string;
  district: string;
  emergencyPhone: string;
  createdAt: string;
}

export interface CreateFacilityDto {
  code: string;
  name: string;
  district: string;
  emergencyPhone: string;
}
