"use client";

import { useState, useEffect } from "react";
import { faskesApi } from "@/lib/api/faskes";
import { useSession, type TibyUser } from "@/lib/auth-client";
import type { PatientHistoryItem } from "@/lib/types/faskes";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  CalendarDays,
  Pill,
  Activity,
  Flame,
  Loader2,
} from "lucide-react";

// Tipe data untuk tampilan UI
interface HistoryDisplayItem {
  id: string;
  date: string;
  time: string;
  verdict: string;
  pillsTaken: number;
  symptoms: string[];
  streak: number;
}

// Data Dummy (Cadangan jika API error / belum siap)
const MOCK_HISTORY: HistoryDisplayItem[] = [
  {
    id: "1",
    date: "Hari Ini",
    time: "08:15",
    verdict: "TERKENDALI",
    pillsTaken: 4,
    symptoms: [],
    streak: 12,
  },
  {
    id: "2",
    date: "Kemarin",
    time: "07:50",
    verdict: "PERLU_PERHATIAN",
    pillsTaken: 4,
    symptoms: ["Mual ringan", "Pusing"],
    streak: 11,
  },
];

const getVerdictStyle = (verdict: string) => {
  switch (verdict) {
    case "TERKENDALI":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        icon: CheckCircle2,
        label: "Terkendali",
      };
    case "PERLU_PERHATIAN":
      return {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        icon: AlertTriangle,
        label: "Perlu Perhatian",
      };
    case "SEGERA_KE_FASKES":
      return {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        icon: ShieldAlert,
        label: "Segera ke Faskes",
      };
    default:
      return {
        bg: "bg-gray-50",
        text: "text-gray-700",
        border: "border-gray-200",
        icon: Activity,
        label: "Aktivitas",
      };
  }
};

export default function RiwayatView() {
  const { data: session } = useSession();
  const [history, setHistory] = useState<HistoryDisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUsingMock, setIsUsingMock] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchHistory() {
      try {
        // CATATAN: Kita asumsikan user ID (session.user.id) di sini
        // adalah treatmentPlanId pasien. Jika berbeda, sesuaikan!
        const patientId = (session?.user as TibyUser)?.id;

        if (!patientId) {
          if (active) {
            setHistory(MOCK_HISTORY);
            setIsUsingMock(true);
            setLoading(false);
          }
          return;
        }

        // Coba tembak API riwayat
        const res = await faskesApi.getPatientHistory(patientId, 1, 20);

        if (active) {
          if (res.items && res.items.length > 0) {
            // Jika API mengembalikan data, kita mapping ke UI
            const mapped = res.items.map((item: PatientHistoryItem) => ({
              id: item.id,
              date: new Date(item.createdAt).toLocaleDateString("id-ID"),
              time: new Date(item.createdAt).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              verdict:
                item.newState === "BERISIKO" ? "PERLU_PERHATIAN" : "TERKENDALI",
              pillsTaken: 4, // Data pil tidak ada di history endpoint, kita hardcode sementara
              symptoms: item.reasonOrSummary ? [item.reasonOrSummary] : [],
              streak: item.newStreak || 0,
            }));
            setHistory(mapped);
          } else {
            // Jika API kosong, tampilkan pesan kosong (atau dummy)
            setHistory(MOCK_HISTORY);
            setIsUsingMock(true);
          }
        }
      } catch (err) {
        // Jika GAGAL (misal 403 Forbidden karena role Pasien), gunakan Dummy
        if (active) {
          setHistory(MOCK_HISTORY);
          setIsUsingMock(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchHistory();
    return () => {
      active = false;
    };
  }, [session]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-tiby-teal-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 md:pb-10">
      {/* ... (Header dan Ringkasan Streak sama persis seperti sebelumnya) ... */}
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-tiby-ink">
          Riwayat Terapi
        </h1>
        <p className="mt-1 text-sm text-tiby-muted">
          Catatan perjalanan pengobatan dan laporan harian Anda.
        </p>
      </div>

      <div className="bg-tiby-teal-600 rounded-3xl p-6 text-white shadow-lg shadow-tiby-teal-600/20 relative overflow-hidden">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-tiby-teal-100 text-sm font-medium mb-1">
              Total Check-in Beruntun
            </p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-heading font-bold">
                {history[0]?.streak || 0}
              </span>
              <span className="text-lg font-medium mb-1">Hari</span>
            </div>
          </div>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Flame className="w-10 h-10 text-white fill-white/50" />
          </div>
        </div>
      </div>

      {/* List Riwayat */}
      <div className="space-y-4">
        {history.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-200">
            <p className="text-sm text-tiby-muted">
              Belum ada riwayat check-in.
            </p>
          </div>
        ) : (
          history.map((item) => {
            const style = getVerdictStyle(item.verdict);
            const Icon = style.icon;
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2 text-tiby-ink font-semibold">
                    <CalendarDays className="w-4 h-4 text-tiby-muted" />
                    {item.date}
                    <span className="text-xs font-normal text-tiby-muted bg-gray-100 px-2 py-0.5 rounded-md">
                      {item.time}
                    </span>
                  </div>
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${style.bg} ${style.text} ${style.border}`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {style.label}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-tiby-teal-100 flex items-center justify-center shrink-0">
                      <Pill className="w-4 h-4 text-tiby-teal-700" />
                    </div>
                    <div>
                      <p className="text-[10px] text-tiby-muted uppercase font-bold tracking-wider">
                        Obat Diminum
                      </p>
                      <p className="text-sm font-semibold text-tiby-ink">
                        {item.pillsTaken} Butir
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4 text-amber-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-tiby-muted uppercase font-bold tracking-wider">
                        Keluhan
                      </p>
                      <p className="text-sm font-semibold text-tiby-ink truncate">
                        {item.symptoms.length > 0
                          ? item.symptoms.join(", ")
                          : "Tidak ada keluhan"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isUsingMock && (
        <div className="text-center pt-4">
          <p className="text-xs text-tiby-muted bg-amber-50 text-amber-700 p-2 rounded-lg border border-amber-200">
            *Menampilkan data simulasi. (Akses riwayat asli memerlukan endpoint
            khusus Pasien dari Backend).
          </p>
        </div>
      )}
    </div>
  );
}
