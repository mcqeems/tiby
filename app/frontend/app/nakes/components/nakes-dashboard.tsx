"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import PatientHistoryModal from "./patient-history-modal";
import type {
  RiskSortedPatientItem,
  PatientStatusHistoryItem,
  PatientState,
  TreatmentPhase,
} from "@tiby/ts-shared";

export default function NakesDashboard() {
  const [patients, setPatients] = useState<RiskSortedPatientItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedState, setSelectedState] = useState<PatientState | "ALL">(
    "ALL",
  );
  const [selectedPhase, setSelectedPhase] = useState<TreatmentPhase | "ALL">(
    "ALL",
  );

  // Patient History Modal
  const [historyModalPatient, setHistoryModalPatient] =
    useState<RiskSortedPatientItem | null>(null);
  const [historyItems, setHistoryItems] = useState<PatientStatusHistoryItem[]>(
    [],
  );
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    let ignore = false;
    api.faskes
      .getPatients({
        search: search.trim() || undefined,
        state: selectedState === "ALL" ? undefined : selectedState,
        phase: selectedPhase === "ALL" ? undefined : selectedPhase,
        page: 1,
        limit: 50,
      })
      .then((res) => {
        if (!ignore) {
          setPatients(res.items || []);
          setTotal(res.total || 0);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          setErrorMsg(
            err instanceof Error
              ? err.message
              : "Gagal memuat daftar pasien nakes",
          );
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [search, selectedState, selectedPhase]);

  const handleRefresh = () => {
    setLoading(true);
    setErrorMsg(null);
    api.faskes
      .getPatients({
        search: search.trim() || undefined,
        state: selectedState === "ALL" ? undefined : selectedState,
        phase: selectedPhase === "ALL" ? undefined : selectedPhase,
        page: 1,
        limit: 50,
      })
      .then((res) => {
        setPatients(res.items || []);
        setTotal(res.total || 0);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Gagal memuat daftar pasien nakes",
        );
        setLoading(false);
      });
  };

  const openHistory = async (patient: RiskSortedPatientItem) => {
    setHistoryModalPatient(patient);
    setLoadingHistory(true);
    try {
      const res = await api.faskes.getPatientHistory(patient.id, 1, 30);
      setHistoryItems(res.items || []);
    } catch {
      setHistoryItems([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-600 text-tiby-ink">
            Pemantauan Rutinitas Pasien
          </h1>
          <p className="mt-1 text-xs text-tiby-muted">
            Daftar pasien diurutkan otomatis berdasarkan prioritas risiko
            kepatuhan (Risk-Sorted Queue).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 rounded-full border border-tiby-teal-100 bg-white px-4 py-2 text-xs font-semibold text-tiby-teal-700 hover:bg-tiby-teal-50 transition shadow-xs cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-3.5 h-3.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 rounded-2xl border border-red-100 bg-tiby-danger p-3 text-xs text-tiby-danger-text animate-fadeIn flex justify-between items-center">
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <input
            type="text"
            placeholder="Cari nama pasien atau username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-tiby-teal-100 bg-white px-4 py-2 text-xs text-tiby-ink placeholder:text-tiby-muted transition focus:border-tiby-teal-600 focus:outline-none focus:ring-2 focus:ring-tiby-teal-600/20 shadow-xs"
          />
        </div>

        <select
          value={selectedState}
          onChange={(e) =>
            setSelectedState(e.target.value as PatientState | "ALL")
          }
          className="rounded-xl border border-tiby-teal-100 bg-white px-3 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600 shadow-xs cursor-pointer"
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
          className="rounded-xl border border-tiby-teal-100 bg-white px-3 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600 shadow-xs cursor-pointer"
        >
          <option value="ALL">Semua Fase</option>
          <option value="INTENSIF">Fase Intensif</option>
          <option value="LANJUTAN">Fase Lanjutan</option>
        </select>

        <span className="text-xs text-tiby-muted ml-auto">
          Total: <strong>{total}</strong> Pasien
        </span>
      </div>

      {/* Patients Table */}
      <div className="overflow-hidden rounded-2xl border border-tiby-teal-100 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-tiby-teal-100 bg-tiby-teal-50/50 text-tiby-muted uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="px-4 py-3">Nama Pasien</th>
                <th className="px-4 py-3">Fase &amp; Regimen</th>
                <th className="px-4 py-3">Check-In Hari Ini</th>
                <th className="px-4 py-3">Streak</th>
                <th className="px-4 py-3">Skor Risiko</th>
                <th className="px-4 py-3">Saluran</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tiby-teal-50">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-tiby-muted"
                  >
                    Memuat daftar pasien...
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-tiby-muted"
                  >
                    Tidak ada pasien yang sesuai filter.
                  </td>
                </tr>
              ) : (
                patients.map((p) => {
                  const isHighRisk =
                    p.riskScore >= 100 || p.consecutiveSilenceDays >= 3;
                  const isMediumRisk = p.riskScore > 0;

                  return (
                    <tr
                      key={p.id}
                      className={`transition hover:bg-tiby-teal-50/30 ${
                        isHighRisk ? "bg-red-50/20" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-tiby-ink">
                          {p.patientName}
                        </p>
                        <p className="text-[11px] text-tiby-muted font-mono">
                          @{p.username}
                        </p>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-block rounded-full bg-tiby-teal-50 px-2.5 py-0.5 text-[10px] font-bold text-tiby-teal-700">
                          {p.phase}
                        </span>
                        <span className="block text-[11px] text-tiby-muted mt-0.5">
                          {p.regimenCode} ({p.dailyPillQuota} butir)
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        {p.todayCheckInLocked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-tiby-teal-50 px-2.5 py-1 text-xs font-semibold text-tiby-teal-700">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2.5}
                              stroke="currentColor"
                              className="w-3.5 h-3.5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4.5 12.75l6 6 9-13.5"
                              />
                            </svg>
                            <span>Terkunci</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-tiby-cream px-2.5 py-1 text-xs font-semibold text-amber-900">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              className="w-3.5 h-3.5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span>Belum</span>
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 font-semibold text-tiby-ink">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="w-4 h-4 text-amber-500"
                          >
                            <path
                              fillRule="evenodd"
                              d="M12.963 2.286c.275-.035.554.085.71.31l2.5 3.65c.37.54.194 1.28-.386 1.55l-1.487.705c.873 1.29 1.41 2.844 1.41 4.515 0 4.418-3.582 8-8 8s-8-3.582-8-8c0-2.317 1.01-4.4 2.617-5.845a.75.75 0 011.025.108l1.25 1.45a.75.75 0 01.107.886A5.478 5.478 0 004.5 13c0 3.038 2.462 5.5 5.5 5.5s5.5-2.462 5.5-5.5c0-1.127-.34-2.176-.923-3.048a.75.75 0 01.147-.936l1.35-1.35a.75.75 0 01.74-.18z"
                              clipRule="evenodd"
                            />
                          </svg>
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
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
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

                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => openHistory(p)}
                          className="rounded-full border border-tiby-teal-100 bg-white px-3 py-1 text-xs font-semibold text-tiby-teal-700 hover:bg-tiby-teal-50 transition shadow-2xs cursor-pointer"
                        >
                          Riwayat
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {historyModalPatient && (
        <PatientHistoryModal
          patient={historyModalPatient}
          historyItems={historyItems}
          loading={loadingHistory}
          onClose={() => setHistoryModalPatient(null)}
        />
      )}
    </div>
  );
}
