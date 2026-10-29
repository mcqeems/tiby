import type { Metadata } from "next";
import DemoView from "./components/demo-view";

export const metadata: Metadata = {
  title: "Mode Demo",
  description:
    "Coba Tiby sebagai pasien, PMO, atau Nakes. Sesi demo 2 jam, data dihapus otomatis.",
  robots: "noindex, nofollow",
};

export default function DemoPage() {
  return <DemoView />;
}
