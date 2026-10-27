
import NakesOverview from "./components/nakes-overview";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard Nakes",
  description: "Pusat kendali Tenaga Kesehatan untuk memantau pasien TBC.",
};

export default function NakesPage() {
  return (
    <div>
    

      <NakesOverview />
    </div>
  );
}
