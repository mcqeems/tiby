import EducationView from "./components/education-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edukasi Harian",
  description:
    "Baca materi edukasi kesehatan dan tips pengobatan TBC dari Kemenkes dan WHO.",
};

export default function PasienEdukasiPage() {
  return <EducationView />;
}
