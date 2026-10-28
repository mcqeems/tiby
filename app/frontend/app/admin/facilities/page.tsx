import FacilityManager from "./components/facility-manager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Master Fasilitas Kesehatan",
  description: "Kelola data Puskesmas dan Klinik di seluruh Indonesia.",
  robots: "noindex, nofollow",
};

export default function AdminFacilitiesPage() {
  return (
    <div className="">
      <FacilityManager />
    </div>
  );
}
