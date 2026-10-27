import { useState, useRef, useEffect } from "react";
import { checkInsApi } from "@/lib/api/check-in";
import { usePopup } from "@/components/ui/popup-provider";
import type {
  CheckInState,
  MedicationStatus,
  SubmitCheckInDto,
  FallbackButtonsPayload,
} from "@/lib/types/check-in";

export function useCheckIn(treatmentPlanId?: string) {
  const { confirm, notify } = usePopup();

  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  const [state, setState] = useState<CheckInState>({
    step: "record",
    audioBlob: null,
    transcript: "",
    extractedData: null,
    verdict: null,
  });

  useEffect(() => {
    let active = true;
    async function checkStatus() {
      try {
        const todayCheckIn = await checkInsApi.getTodayStatus(treatmentPlanId);
        if (active && todayCheckIn) {
          setState((s) => ({ ...s, step: "locked" }));
        }
      } catch (err) {
        console.error("Gagal mengecek status awal:", err);
      } finally {
        if (active) setIsCheckingStatus(false);
      }
    }
    checkStatus();
    return () => {
      active = false;
    };
  }, [treatmentPlanId]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const updateStep = (step: CheckInState["step"]) =>
    setState((s) => ({ ...s, step }));

  const startRecording = async (treatmentPlanId?: string) => {
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
    } catch {
      await notify({
        variant: "warning",
        badgeText: "Akses Mikrofon",
        title: "Izin Mikrofon Ditolak",
        description:
          "Kami tidak dapat mengakses mikrofon. Silakan gunakan tombol manual di bawah.",
        confirmLabel: "Mengerti",
      });
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
      const res = await checkInsApi.extractAudio(blob, treatmentPlanId);
      setState((s) => ({ ...s, transcript: res.transcript, step: "review" }));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Gagal memproses suara.";
      await notify({
        variant: "danger",
        badgeText: "Pemrosesan Gagal",
        title: "Suara Tidak Terbaca",
        description: message,
        confirmLabel: "Coba Lagi",
      });
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
      });

      const payload: SubmitCheckInDto = {
        inputMode: "VOICE_STT",
        treatmentPlanId,
        confirmedFacts: {
          transcript: extractRes.transcript,
          medicationStatus: extractRes.medicationTaken as MedicationStatus,
          pillsTakenCount: extractRes.pillsTakenCount ?? 0,
          symptoms: extractRes.symptoms,
          intentToStop: extractRes.intentToStopOrRefuse,
          confidence: extractRes.extractionConfidence,
        },
      };

      const verdict = await checkInsApi.submit(payload);
      setState((s) => ({ ...s, verdict, step: "result" }));
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === "CHECK_IN_ALREADY_LOCKED") {
        updateStep("locked");
      } else {
        await notify({
          variant: "danger",
          badgeText: "Gagal Mengirim",
          title: "Laporan Tidak Terkirim",
          description:
            error.message || "Terjadi kesalahan pada server atau AI timeout.",
          confirmLabel: "Tutup",
        });
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
        fallbackButtons: data,
      };

      const verdict = await checkInsApi.submit(payload);
      setState((s) => ({ ...s, verdict, step: "result" }));
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === "CHECK_IN_ALREADY_LOCKED") {
        updateStep("locked");
      } else {
        await notify({
          variant: "danger",
          badgeText: "Gagal Mengirim",
          title: "Laporan Tidak Terkirim",
          description:
            error.message || "Terjadi kesalahan jaringan. Silakan coba lagi.",
          confirmLabel: "Tutup",
        });
        updateStep("fallback");
      }
    }
  };

  return {
    state,
    isCheckingStatus,
    startRecording,
    stopRecording,
    submitVoice,
    submitFallback,
    goToFallback: () => updateStep("fallback"),
    goToRecord: () => updateStep("record"),
    reset: () =>
      setState({
        step: "record",
        audioBlob: null,
        transcript: "",
        extractedData: null,
        verdict: null,
      }),
  };
}
