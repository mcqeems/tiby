import CheckInView from "./components/check-in-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Check-in Harian",
  description: "Laporkan kondisi dan kepatuhan minum obat Anda hari ini.",
  robots: "noindex, nofollow", 
};

export default function PasienCheckInPage() {
  return (
    <div className="min-h-screen bg-tiby-white p-4 pt-8">
      <CheckInView role="PASIEN" />
    </div>
  );
}
