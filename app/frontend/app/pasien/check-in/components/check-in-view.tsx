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
import { CheckCircle2 } from "lucide-react";
import type { FallbackButtonsPayload } from "@/lib/types/check-in";

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

  const [patients, setPatients] = useState<PmoPatient[]>([]);
  const urlPatientId = searchParams.get("patientId") || "";
  const urlPatientName = searchParams.get("patientName") || "";
  const [selectedPatientId, setSelectedPatientId] =
    useState<string>(urlPatientId);
  const [loadingPatients, setLoadingPatients] = useState(
    role === "PMO" && !urlPatientId,
  );

  const {
    state,
    isCheckingStatus,
    startRecording,
    stopRecording,
    submitVoice,
    submitFallback,
    goToFallback,
    goToRecord,
  } = useCheckIn(selectedPatientId || undefined);

  useEffect(() => {
    let isMounted = true;
    if (role === "PMO" && !urlPatientId) {
      pmoApi
        .getPatients()
        .then((res) => {
          if (!isMounted) return;
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

  const inlineLoader = (message: string) => (
    <div className="flex h-full w-full flex-1 flex-col">
      <div className="m-auto w-full max-w-md py-6">
        <PublicLoading message={message} />
      </div>
    </div>
  );

  if (loadingPatients || isCheckingStatus) {
    return inlineLoader("Memeriksa status check-in...");
  }

  if (state.step === "loading") {
    return inlineLoader(
      "Pandu sedang memproses laporanmu... (Bisa memakan waktu hingga 40 detik)",
    );
  }

  if (state.step === "locked") {
    return (
      <div className="flex h-full w-full flex-1 flex-col">
        <div className="m-auto flex w-full max-w-md flex-col items-center px-4 py-6 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border-4 border-emerald-100 bg-emerald-50 text-emerald-600 shadow-sm">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h2 className="mb-2 font-heading text-2xl font-bold text-tiby-ink">
            Laporan sudah dikirim hari ini!
          </h2>
          <p className="mx-auto max-w-xs text-sm leading-relaxed text-tiby-muted">
            Data check-in sudah tercatat dengan aman. Kembali lagi besok ya.
          </p>
          <button
            onClick={() =>
              router.push(role === "PMO" ? "/pmo/pasien" : "/pasien")
            }
            className="mt-8 rounded-xl bg-tiby-teal-600 px-8 py-3 font-semibold text-white transition-all hover:bg-tiby-teal-700 hover:shadow-lg"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-1 flex-col">
      <div
        className={`m-auto w-full py-6 ${
          state.step === "fallback" ? "max-w-3xl" : "max-w-md"
        }`}
      >
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
        </div>
      )}

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

          {state.step === "review" && (
            <CheckInReview
              transcript={state.transcript}
              onSubmit={(text: string) =>
                submitVoice(text, selectedPatientId || undefined)
              }
              onRetry={goToRecord}
            />
          )}

          {state.step === "fallback" && (
            <CheckInFallback
              onBackToVoice={goToRecord}
              onSubmit={(data: FallbackButtonsPayload) =>
                submitFallback(data, selectedPatientId || undefined)
              }
            />
          )}

          {state.step === "result" && state.verdict && (
            <CheckInResult result={state.verdict} />
          )}
        </>
      )}
      </div>
    </div>
  );
}
