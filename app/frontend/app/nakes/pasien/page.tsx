"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import PatientsTable from "./components/patients-table";

export default function NakesPasienPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-semibold text-tiby-ink">
            Daftar Pasien Binaan
          </h1>
          <p className="mt-0.5 text-xs text-tiby-muted">
            Kelola data klinis, pantau kepatuhan harian, dan atur ulang akses
            login pasien maupun PMO.
          </p>
        </div>

        <Link
          href="/nakes/onboarding"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-tiby-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-tiby-teal-700 transition shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Onboarding Pasien Baru</span>
        </Link>
      </div>

      <PatientsTable />
    </div>
  );
}
