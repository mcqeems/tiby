import EducationView from "@/app/pasien/edukasi/components/education-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edukasi Harian",
  description:
    "Baca materi edukasi kesehatan dan tips pengobatan TBC dari Kemenkes dan WHO.",
};
export default function PmoEdukasiPage() {
  return <EducationView role="PMO" />;
}
