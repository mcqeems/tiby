import { useState, useRef } from "react";
import { checkInsApi } from "@/lib/api/check-in";
import { usePopup } from "@/components/ui/popup-provider";
import type {
  SubmitCheckInPayload,
  FallbackButtonsPayload,
  CheckInState,
  MedicationStatus,
} from "@/lib/types/check-in";

export function useCheckIn() {
  const { confirm, notify } = usePopup();
  const [state, setState] = useState<CheckInState>({
    step: "record",
    audioBlob: null,
    extractedData: null,
    verdict: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const updateStep = (step: CheckInState["step"]) =>
    setState((s) => ({ ...s, step }));

  // ✅ Tambahkan parameter treatmentPlanId (opsional untuk Pasien, wajib untuk PMO)
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
      updateStep("fallback");
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
      setState((s) => ({ ...s, extractedData: res, step: "review" }));
    } catch {
      await notify({
        variant: "danger",
        badgeText: "Pemrosesan Gagal",
        title: "Suara Tidak Terbaca",
        description:
          "Pandu kesulitan memahami suaramu. Silakan coba rekam ulang atau gunakan tombol manual.",
        confirmLabel: "Coba Lagi",
      });
      updateStep("fallback");
    }
  };

  const submitVoice = async (
    editedTranscript: string,
    treatmentPlanId?: string,
  ) => {
    try {
      updateStep("loading");

      const extractRes =
        editedTranscript !== state.extractedData?.transcript
          ? await checkInsApi.extractText({ editedTranscript, treatmentPlanId })
          : state.extractedData;

      if (!extractRes) throw new Error("Data ekstraksi tidak ditemukan.");

      const payload: SubmitCheckInPayload = {
        inputMode: "VOICE_STT",
        treatmentPlanId, // ✅ Masukkan ID Pasien
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

      await notify({
        variant: "success",
        badgeText: "Laporan Suara",
        title: "Berhasil Mengirim Laporan",
        description: "Data dari rekaman suaramu sudah tersimpan dengan aman.",
        confirmLabel: "Lihat Hasil",
      });

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
      confirmLabel: "Ya, Kirim Laporan",
      cancelLabel: "Batal",
    });

    if (!isConfirmed) return;

    try {
      updateStep("loading");
      const payload: SubmitCheckInPayload = {
        inputMode: "FALLBACK_BUTTONS",
        treatmentPlanId, // ✅ Masukkan ID Pasien
        fallbackButtons: data,
      };

      const verdict = await checkInsApi.submit(payload);

      await notify({
        variant: "success",
        badgeText: "Laporan Manual",
        title: "Berhasil Mengirim Laporan",
        description: "Data check-in manualmu sudah tersimpan dengan aman.",
        confirmLabel: "Lihat Hasil",
      });

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
    startRecording,
    stopRecording,
    submitVoice,
    submitFallback,
    goToFallback: () => updateStep("fallback"),
    reset: () =>
      setState({
        step: "record",
        audioBlob: null,
        extractedData: null,
        verdict: null,
      }),
  };
}
