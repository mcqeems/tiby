"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCheckIn } from "../lib/use-check-in";
import CheckInVoice from "./check-in-voice";
import CheckInReview from "./check-in-review";
import CheckInFallback from "./check-in-fallback";
import CheckInResult from "./check-in-result";
import PublicLoading from "@/components/ui/public-loading";
import { pmoApi } from "@/lib/api/pmo";
import type { FallbackButtonsPayload } from "@/lib/types/check-in";

// Definisikan tipe data pasien PMO
interface PmoPatient {
  treatmentPlanId: string;
  patientName: string;
}

export default function CheckInView({
  role = "PASIEN",
}: {
  role?: "PASIEN" | "PMO";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    state,
    startRecording,
    stopRecording,
    submitVoice,
    submitFallback,
    goToFallback,
  } = useCheckIn();

  const [patients, setPatients] = useState<PmoPatient[]>([]);

  // Ambil data dari URL jika PMO
  const urlPatientId = searchParams.get("patientId") || "";
  const urlPatientName = searchParams.get("patientName") || "";
  const [selectedPatientId, setSelectedPatientId] =
    useState<string>(urlPatientId);

  // ✅ FIX: Inisialisasi loadingPatients menjadi true JIKA role PMO dan tidak ada ID dari URL
  const [loadingPatients, setLoadingPatients] = useState(
    role === "PMO" && !urlPatientId,
  );

  // Fetch daftar pasien jika PMO dan tidak ada ID di URL
  useEffect(() => {
    let isMounted = true;

    if (role === "PMO" && !urlPatientId) {
      pmoApi
        .getPatients()
        .then((res) => {
          if (!isMounted) return;
          // ✅ FIX: Hilangkan penggunaan 'any', gunakan cast ke tipe yang aman
          const list = Array.isArray(res)
            ? res
            : (res as { items?: PmoPatient[] }).items || [];
          setPatients(list as PmoPatient[]);
        })
        .catch((err) => console.error(err))
        .finally(() => {
          if (isMounted) setLoadingPatients(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [role, urlPatientId]);

  if (loadingPatients)
    return <PublicLoading fullScreen message="Memuat daftar pasien..." />;

  if (state.step === "loading") {
    return (
      <PublicLoading fullScreen message="Pandu sedang memproses laporan..." />
    );
  }

  if (state.step === "locked") {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-emerald-100">
          <span className="text-4xl">✅</span>
        </div>
        <h2 className="text-xl font-bold text-tiby-ink">
          Laporan sudah dikirim hari ini!
        </h2>
        <p className="text-sm text-tiby-muted max-w-xs mx-auto">
          Data check-in sudah tercatat dengan aman. Kembali lagi besok ya.
        </p>
        <button
          onClick={() =>
            router.push(role === "PMO" ? "/pmo/pasien" : "/pasien")
          }
          className="mt-6 px-6 py-2.5 bg-tiby-teal-600 text-white rounded-xl font-semibold hover:bg-tiby-teal-700 transition"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto w-full">
      {/* UI Pemilihan Pasien (Hanya jika PMO dan tidak ada ID dari URL) */}
      {role === "PMO" && state.step === "record" && !urlPatientId && (
        <div className="mb-6 p-5 bg-white border border-tiby-teal-100 rounded-2xl shadow-sm">
          <label className="text-xs font-bold text-tiby-ink mb-2 block">
            Pilih Pasien yang Didampingi:
          </label>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:ring-2 focus:ring-tiby-teal-600 bg-gray-50"
          >
            <option value="">-- Pilih Pasien --</option>
            {patients.map((p) => (
              <option key={p.treatmentPlanId} value={p.treatmentPlanId}>
                {p.patientName}
              </option>
            ))}
          </select>
          {!selectedPatientId && (
            <p className="text-[11px] text-amber-600 mt-2 font-medium">
              * Pilih pasien terlebih dahulu untuk memulai check-in.
            </p>
          )}
        </div>
      )}

      {/* Info Pasien (Jika PMO membuka via URL) */}
      {role === "PMO" &&
        urlPatientId &&
        urlPatientName &&
        state.step === "record" && (
          <div className="mb-6 p-4 bg-tiby-teal-50 border border-tiby-teal-100 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-tiby-teal-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {urlPatientName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] text-tiby-teal-700 font-semibold uppercase tracking-wider">
                Check-in Mewakili:
              </p>
              <p className="text-sm font-bold text-tiby-ink">
                {urlPatientName}
              </p>
            </div>
          </div>
        )}

      {/* Validasi: Jangan tampilkan form jika PMO belum pilih pasien */}
      {role === "PMO" && !selectedPatientId && state.step === "record" ? (
        <div className="text-center py-10 opacity-50">
          <div className="w-36 h-36 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl text-gray-300">🐼</span>
          </div>
          <p className="text-sm font-semibold text-gray-400">
            Menunggu pasien dipilih...
          </p>
        </div>
      ) : (
        <>
          {state.step === "record" && (
            <CheckInVoice
              onStart={() => startRecording(selectedPatientId || undefined)}
              onStop={stopRecording}
              onFallback={goToFallback}
            />
          )}

          {state.step === "review" && state.extractedData && (
            <CheckInReview
              data={state.extractedData}
              onSubmit={(text: string) =>
                submitVoice(text, selectedPatientId || undefined)
              }
            />
          )}

          {state.step === "fallback" && (
            <CheckInFallback
              onSubmit={(data: FallbackButtonsPayload) =>
                submitFallback(data, selectedPatientId || undefined)
              }
            />
          )}

          {state.step === "result" && state.verdict && (
            <CheckInResult
              verdict={state.verdict.verdict}
              message={state.verdict.message}
              streak={state.verdict.currentStreak}
            />
          )}
        </>
      )}
    </div>
  );
}
