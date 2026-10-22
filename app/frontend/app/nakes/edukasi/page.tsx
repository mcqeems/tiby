import EducationManager from "./components/education-manager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kelola Edukasi",
  description: "Buat dan kelola materi edukasi untuk pasien TBC.",
  robots: "noindex, nofollow",
};

export default function NakesEdukasiPage() {
  return (
    <div className="max-w-5xl mx-auto pb-20">
      <EducationManager />
    </div>
  );
}
