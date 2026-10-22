import ConsentView from "@/components/consent/consent-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Persetujuan Privasi",
  description:
    "Persetujuan pemrosesan data dan pendampingan pengobatan di aplikasi Tiby.",
  robots: "noindex, nofollow", // Halaman privat, jangan di-index
};

export default function PasienConsentPage() {
  return (
    <div className="min-h-screen">
      <ConsentView role="PMO" />
    </div>
  );
}
