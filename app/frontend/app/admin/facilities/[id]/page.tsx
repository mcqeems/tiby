import FacilityDetail from "./components/facility-detail";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Detail Faskes",
  description: "Detail fasilitas kesehatan dan akun yang ditempatkan di sini.",
  robots: "noindex, nofollow",
};

export default function AdminFacilityDetailPage() {
  return <FacilityDetail />;
}
