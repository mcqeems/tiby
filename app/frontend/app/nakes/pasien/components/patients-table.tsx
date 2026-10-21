"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import PublicLoading from "@/components/ui/public-loading";
import PatientDetailModal, {
  type PatientRecord,
} from "../../components/patient-detail-modal";
import type {
  RiskSortedPatientItem,
  PatientState,
  TreatmentPhase,
} from "../types/nakes-patient";
import {
  Search,
  CheckCircle2,
  Clock,
  Flame,
  Eye,
  Users,
  RefreshCw,
} from "lucide-react";

export default function PatientsTable() {
  const [patients, setPatients] = useState<RiskSortedPatientItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedState, setSelectedState] = useState<PatientState | "ALL">(
    "ALL",
  );
  const [selectedPhase, setSelectedPhase] = useState<TreatmentPhase | "ALL">(
    "ALL",
  );

  // Modal Detail Pasien
  const [selectedModalPatient, setSelectedModalPatient] =
    useState<PatientRecord | null>(null);

  const fetchPatientsData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const faskesApi = api.faskes as Record<string, unknown>;
      if (typeof faskesApi?.getPatients === "function") {
        type GetPatientsFunc = (params: unknown) => Promise<{
          items?: RiskSortedPatientItem[];
          total?: number;
        }>;
        const getPatientsFn = faskesApi.getPatients as GetPatientsFunc;

        const res =
          (await getPatientsFn({
            search: search.trim() || undefined,
            state: selectedState === "ALL" ? undefined : selectedState,
            phase: selectedPhase === "ALL" ? undefined : selectedPhase,
            page: 1,
            limit: 50,
          })) || {};

        setPatients(res.items || []);
        setTotal(res.total || 0);
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal memuat daftar pasien nakes",
      );
    } finally {
      setLoading(false);
    }
  }, [search, selectedState, selectedPhase]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const faskesApi = api.faskes as Record<string, unknown>;
        if (typeof faskesApi?.getPatients === "function") {
          type GetPatientsFunc = (params: unknown) => Promise<{
            items?: RiskSortedPatientItem[];
            total?: number;
          }>;
          const getPatientsFn = faskesApi.getPatients as GetPatientsFunc;

          const res =
            (await getPatientsFn({
              search: search.trim() || undefined,
              state: selectedState === "ALL" ? undefined : selectedState,
              phase: selectedPhase === "ALL" ? undefined : selectedPhase,
              page: 1,
              limit: 50,
            })) || {};

          if (isMounted) {
            setPatients(res.items || []);
            setTotal(res.total || 0);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMsg(
            err instanceof Error
              ? err.message
              : "Gagal memuat daftar pasien nakes",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [search, selectedState, selectedPhase]);

  const openPatientDetail = async (item: RiskSortedPatientItem) => {
    let fetchedHistory: PatientRecord["history"] = [];

    // Menggunakan const karena nilai tidak ditugaskan ulang secara langsung
    const pmoName = "Pengawas Terdaftar";
    const pmoUsername = `pmo_${item.username}`;
    const pmoWhatsapp = "-";
    const patientWhatsapp = "-";

    try {
      const faskesApi = api.faskes as Record<string, unknown>;

      if (typeof faskesApi?.getPatientHistory === "function") {
        type GetHistoryFunc = (
          id: string,
          page: number,
          limit: number,
        ) => Promise<{
          items?: Array<{
            id: string;
            createdAt?: string;
            eventType?: string;
            reasonOrSummary?: string;
            status?: "SUDAH_MINUM" | "BELUM_MINUM" | "TIDAK_PASTI";
            pillsTaken?: number;
            complaints?: string[];
          }>;
        }>;
        const getHistoryFn = faskesApi.getPatientHistory as GetHistoryFunc;
        const res = (await getHistoryFn(item.id, 1, 30)) || {};

        fetchedHistory = (res.items || []).map((h) => ({
          id: h.id,
          date: h.createdAt
            ? new Date(h.createdAt).toLocaleString("id-ID")
            : "Hari ini",
          status: h.status || "SUDAH_MINUM",
          pillsTaken: h.pillsTaken || item.dailyPillQuota,
          complaints: h.complaints || [
            h.reasonOrSummary || h.eventType || "Aktivitas sistem",
          ],
        }));
      }
    } catch {
      fetchedHistory = [];
    }

    const mappedRecord: PatientRecord = {
      id: item.id,
      userId: item.patientUserId,
      fullName: item.patientName,
      username: item.username,
      whatsappNumber: patientWhatsapp,
      regimenCode: item.regimenCode,
      dailyPillQuota: item.dailyPillQuota,
      reminderTimeLocal: "08:00",
      startDate: item.startDate || "-",
      streakDays: item.currentStreak,
      todayStatus: item.todayCheckInLocked ? "SUDAH_MINUM" : "BELUM_MINUM",
      pmo: {
        fullName: pmoName,
        username: pmoUsername,
        whatsappNumber: pmoWhatsapp,
        relationship: "Keluarga / Pengawas",
      },
      history: fetchedHistory,
    };

    setSelectedModalPatient(mappedRecord);
  };

  return (
    <div className="space-y-4">
      {/* Tombol Refresh & Total Pasien */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={fetchPatientsData}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-tiby-teal-700 hover:bg-tiby-teal-50 transition shadow-2xs cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
        <span className="text-xs text-tiby-muted">
          Total: <strong>{total}</strong> Pasien[cite: 9]
        </span>
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

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
        <div className="relative min-w-[240px] flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama pasien atau username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 pl-9 pr-3.5 py-2 text-xs text-tiby-ink placeholder:text-tiby-muted focus:outline-none focus:ring-2 focus:ring-tiby-teal-600 shadow-2xs"
          />
        </div>

        <select
          value={selectedState}
          onChange={(e) =>
            setSelectedState(e.target.value as PatientState | "ALL")
          }
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600 shadow-2xs cursor-pointer"
        >
          <option value="ALL">Semua Status</option>
          <option value="AKTIF">Aktif</option>
          <option value="PENDING">Pending</option>
          <option value="BERISIKO">Berisiko</option>
          <option value="PUTUS_FOLLOW_UP">Putus Follow-Up</option>
        </select>

        <select
          value={selectedPhase}
          onChange={(e) =>
            setSelectedPhase(e.target.value as TreatmentPhase | "ALL")
          }
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600 shadow-2xs cursor-pointer"
        >
          <option value="ALL">Semua Fase</option>
          <option value="INTENSIF">Fase Intensif</option>
          <option value="LANJUTAN">Fase Lanjutan</option>
        </select>
      </div>

      {/* Patients Table */}
      {loading ? (
        <PublicLoading message="Memuat daftar pasien..." />
      ) : patients.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center space-y-2">
          <Users className="w-7 h-7 text-gray-400 mx-auto" />
          <h3 className="font-heading text-sm font-semibold text-tiby-ink">
            Tidak ada pasien yang sesuai filter.
          </h3>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-gray-600 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="px-5 py-3.5">Nama Pasien</th>
                  <th className="px-4 py-3.5">Fase &amp; Regimen</th>
                  <th className="px-4 py-3.5">Check-In Hari Ini</th>
                  <th className="px-4 py-3.5">Streak</th>
                  <th className="px-4 py-3.5">Skor Risiko</th>
                  <th className="px-4 py-3.5">Saluran</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map((p) => {
                  const isHighRisk =
                    p.riskScore >= 100 || p.consecutiveSilenceDays >= 3;
                  const isMediumRisk = p.riskScore > 0;

                  return (
                    <tr
                      key={p.id}
                      className={`transition hover:bg-gray-50/60 ${
                        isHighRisk ? "bg-red-50/20" : ""
                      }`}
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
                          <span className="inline-flex items-center gap-1 rounded-md bg-green-50 border border-green-200 px-2.5 py-1 text-xs font-medium text-green-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Terkunci</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-800">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Belum</span>
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 font-semibold text-tiby-ink">
                          <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span>{p.currentStreak} Hari</span>
                        </div>
                        {p.consecutiveSilenceDays > 0 && (
                          <p className="text-[10px] text-amber-800 mt-0.5">
                            Sunyi {p.consecutiveSilenceDays} hari
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                            isHighRisk
                              ? "bg-red-100 text-red-700"
                              : isMediumRisk
                                ? "bg-amber-100 text-amber-800"
                                : "bg-tiby-teal-50 text-tiby-teal-700"
                          }`}
                        >
                          Skor {p.riskScore}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            title={
                              p.whatsappVerified
                                ? "WhatsApp Terhubung"
                                : "WhatsApp Belum"
                            }
                            className={`h-2.5 w-2.5 rounded-full ${
                              p.whatsappVerified
                                ? "bg-green-500"
                                : "bg-gray-300"
                            }`}
                          />
                          <span className="text-[11px] text-tiby-muted">
                            {p.whatsappVerified ? "WA Aktif" : "WA Nonaktif"}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => openPatientDetail(p)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-tiby-ink hover:bg-gray-50 transition shadow-2xs cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-tiby-teal-700" />
                          <span>Detail &amp; Akses</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Detail Pasien & Reset Password */}
      {selectedModalPatient && (
        <PatientDetailModal
          patient={selectedModalPatient}
          onClose={() => setSelectedModalPatient(null)}
        />
      )}
    </div>
  );
}
