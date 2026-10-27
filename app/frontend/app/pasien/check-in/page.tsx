import CheckInView from "./components/check-in-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Check-in Harian",
  description: "Laporkan kondisi dan kepatuhan minum obat Anda hari ini.",
  robots: "noindex, nofollow",
};

export default function PasienCheckInPage() {
  return (
    <div className="flex h-full w-full flex-col bg-tiby-white pt-2">
      <CheckInView role="PASIEN" />
    </div>
  );
}
