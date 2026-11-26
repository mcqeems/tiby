import { useState, useRef, useEffect } from "react";
import { checkInsApi } from "@/lib/api/check-in";
import { usePopup } from "@/components/ui/popup-provider";
import { notify } from "@/lib/toast";
import {
  isCheckInLockedToday,
  type CheckInState,
  type MedicationStatus,
  type SafetyVerdict,
  type SubmitCheckInDto,
  type FallbackButtonsPayload,
} from "@/lib/types/check-in";

export interface TodayPreviousSummary {
  verdict: SafetyVerdict | null;
  isDoseFulfilled: boolean;
}

const INITIAL_STATE: CheckInState = {
  step: "record",
  audioBlob: null,
  transcript: "",
  extractedData: null,
  verdict: null,
};

export function useCheckIn(
  treatmentPlanId?: string,
  enabled = true,
  targetDate?: string,
  missedReportId?: string,
) {
  const { confirm } = usePopup();

  const targetKey = enabled
    ? `${treatmentPlanId ?? "self"}:${targetDate ?? "today"}`
    : null;
  const [checkedKey, setCheckedKey] = useState<string | null>(null);
  const [todayPrevious, setTodayPrevious] =
    useState<TodayPreviousSummary | null>(null);

  const [state, setState] = useState<CheckInState>(INITIAL_STATE);
  const isCheckingStatus = enabled && checkedKey !== targetKey;

  useEffect(() => {
    if (!enabled || targetKey === null) return;
    let active = true;

    async function checkStatus() {
      try {
        const existingCheckIn = await checkInsApi.getStatusForDate(
          treatmentPlanId,
          targetDate,
        );
        if (!active) return;

        if (existingCheckIn && isCheckInLockedToday(existingCheckIn.verdict)) {
          setTodayPrevious(null);
          setState({ ...INITIAL_STATE, step: "locked" });
        } else if (existingCheckIn) {
          setTodayPrevious({
            verdict: existingCheckIn.verdict,
            isDoseFulfilled: existingCheckIn.isDoseFulfilled,
          });
          setState(INITIAL_STATE);
        } else {
          setTodayPrevious(null);
          setState(INITIAL_STATE);
        }
      } catch (err) {
        console.error("Gagal mengecek status awal:", err);
      } finally {
        if (active) setCheckedKey(targetKey);
      }
    }
    checkStatus();
    return () => {
      active = false;
    };
  }, [treatmentPlanId, targetDate, enabled, targetKey]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const updateStep = (step: CheckInState["step"]) =>
    setState((s) => ({ ...s, step }));

  const startRecording = async (
    treatmentPlanId?: string,
  ): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        setState((s) => ({ ...s, audioBlob, step: "loading" }));
        await processAudio(audioBlob, treatmentPlanId);
      };

      mediaRecorder.start();
      return true;
    } catch {
      notify.warning(
        "Izin Mikrofon Ditolak",
        "Kami tidak dapat mengakses mikrofon. Silakan gunakan tombol manual di bawah.",
      );
      return false;
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
  };

  const processAudio = async (blob: Blob, treatmentPlanId?: string) => {
    try {
      const res = await checkInsApi.extractAudio(
        blob,
        treatmentPlanId,
        targetDate,
      );
      setState((s) => ({ ...s, transcript: res.transcript, step: "review" }));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Gagal memproses suara.";
      notify.error("Suara Tidak Terbaca", message);
      updateStep("record");
    }
  };

  const submitVoice = async (
    editedTranscript: string,
    treatmentPlanId?: string,
  ) => {
    try {
      updateStep("loading");

      const extractRes = await checkInsApi.extractText({
        editedTranscript,
        treatmentPlanId,
        checkInDate: targetDate,
      });

      const payload: SubmitCheckInDto = {
        inputMode: "VOICE_STT",
        treatmentPlanId,
        checkInDate: targetDate,
        missedReportId,
        confirmedFacts: {
          transcript: extractRes.transcript,
          medicationStatus: extractRes.medicationTaken as MedicationStatus,
          pillsTakenCount: extractRes.pillsTakenCount ?? null,
          symptoms: extractRes.symptoms,
          intentToStop: extractRes.intentToStopOrRefuse,
          confidence: extractRes.extractionConfidence,
        },
      };

      const verdict = await checkInsApi.submit(payload);
      setTodayPrevious(
        isCheckInLockedToday(verdict.verdict)
          ? null
          : { verdict: verdict.verdict, isDoseFulfilled: verdict.isDoseFulfilled },
      );
      setState((s) => ({ ...s, verdict, step: "result" }));
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === "CHECK_IN_ALREADY_LOCKED") {
        setTodayPrevious(null);
        updateStep("locked");
      } else {
        notify.error(
          "Laporan Tidak Terkirim",
          error.message || "Terjadi kesalahan pada server atau AI timeout.",
        );
        updateStep("review");
      }
    }
  };

  const submitFallback = async (
    data: FallbackButtonsPayload,
    treatmentPlanId?: string,
  ) => {
    const isConfirmed = await confirm({
      variant: "info",
      badgeText: "Konfirmasi Manual",
      title: "Kirim laporan ini?",
      description:
        "Pastikan pilihan kondisimu sudah benar sebelum laporan disimpan.",
      confirmLabel: "Ya, Kirim",
      cancelLabel: "Batal",
    });

    if (!isConfirmed) return;

    try {
      updateStep("loading");
      const payload: SubmitCheckInDto = {
        inputMode: "FALLBACK_BUTTONS",
        treatmentPlanId,
        checkInDate: targetDate,
        missedReportId,
        fallbackButtons: data,
      };

      const verdict = await checkInsApi.submit(payload);
      setTodayPrevious(
        isCheckInLockedToday(verdict.verdict)
          ? null
          : { verdict: verdict.verdict, isDoseFulfilled: verdict.isDoseFulfilled },
      );
      setState((s) => ({ ...s, verdict, step: "result" }));
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === "CHECK_IN_ALREADY_LOCKED") {
        setTodayPrevious(null);
        updateStep("locked");
      } else {
        notify.error(
          "Laporan Tidak Terkirim",
          error.message || "Terjadi kesalahan jaringan. Silakan coba lagi.",
        );
        updateStep("fallback");
      }
    }
  };

  return {
    state,
    isCheckingStatus,
    todayPrevious,
    startRecording,
    stopRecording,
    submitVoice,
    submitFallback,
    goToFallback: () => updateStep("fallback"),
    goToRecord: () => updateStep("record"),
    reset: () => setState(INITIAL_STATE),
  };
}
