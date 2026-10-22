import type { Metadata } from "next";
import PmoPatientsList from "./components/pmo-patients-list";

export const metadata: Metadata = {
  title: "Pasien Binaan PMO",
  description:
    "Pantau dan dampingi pasien TBC yang menjadi tanggung jawab Anda sebagai PMO.",
  robots: "noindex, nofollow", 
};

export default function PmoPatientsPage() {
  return <PmoPatientsList />;
}
