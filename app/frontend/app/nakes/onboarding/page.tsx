import { Metadata } from "next";
import OnboardingForm from "./components/onboarding-form";

/** Auth-gated tree (RoleGuard returns null without a session), so the
    segment cannot be validated for instant navigation. Documented opt-out:
    https://nextjs.org/docs/messages/instant-unrendered-segment */
export const instant = false;

export const metadata: Metadata = {
  title: "Onboarding Pasien Baru",
  description:
    "Daftarkan pasien baru, tetapkan PMO, dan rencanakan regimen terapi obat secara otomatis.",
  robots: "noindex, nofollow", // Halaman medis privat, jangan di-index Google
};


export default function NakesOnboardingPage() {
  return (
    <div>
      <div className="mb-6">
        
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
