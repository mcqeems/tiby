import EducationManager from "@/components/education/education-manager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kelola Edukasi",
  description: "Kelola materi edukasi global yang berlaku untuk semua faskes.",
  robots: "noindex, nofollow",
};

export default function AdminEducationPage() {
  return <EducationManager scope="admin" />;
}
