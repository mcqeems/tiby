import PatientsTable from "./components/patients-table";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daftar Pasien Nakes",
  description:
    "Pantau status risiko dan kepatuhan seluruh pasien TBC di fasilitas kesehatan Anda.",
  robots: "noindex, nofollow",
};

export default function NakesPasienPage() {
  return (
    <div className="space-y-6">
      

      <PatientsTable />
    </div>
  );
}
