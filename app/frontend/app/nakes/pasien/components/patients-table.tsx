"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link"; // ✅ Pastikan import Link
import { faskesApi } from "@/lib/api/faskes";
import type {
  RiskSortedPatientItem,
  PatientState,
  TreatmentPhase,
} from "@/lib/types/faskes";
import PublicLoading from "@/components/ui/public-loading";
import {
  Search,
  CheckCircle2,
  Clock,
  Flame,
  Eye,
  Users,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  UserPlus,
} from "lucide-react";

export default function PatientsTable() {
  const [patients, setPatients] = useState<RiskSortedPatientItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedState, setSelectedState] = useState<PatientState | "ALL">(
    "ALL",
  );
  const [selectedPhase, setSelectedPhase] = useState<TreatmentPhase | "ALL">(
    "ALL",
  );
  const [page, setPage] = useState(1);
  const limit = 10;

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await faskesApi.getPatients({
        search: search.trim() || undefined,
        state: selectedState === "ALL" ? undefined : selectedState,
        phase: selectedPhase === "ALL" ? undefined : selectedPhase,
        page,
        limit,
      });

      setPatients(res.items || []);
      setTotal(res.total || 0);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal memuat daftar pasien.",
      );
    } finally {
      setLoading(false);
    }
  }, [search, selectedState, selectedPhase, page]);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) fetchPatients();
    }, 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [fetchPatients]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedState(e.target.value as PatientState | "ALL");
    setPage(1);
  };

  const handlePhaseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPhase(e.target.value as TreatmentPhase | "ALL");
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-heading font-semibold text-tiby-ink">
            Daftar Pasien
          </h1>
          <p className="text-sm text-tiby-muted">
            Pantau kepatuhan dan risiko pasien Anda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-tiby-muted mr-2">
            Total: <strong className="text-tiby-ink">{total}</strong> Pasien
          </span>

          <button
            type="button"
            onClick={fetchPatients}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-tiby-teal-700 hover:bg-tiby-teal-50 transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/nakes/onboarding"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-tiby-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-tiby-teal-700 transition shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Onboarding Pasien Baru</span>
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-xs text-red-700 flex justify-between items-center">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* FILTER TOOLBAR */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
        <div className="relative min-w-[240px] flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama pasien atau username..."
            value={search}
            onChange={handleSearchChange}
            className="w-full rounded-xl border border-gray-200 pl-9 pr-3.5 py-2 text-xs text-tiby-ink placeholder:text-tiby-muted focus:outline-none focus:ring-2 focus:ring-tiby-teal-600 shadow-2xs"
          />
        </div>

        <select
          value={selectedState}
          onChange={handleStateChange}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600 shadow-2xs cursor-pointer"
        >
          <option value="ALL">Semua Status</option>
          <option value="AKTIF">Aktif</option>
          <option value="PENDING">Pending</option>
          <option value="BERISIKO">Berisiko</option>
          <option value="PUTUS_FOLLOW_UP">Putus Follow-Up</option>
          <option value="DIPANTAU_TERBATAS">Dipantau Terbatas</option>
        </select>

        <select
          value={selectedPhase}
          onChange={handlePhaseChange}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600 shadow-2xs cursor-pointer"
        >
          <option value="ALL">Semua Fase</option>
          <option value="INTENSIF">Fase Intensif</option>
          <option value="LANJUTAN">Fase Lanjutan</option>
        </select>
      </div>

      {/* TABLE SECTION */}
      {loading ? (
        <PublicLoading message="Memuat daftar pasien..." />
      ) : patients.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center space-y-2">
          <Users className="w-8 h-8 text-gray-400 mx-auto" />
          <h3 className="font-heading text-sm font-semibold text-tiby-ink">
            Tidak ada pasien ditemukan
          </h3>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-600 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="px-5 py-3.5">Pasien</th>
                  <th className="px-4 py-3.5">Fase & Regimen</th>
                  <th className="px-4 py-3.5">Check-In Hari Ini</th>
                  <th className="px-4 py-3.5">Streak</th>
                  <th className="px-4 py-3.5">PMO</th>
                  <th className="px-4 py-3.5">Skor Risiko</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map((p) => {
                  const isHighRisk =
                    p.riskScore >= 100 || p.consecutiveSilenceDays >= 3;
                  const isMediumRisk = p.riskScore > 0 && !isHighRisk;

                  return (
                    <tr
                      key={p.id}
                      className={`transition hover:bg-gray-50/60 ${isHighRisk ? "bg-red-50/20" : ""}`}
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-tiby-ink">
                          {p.patientName}
                        </p>
                        <p className="text-[11px] text-tiby-muted font-mono">
                          @{p.username}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-block rounded-md bg-tiby-teal-50 px-2 py-0.5 text-[10px] font-bold text-tiby-teal-700 border border-tiby-teal-100">
                          {p.phase}
                        </span>
                        <span className="block text-[11px] text-tiby-muted mt-0.5">
                          {p.regimenCode} ({p.dailyPillQuota} butir)
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {p.todayCheckInLocked ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-green-50 border border-green-200 px-2.5 py-1 text-[11px] font-medium text-green-700">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Terkunci
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-medium text-amber-800">
                            <Clock className="w-3.5 h-3.5" /> Belum
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 font-semibold text-tiby-ink">
                          <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span>{p.currentStreak} Hari</span>
                        </div>
                        {p.consecutiveSilenceDays > 0 && (
                          <p className="text-[10px] text-red-600 font-medium mt-0.5">
                            Sunyi {p.consecutiveSilenceDays} hari
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {p.pmo ? (
                          <>
                            <p className="font-medium text-tiby-ink">
                              {p.pmo.fullName}
                            </p>
                            <p className="text-[11px] text-tiby-muted font-mono">
                              @{p.pmo.username} · {p.pmo.relationship}
                            </p>
                          </>
                        ) : (
                          <span className="text-[11px] text-tiby-muted">
                            Belum ada PMO
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            isHighRisk
                              ? "bg-red-100 text-red-700"
                              : isMediumRisk
                                ? "bg-amber-100 text-amber-800"
                                : "bg-tiby-teal-50 text-tiby-teal-700"
                          }`}
                        >
                          {isHighRisk && <ShieldAlert className="w-3 h-3" />}
                          {p.riskScore}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {/* ✅ UBAH BUTTON MENJADI LINK */}
                        <Link
                          href={`/nakes/pasien/${p.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-tiby-ink hover:bg-gray-50 transition shadow-2xs cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-tiby-teal-700" />
                          <span>Detail</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION FOOTER */}
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-5 py-3">
            <span className="text-xs text-tiby-muted">
              Menampilkan <strong>{(page - 1) * limit + 1}</strong> -{" "}
              <strong>{Math.min(page * limit, total)}</strong> dari{" "}
              <strong>{total}</strong> data
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-tiby-ink disabled:opacity-50 hover:bg-gray-50 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-tiby-ink px-2">
                Hal {page} / {totalPages || 1}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0 || loading}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-tiby-ink disabled:opacity-50 hover:bg-gray-50 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
