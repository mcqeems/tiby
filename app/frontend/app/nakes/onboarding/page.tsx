import { Metadata } from "next";
import OnboardingForm from "./components/onboarding-form";

export const metadata: Metadata = {
  title: "Onboarding Pasien Baru",
  description:
    "Daftarkan pasien TBC baru, tetapkan PMO, dan rencanakan regimen terapi obat secara otomatis.",
  robots: "noindex, nofollow", // Halaman medis privat, jangan di-index Google
};


export default function NakesOnboardingPage() {
  return (
    <div>
      <div className="mb-6">
        <span className="text-[10px] font-bold text-tiby-teal-600 uppercase tracking-wider block mb-0.5">
          Pendaftaran Klinis
        </span>
        <h1 className="font-heading text-2xl font-600 text-tiby-ink">
          Onboarding Pasien Baru &amp; Rencana Terapi
        </h1>
        <p className="mt-1 text-xs text-tiby-muted">
          Daftarkan pasien, PMO, dan tentukan regimen terapi obat secara
          terpusat.
        </p>
      </div>
      <OnboardingForm />
    </div>
  );
}
