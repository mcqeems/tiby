"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useCheckIn } from "../lib/use-check-in";
import CheckInVoice from "./check-in-voice";
import CheckInReview from "./check-in-review";
import CheckInFallback from "./check-in-fallback";
import CheckInResult from "./check-in-result";
import PublicLoading from "@/components/ui/public-loading";
import { fadeUp } from "@/lib/motion";
import { checkInsApi } from "@/lib/api/check-in";
import { pmoApi } from "@/lib/api/pmo";
import { formatLongDateUtc } from "@/lib/format";
import { notify } from "@/lib/toast";
import { CalendarClock, CheckCircle2, RefreshCw } from "lucide-react";
import {
  formatTodayStatusLabel,
  type FallbackButtonsPayload,
  type MissedCheckInReportItem,
} from "@/lib/types/check-in";

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
  const urlDate = searchParams.get("date") || "";
  const urlMissedReportId = searchParams.get("missedReportId") || "";
  const targetDate = role === "PMO" && urlDate ? urlDate : undefined;
  const missedReportId =
    role === "PMO" && urlMissedReportId ? urlMissedReportId : undefined;
  const [selectedPatientId, setSelectedPatientId] =
    useState<string>(urlPatientId);
  const [loadingPatients, setLoadingPatients] = useState(
    role === "PMO" && !urlPatientId,
  );
  const [pendingReportsList, setPendingReportsList] = useState<
    MissedCheckInReportItem[]
  >([]);

  const {
    state,
    isCheckingStatus,
    todayPrevious,
    startRecording,
    stopRecording,
    submitVoice,
    submitFallback,
    goToFallback,
    goToRecord,
    reset,
  } = useCheckIn(
    selectedPatientId || undefined,
    role === "PASIEN" || Boolean(selectedPatientId),
    targetDate,
    missedReportId,
  );
  const homeHref = role === "PMO" ? "/pmo/pasien" : "/pasien";

  useEffect(() => {
    if (role !== "PMO" || !selectedPatientId || !targetDate) return;
    let active = true;
    checkInsApi
      .getMissedReports(selectedPatientId)
      .then((res) => {
        if (!active) return;
        setPendingReportsList(
          res.reports.filter((r) => r.status === "PENDING"),
        );
      })
      .catch(() => {
        if (active) setPendingReportsList([]);
      });
    return () => {
      active = false;
    };
  }, [role, selectedPatientId, targetDate]);

  const pendingReport =
    pendingReportsList.find((r) =>
      missedReportId
        ? r.id === missedReportId
        : r.reportedDate === targetDate,
    ) ?? null;

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
        .catch(() =>
          notify.error(
            "Gagal Memuat",
            "Daftar pasien dampingan tidak dapat dimuat.",
          ),
        )
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
    return inlineLoader("Pandu sedang memproses laporanmu...");
  }

  if (state.step === "locked") {
    return (
      <div className="flex h-full w-full flex-1 flex-col">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="m-auto flex w-full max-w-md flex-col items-center px-4 py-6 text-center"
        >
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border-4 border-emerald-100 bg-emerald-50 text-emerald-600 shadow-sm">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h2 className="mb-2 font-heading text-2xl font-bold text-tiby-ink">
            {targetDate
              ? `Laporan ${formatLongDateUtc(targetDate)} sudah terkendali!`
              : "Laporan sudah dikirim hari ini!"}
          </h2>
          <p className="mx-auto max-w-xs text-sm leading-relaxed text-tiby-muted">
            {targetDate
              ? "Data check-in untuk tanggal terlewat tersebut sudah terverifikasi dan tersimpan."
              : "Data check-in sudah tercatat dengan aman. Kembali lagi besok ya."}
          </p>
          <button
            onClick={() =>
              router.push(role === "PMO" ? "/pmo/pasien" : "/pasien")
            }
            className="mt-8 rounded-xl bg-tiby-teal-600 px-8 py-3 font-semibold text-white transition-all hover:bg-tiby-teal-700 hover:shadow-lg"
          >
            Kembali ke Beranda
          </button>
        </motion.div>
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

        {role === "PMO" && targetDate && state.step !== "result" && (
          <div
            role="status"
            className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left"
          >
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div className="min-w-0 flex-1 text-xs leading-relaxed text-amber-900">
              <p className="font-semibold">
                Verifikasi Absen · {formatLongDateUtc(targetDate)}
              </p>
              <p className="mt-0.5 text-amber-800">
                Wakili check-in ini akan mengisi catatan dosis untuk tanggal terlewat tersebut dan menyambungkan kembali streak pasien.
              </p>
              {pendingReportsList.length > 1 && (
                <div className="mt-2.5">
                  <label
                    htmlFor="pmo-pick-missed-date"
                    className="mb-1 block text-[11px] font-semibold text-amber-950"
                  >
                    Pilih tanggal laporan yang ingin diverifikasi ({pendingReportsList.length} hari):
                  </label>
                  <select
                    id="pmo-pick-missed-date"
                    value={pendingReport?.id ?? missedReportId ?? ""}
                    onChange={(e) => {
                      const picked = pendingReportsList.find(
                        (r) => r.id === e.target.value,
                      );
                      if (!picked) return;
                      const qs = new URLSearchParams({
                        patientId: selectedPatientId,
                        patientName: urlPatientName || "Pasien",
                        date: picked.reportedDate,
                        missedReportId: picked.id,
                      });
                      reset();
                      router.replace(`/pmo/check-in?${qs.toString()}`);
                    }}
                    className="h-9 w-full rounded-xl border border-amber-300 bg-white px-2.5 text-xs font-semibold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {pendingReportsList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {formatLongDateUtc(r.reportedDate)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {pendingReport?.patientNote && (
                <p className="mt-2 rounded-lg border border-amber-200 bg-white/80 px-2.5 py-1.5 text-amber-950">
                  Catatan pasien: &ldquo;{pendingReport.patientNote}&rdquo;
                </p>
              )}
            </div>
          </div>
        )}

        {todayPrevious &&
          (state.step === "record" ||
            state.step === "review" ||
            state.step === "fallback") &&
          (role === "PASIEN" || Boolean(selectedPatientId)) && (
            <div
              role="status"
              className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left"
            >
              <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div className="text-xs leading-relaxed text-amber-900">
                <p className="font-semibold">
                  {targetDate
                    ? `Memperbarui check-in ${formatLongDateUtc(targetDate)}`
                    : "Memperbarui check-in hari ini"}{" "}
                  (status saat ini: {formatTodayStatusLabel(todayPrevious.verdict)})
                </p>
                <p className="mt-0.5 text-amber-800">
                  Laporan baru akan menggantikan check-in tanggal tersebut yang
                  sebelumnya tersimpan.
                </p>
              </div>
            </div>
          )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={
              role === "PMO" && !selectedPatientId && state.step === "record"
                ? "record-waiting"
                : state.step
            }
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
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
                    onStart={() =>
                      startRecording(selectedPatientId || undefined)
                    }
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
                  <CheckInResult
                    result={state.verdict}
                    onReCheckIn={reset}
                    homeHref={homeHref}
                    verifiedDate={targetDate}
                  />
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
