"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { pmoApi } from "@/lib/api/pmo";
import PublicLoading from "@/components/ui/public-loading";
// ✅ Path diubah karena sekarang berada di folder yang sama
import PmoFollowUpModal from "./pmo-follow-up-modal";
import {
  User,
  Activity,
  Flame,
  ClipboardCheck,
  MessageSquarePlus,
} from "lucide-react";

interface PmoPatient {
  treatmentPlanId: string;
  patientName: string;
  phase: string;
  currentStreak: number;
  todayVerdict: string | null;
  isLockedToday: boolean;
  consecutiveSilenceDays: number;
}

export default function PmoPatientsList() {
  const [patients, setPatients] = useState<PmoPatient[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPatient, setSelectedPatient] = useState<PmoPatient | null>(
    null,
  );

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pmoApi.getPatients();
      setPatients(
        Array.isArray(res)
          ? res
          : (res as { items?: PmoPatient[] }).items || [],
      );
    } catch (err) {
      console.error("Gagal memuat pasien:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) fetchPatients();
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [fetchPatients]);

  if (loading)
    return (
      <PublicLoading fullScreen message="Memuat daftar pasien binaan..." />
    );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-heading font-bold text-tiby-ink">
          Pasien Binaan
        </h1>
        <p className="text-sm text-tiby-muted">
          Pantau dan dampingi pasien yang menjadi tanggung jawab Anda.
        </p>
      </div>

      {patients.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-200">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-tiby-muted">
            Belum ada pasien yang ditugaskan kepada Anda.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {patients.map((patient) => (
            <div
              key={patient.treatmentPlanId}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs hover:border-tiby-teal-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-bold text-lg text-tiby-ink">
                    {patient.patientName}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-tiby-teal-50 text-tiby-teal-700 text-[10px] font-bold border border-tiby-teal-100">
                    {patient.phase}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-tiby-muted">
                  <div className="flex items-center gap-1">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span>{patient.currentStreak} Hari Streak</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Activity className="w-4 h-4 text-tiby-teal-600" />
                    <span>
                      Status:{" "}
                      {patient.todayVerdict
                        ? patient.todayVerdict
                        : patient.isLockedToday
                          ? "Sudah Check-in"
                          : "Belum Check-in"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Kumpulan Tombol Aksi PMO */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={() => setSelectedPatient(patient)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-tiby-ink shadow-sm hover:bg-gray-50 transition"
                >
                  <MessageSquarePlus className="w-4 h-4 text-tiby-teal-600" />
                  Catat Tindak Lanjut
                </button>

                <Link
                  href={`/pmo/check-in?patientId=${patient.treatmentPlanId}&patientName=${encodeURIComponent(patient.patientName)}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-tiby-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-tiby-teal-700 transition"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  Wakili Check-in
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPatient && (
        <PmoFollowUpModal
          patientId={selectedPatient.treatmentPlanId}
          patientName={selectedPatient.patientName}
          onClose={() => setSelectedPatient(null)}
          onSuccess={() => {
            setSelectedPatient(null);
            fetchPatients();
          }}
        />
      )}
    </div>
  );
}
