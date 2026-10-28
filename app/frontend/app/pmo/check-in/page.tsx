import CheckInView from "@/app/pasien/check-in/components/check-in-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Check-in Mewakili Pasien",
  description:
    "Laporkan kondisi pasien yang Anda dampingi melalui fitur check-in.",
  robots: "noindex, nofollow",
};

export default function PmoCheckInPage() {
  return (
    <div className="h-full bg-tiby-white">
      <CheckInView role="PMO" />
    </div>
  );
}
