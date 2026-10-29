import TicketList from "./components/ticket-list";
import { SkeletonRegion, SkeletonRows } from "@/components/ui/skeleton";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tiket Tindak Lanjut",
  description:
    "Kelola tiket eskalasi pasien berisiko dan catat tindak lanjut medis.",
  robots: "noindex, nofollow",
};

export default function NakesTiketPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-tiby-ink">
          Tiket Tindak Lanjut
        </h1>
        <p className="text-sm text-tiby-muted">
          Pantau dan selesaikan eskalasi pasien yang membutuhkan perhatian
          medis.
        </p>
      </div>
      <Suspense fallback={<SkeletonRegion label="Memuat..."><SkeletonRows rows={3} /></SkeletonRegion>}>,
        <TicketList />
      </Suspense>
    </div>
  );
}
