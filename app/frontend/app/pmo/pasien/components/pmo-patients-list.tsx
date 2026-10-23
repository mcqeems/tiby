"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { pmoApi } from "@/lib/api/pmo";
import PublicLoading from "@/components/ui/public-loading";
import PmoFollowUpModal from "./pmo-follow-up-modal";
import {
  User,
  Activity,
  Flame,
  ClipboardCheck,
  MessageSquarePlus,
  AlertCircle,
  CalendarCheck,
  ShieldCheck,
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

  if (loading) {
    return (
      <PublicLoading fullScreen message="Memuat daftar pasien binaan..." />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-tiby-ink">
            Pasien Binaan
          </h1>
          <p className="text-sm text-tiby-muted mt-1">
            Pantau dan dampingi pasien yang menjadi tanggung jawab Anda.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-2xs">
          <User className="w-4 h-4 text-tiby-teal-600" />
          <span className="text-sm font-semibold text-tiby-ink">
            {patients.length} Total Pasien
          </span>
        </div>
      </div>

      {/* KONTEN UTAMA */}
      {patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-dashed border-gray-300">
          <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-heading font-bold text-tiby-ink mb-1">
            Belum Ada Pasien
          </h3>
          <p className="text-sm text-tiby-muted text-center max-w-sm">
            Saat ini tidak ada pasien yang ditugaskan kepada Anda. Hubungi
            Faskes jika Anda merasa ini sebuah kesalahan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {patients.map((patient) => {
            // Logika pewarnaan status
            const isSilence = patient.consecutiveSilenceDays > 0;
            const isPending = !patient.isLockedToday && !patient.todayVerdict;

            let statusColor =
              "bg-emerald-50 text-emerald-700 border-emerald-200";
            let statusText = "Terkendali";
            let StatusIcon = ShieldCheck;

            if (isSilence) {
              statusColor = "bg-red-50 text-red-700 border-red-200";
              statusText = `Sunyi ${patient.consecutiveSilenceDays} Hari`;
              StatusIcon = AlertCircle;
            } else if (isPending) {
              statusColor = "bg-amber-50 text-amber-700 border-amber-200";
              statusText = "Belum Check-in";
              StatusIcon = Activity;
            }

            return (
              <div
                key={patient.treatmentPlanId}
                className="group bg-white rounded-3xl border border-gray-200 p-5 shadow-2xs hover:shadow-md hover:border-tiby-teal-300 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Avatar & Info */}
                  <div className="flex items-start justify-between gap-3 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-tiby-teal-50 border border-tiby-teal-100 flex items-center justify-center text-tiby-teal-700 font-heading font-bold text-lg shadow-sm">
                        {patient.patientName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-heading font-bold text-base text-tiby-ink line-clamp-1 group-hover:text-tiby-teal-700 transition">
                          {patient.patientName}
                        </h3>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                          {patient.phase}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status & Streak Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-gray-50/80 rounded-2xl p-3 border border-gray-100">
                      <p className="text-[10px] font-bold text-tiby-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-500" /> Streak
                      </p>
                      <p className="font-heading font-bold text-tiby-ink">
                        {patient.currentStreak}{" "}
                        <span className="text-xs font-normal text-tiby-muted">
                          Hari
                        </span>
                      </p>
                    </div>

                    <div className={`rounded-2xl p-3 border ${statusColor}`}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1 opacity-80">
                        <StatusIcon className="w-3 h-3" /> Status
                      </p>
                      <p className="font-bold text-xs truncate">{statusText}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 mt-auto pt-4 border-t border-gray-100">
                  <Link
                    href={`/pmo/check-in?patientId=${patient.treatmentPlanId}&patientName=${encodeURIComponent(patient.patientName)}`}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-tiby-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-tiby-teal-700 transition"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    Wakili Check-in
                  </Link>

                  <button
                    onClick={() => setSelectedPatient(patient)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-tiby-ink shadow-sm hover:bg-gray-50 transition"
                  >
                    <MessageSquarePlus className="w-4 h-4 text-tiby-teal-600" />
                    Catat Tindak Lanjut
                  </button>
                </div>
              </div>
            );
          })}
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
