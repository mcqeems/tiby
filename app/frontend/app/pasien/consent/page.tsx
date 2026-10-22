import ConsentView from "@/components/consent/consent-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Persetujuan Privasi",
  description:
    "Persetujuan pemrosesan data dan pendampingan pengobatan di aplikasi Tiby.",
  robots: "noindex, nofollow", 
};

export default function PasienConsentPage() {
  return (
    <div className="min-h-screen">
      <ConsentView role="PASIEN" />
    </div>
  );
}
