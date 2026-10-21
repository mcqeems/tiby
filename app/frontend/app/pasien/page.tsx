"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import { handleSignOut } from "../role-guard";
import type { TibyUser } from "@/lib/auth-client";
import { api, ApiError } from "@/lib/api";
import PanduMascot, { type PanduEmotion } from "@/components/pandu-mascot";
import ChangePasswordForm from "@/components/change-password-form";
import type {
  CheckInVerdictResponse,
  AiAudioExtractionResponse,
  MedicationStatus,
} from "@tiby/ts-shared";

// Common side effect chips for easy selection in manual check-in
const SYMPTOM_OPTIONS = [
  { id: "MUAL_RINGAN", label: "Mual Ringan", type: "minor" },
  { id: "URINE_MERAH", label: "Air Seni Kemerahan", type: "minor" },
  { id: "NYERI_SENDI_RINGAN", label: "Nyeri Sendi", type: "minor" },
  { id: "MENGANTUK_LEMAS", label: "Lemas / Mengantuk", type: "minor" },
  { id: "BATUK_DARAH", label: "Batuk Berdarah", type: "major" },
  { id: "SESAK_NAPAS", label: "Sesak Napas", type: "major" },
  { id: "KUNING_IKTERIK", label: "Mata / Kulit Menguning", type: "major" },
  { id: "MUNTAH_HEBAT", label: "Muntah Berat", type: "major" },
];

export default function PasienPage() {
  const { data: sessionData, isPending } = useSession();
  const user = sessionData?.user as TibyUser | undefined;

  // Active navigation tab: "rutinitas" | "edukasi" | "profil"
  const [activeTab, setActiveTab] = useState<"rutinitas" | "edukasi" | "profil">("rutinitas");

  // Consent state
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  // Treatment plan details
  const [treatmentDetails] = useState({
    phase: "Fase Intensif",
    regimen: "FDC-4",
    pillsQuota: 4,
    reminderTime: "08:00 WIB",
  });

  // Check-In flow states: "idle" | "recording" | "extracting" | "confirming" | "manual" | "completed"
  const [flowState, setFlowState] = useState<
    "idle" | "recording" | "extracting" | "confirming" | "manual" | "completed"
  >("idle");

  const [emotion, setEmotion] = useState<PanduEmotion>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Extracted / Confirmed facts state
  const [facts, setFacts] = useState<{
    transcript: string;
    medicationStatus: MedicationStatus;
    pillsTakenCount: number;
    symptoms: string[];
    intentToStop: boolean;
  }>({
    transcript: "",
    medicationStatus: "SUDAH_MINUM",
    pillsTakenCount: 4,
    symptoms: [],
    intentToStop: false,
  });

  // Manual fallback form state
  const [manualForm, setManualForm] = useState({
    medicationStatus: "SUDAH_MINUM" as MedicationStatus,
    pillsTakenCount: 4,
    hasComplaints: false,
    selectedComplaints: [] as string[],
  });

  // Verdict state
  const [verdict, setVerdict] = useState<CheckInVerdictResponse | null>(null);
  const [isLockedToday, setIsLockedToday] = useState(false);

  // Educational cards state
  const [eduCards, setEduCards] = useState<
    Array<{
      id: string;
      title: string;
      summary: string;
      contentMarkdown: string;
      category: string;
    }>
  >([]);

  // Check consent status on initial load
  useEffect(() => {
    if (!user) return;
    api.consent
      .getStatus()
      .then((status) => {
        if (!status.active || status.mustConfirmConsent) {
          setConsentModalOpen(true);
        }
      })
      .catch((err) => {
        // If 403 CONSENT_REQUIRED
        if (err instanceof ApiError && err.code === "CONSENT_REQUIRED") {
          setConsentModalOpen(true);
        }
      });
  }, [user]);

  // Load educational cards
  useEffect(() => {
    api.education
      .getDaily()
      .then((res) => {
        if (res.cards) setEduCards(res.cards);
      })
      .catch(() => {});
  }, []);

  // Handle granting consent
  const handleGrantConsent = async () => {
    setConsentLoading(true);
    setConsentError(null);
    try {
      await api.consent.grant(
        ["PATIENT_DATA_SHARE", "PMO_STATUS_ONLY", "STT_AUDIO_PROCESSING"],
        true,
      );
      setConsentModalOpen(false);
      setConsentError(null);
      setErrorMsg(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan persetujuan";
      setConsentError(msg);
      setErrorMsg(msg);
    } finally {
      setConsentLoading(false);
    }
  };

  // Start voice recording
  const startRecording = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : undefined,
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        await processAudio(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      setFlowState("recording");
      setEmotion("listening");
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn("Microphone access denied or unsupported, fallback to manual form", err);
      // Fallback seamlessly to manual form
      setFlowState("manual");
      setEmotion("idle");
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  // Send audio to backend for extraction
  const processAudio = async (audioBlob: Blob) => {
    setFlowState("extracting");
    setEmotion("thinking");

    try {
      const extraction: AiAudioExtractionResponse = await api.checkIns.extractAudio(audioBlob);
      setFacts({
        transcript: extraction.transcript || "",
        medicationStatus: extraction.medicationTaken || "SUDAH_MINUM",
        pillsTakenCount: extraction.pillsTakenCount ?? 4,
        symptoms: extraction.symptoms || [],
        intentToStop: extraction.intentToStopOrRefuse || false,
      });
      setFlowState("confirming");
      setEmotion("idle");
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === "CHECK_IN_ALREADY_LOCKED") {
        setIsLockedToday(true);
        setFlowState("completed");
        setEmotion("happy");
        return;
      }
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Gagal memproses suara. Kamu bisa mengetik langsung.",
      );
      setFlowState("manual");
      setEmotion("idle");
    }
  };

  // Submit Confirmed Facts (from Voice)
  const submitConfirmedCheckIn = async () => {
    setErrorMsg(null);
    setFlowState("extracting");
    setEmotion("thinking");

    try {
      const res = await api.checkIns.submit({
        inputMode: "VOICE_STT",
        confirmedFacts: {
          transcript: facts.transcript,
          medicationStatus: facts.medicationStatus,
          pillsTakenCount: facts.pillsTakenCount,
          symptoms: facts.symptoms,
          intentToStop: facts.intentToStop,
          confidence: 1,
        },
      });

      handleVerdictResponse(res);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === "CHECK_IN_ALREADY_LOCKED") {
        setIsLockedToday(true);
        setFlowState("completed");
        setEmotion("happy");
        return;
      }
      setErrorMsg(err instanceof Error ? err.message : "Gagal mengirim check-in");
      setFlowState("confirming");
      setEmotion("idle");
    }
  };

  // Submit Manual Form
  const submitManualCheckIn = async () => {
    setErrorMsg(null);
    setFlowState("extracting");
    setEmotion("thinking");

    try {
      const res = await api.checkIns.submit({
        inputMode: "FALLBACK_BUTTONS",
        fallbackButtons: {
          medicationStatus: manualForm.medicationStatus,
          pillsTakenCount: manualForm.pillsTakenCount,
          hasComplaints: manualForm.hasComplaints,
          selectedComplaints: manualForm.selectedComplaints,
        },
      });

      handleVerdictResponse(res);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === "CHECK_IN_ALREADY_LOCKED") {
        setIsLockedToday(true);
        setFlowState("completed");
        setEmotion("happy");
        return;
      }
      setErrorMsg(err instanceof Error ? err.message : "Gagal mengirim check-in");
      setFlowState("manual");
      setEmotion("idle");
    }
  };

  // Update state according to verdict
  const handleVerdictResponse = (res: CheckInVerdictResponse) => {
    setVerdict(res);
    setFlowState("completed");
    setIsLockedToday(true);

    if (res.verdict === "TERKENDALI") {
      setEmotion("happy");
    } else if (res.verdict === "PERLU_PERHATIAN") {
      setEmotion("empathy");
    } else if (res.verdict === "SEGERA_KE_FASKES") {
      setEmotion("alert");
    }
  };

  // Toggle symptom chip in manual form
  const toggleSymptom = (id: string) => {
    setManualForm((prev) => {
      const exists = prev.selectedComplaints.includes(id);
      const next = exists
        ? prev.selectedComplaints.filter((s) => s !== id)
        : [...prev.selectedComplaints, id];
      return {
        ...prev,
        hasComplaints: next.length > 0,
        selectedComplaints: next,
      };
    });
  };

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-tiby-white text-tiby-muted font-body">
        <div className="flex flex-col items-center gap-3">
          <PanduMascot emotion="thinking" size={90} />
          <p className="text-sm">Menyiapkan pendampinganmu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-tiby-white text-tiby-ink font-body selection:bg-tiby-teal-100 selection:text-tiby-teal-700">
      {/* DESKTOP SIDEBAR (250px) */}
      <aside
        aria-label="Sidebar Pasien"
        className="hidden md:flex w-[250px] shrink-0 flex-col justify-between border-r border-tiby-teal-100 bg-white p-6 shadow-xs"
      >
        <div className="space-y-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-tiby-teal-600 text-white font-heading font-600 text-lg shadow-sm">
              T
            </span>
            <div>
              <span className="font-heading text-lg font-600 text-tiby-ink tracking-tight block leading-tight">
                Tiby Pasien
              </span>
              <span className="text-[10px] text-tiby-muted uppercase tracking-wider font-semibold">
                Pendamping Harian
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav aria-label="Navigasi Menu Pasien" className="space-y-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("rutinitas")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer ${
                activeTab === "rutinitas"
                  ? "bg-tiby-teal-50 text-tiby-teal-700"
                  : "text-tiby-muted hover:bg-gray-50 hover:text-tiby-ink"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Rutinitas Sehat</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("edukasi")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer ${
                activeTab === "edukasi"
                  ? "bg-tiby-teal-50 text-tiby-teal-700"
                  : "text-tiby-muted hover:bg-gray-50 hover:text-tiby-ink"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
              <span>Pusat Edukasi</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("profil")}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer ${
                activeTab === "profil"
                  ? "bg-tiby-teal-50 text-tiby-teal-700"
                  : "text-tiby-muted hover:bg-gray-50 hover:text-tiby-ink"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
              <span>Profil Akun</span>
            </button>
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="border-t border-tiby-teal-100 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-tiby-teal-50 text-tiby-teal-700 font-bold text-xs">
              {user?.name?.[0] || user?.username?.[0] || "P"}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-tiby-ink truncate">
                {user?.name || user?.username}
              </p>
              <p className="text-[11px] text-tiby-muted truncate">Pasien</p>
            </div>
          </div>
          <button
            onClick={() => handleSignOut()}
            className="w-full rounded-xl border border-red-200 bg-white py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 cursor-pointer"
          >
            Keluar
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-8">
        <div className="mx-auto max-w-[480px] px-5 pt-5 md:pt-8">
          {/* Top Bar Header */}
          <header className="flex items-center justify-between pb-4">
          <div>
            <span className="text-xs font-semibold text-tiby-teal-700 uppercase tracking-wider">
              Pendamping Harian
            </span>
            <h1 className="font-heading text-xl font-600 text-tiby-ink">
              Halo, {user?.name?.split(" ")[0] || user?.username || "Sobat"} 👋
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {verdict && (
              <span className="flex items-center gap-1 rounded-full bg-tiby-cream px-3 py-1 text-xs font-semibold text-tiby-ink shadow-sm">
                🔥 {verdict.currentStreak} Hari
              </span>
            )}
            <button
              onClick={() => handleSignOut()}
              className="rounded-full border border-tiby-teal-100 bg-white p-2 text-tiby-muted transition hover:bg-tiby-teal-50 hover:text-tiby-teal-700 cursor-pointer"
              title="Keluar"
              aria-label="Keluar dari akun"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.75}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                />
              </svg>
            </button>
          </div>
        </header>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-red-100 bg-tiby-danger p-3 text-xs text-tiby-danger-text animate-fadeIn">
            <span>{errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-tiby-danger-text hover:opacity-75 cursor-pointer ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* TAB 1: RUTINITAS SEHAT (CHECK-IN) */}
        {activeTab === "rutinitas" && (
          <div className="space-y-4">
            {/* HERO SECTION: VOICE CHECK-IN & PANDU */}
            <div className="relative overflow-hidden rounded-3xl border border-tiby-teal-100 bg-white p-6 shadow-[0_4px_20px_rgba(27,158,155,0.06)] text-center">
              {/* Mascot Animation / State */}
              <div className="flex justify-center mb-3">
                <PanduMascot emotion={emotion} size={110} />
              </div>

              {/* Status & Guidance based on flowState */}
              {flowState === "idle" && (
                <>
                  <h2 className="font-heading text-xl font-600 text-tiby-ink">
                    Sudah Minum Obat Hari Ini?
                  </h2>
                  <p className="mt-1 text-xs text-tiby-muted">
                    Tekan tombol mikrofon dan ceritakan kabarmu hari ini kepada Pandu.
                  </p>

                  {/* Detail Terapi Obat */}
                  <div className="my-4 rounded-2xl bg-tiby-teal-50/70 p-3.5 border border-tiby-teal-100 text-left shadow-2xs">
                    <div className="flex items-center justify-between pb-2 border-b border-tiby-teal-100/60">
                      <span className="text-[11px] font-bold text-tiby-teal-700 uppercase tracking-wider">
                        Rencana Terapi Obat
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-tiby-teal-700 shadow-2xs">
                        {treatmentDetails.phase}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-tiby-teal-700 shadow-2xs text-xs">
                          💊
                        </div>
                        <div>
                          <span className="text-[10px] text-tiby-muted block leading-none">Dosis Harian</span>
                          <span className="text-xs font-semibold text-tiby-ink">{treatmentDetails.pillsQuota} Butir ({treatmentDetails.regimen})</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-tiby-teal-700 shadow-2xs text-xs">
                          ⏰
                        </div>
                        <div>
                          <span className="text-[10px] text-tiby-muted block leading-none">Waktu Minum</span>
                          <span className="text-xs font-semibold text-tiby-ink">{treatmentDetails.reminderTime}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Giant Mic Button */}
                  <div className="my-6 flex justify-center">
                    <button
                      type="button"
                      onClick={startRecording}
                      aria-label="Mulai rekam suara"
                      className="group relative flex h-20 w-20 items-center justify-center rounded-full bg-tiby-teal-600 text-white shadow-[0_6px_20px_rgba(27,158,155,0.35)] transition-all duration-300 hover:scale-105 hover:bg-tiby-teal-700 active:scale-95 cursor-pointer"
                    >
                      <span className="absolute -inset-2 rounded-full border border-tiby-teal-100/70 opacity-0 transition-opacity group-hover:opacity-100 animate-pulse pointer-events-none" />
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.8}
                        stroke="currentColor"
                        className="h-8 w-8"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 1.5a3 3 0 00-3 3v7.5a3 3 0 006 0V4.5a3 3 0 00-3-3z"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Fallback button */}
                  <button
                    type="button"
                    onClick={() => setFlowState("manual")}
                    className="text-xs font-semibold text-tiby-teal-700 hover:underline cursor-pointer"
                  >
                    Atau Ketik Catatan Manual
                  </button>
                </>
              )}

              {/* RECORDING STATE */}
              {flowState === "recording" && (
                <>
                  <h2 className="font-heading text-xl font-600 text-tiby-teal-700 animate-pulse">
                    Pandu Mendengarkan...
                  </h2>
                  <p className="mt-1 text-xs text-tiby-muted">
                    Contoh: &ldquo;Halo Pandu, saya sudah minum 4 butir obat pagi ini dan tidak ada keluhan.&rdquo;
                  </p>

                  <div className="my-6 flex flex-col items-center gap-2">
                    {/* Pulsing red mic */}
                    <button
                      type="button"
                      onClick={stopRecording}
                      aria-label="Selesai rekam suara"
                      className="relative flex h-20 w-20 items-center justify-center rounded-full bg-red-500 text-white shadow-lg animate-bounce cursor-pointer"
                    >
                      <span className="absolute -inset-3 rounded-full bg-red-400 opacity-30 animate-ping pointer-events-none" />
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        className="h-8 w-8"
                      >
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                    </button>
                    <span className="text-xs font-semibold text-red-600">
                      Merekam: {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:
                      {String(recordingSeconds % 60).padStart(2, "0")} (Tekan kotak untuk selesai)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      stopRecording();
                      setFlowState("manual");
                    }}
                    className="text-xs text-tiby-muted hover:underline cursor-pointer"
                  >
                    Batal &amp; Ketik Manual
                  </button>
                </>
              )}

              {/* EXTRACTING / THINKING STATE */}
              {flowState === "extracting" && (
                <div className="py-8 flex flex-col items-center">
                  <h2 className="font-heading text-xl font-600 text-tiby-ink">
                    Sedang Memproses...
                  </h2>
                  <p className="mt-1 text-xs text-tiby-muted">
                    Pandu sedang merapikan catatan kesehatanmu.
                  </p>
                  <div className="mt-5 h-2 w-32 overflow-hidden rounded-full bg-tiby-teal-100">
                    <div className="h-full w-full bg-tiby-teal-600 animate-[pulse_1s_ease-in-out_infinite]" />
                  </div>
                </div>
              )}

              {/* CONFIRMING FACTS (FROM VOICE) */}
              {flowState === "confirming" && (
                <div className="text-left space-y-3">
                  <div className="text-center">
                    <h2 className="font-heading text-lg font-600 text-tiby-ink">
                      Konfirmasi Catatan Harian
                    </h2>
                    <p className="text-xs text-tiby-muted">
                      Periksa catatan suara sebelum dikirimkan.
                    </p>
                  </div>

                  {facts.transcript && (
                    <div className="rounded-2xl bg-tiby-teal-50/50 p-3 text-xs italic text-tiby-ink border border-tiby-teal-100">
                      &ldquo;{facts.transcript}&rdquo;
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-tiby-ink block mb-1">
                      Status Minum Obat
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFacts({ ...facts, medicationStatus: "SUDAH_MINUM" })
                        }
                        className={`rounded-xl py-2 px-3 text-xs font-semibold transition cursor-pointer ${
                          facts.medicationStatus === "SUDAH_MINUM"
                            ? "bg-tiby-teal-600 text-white"
                            : "bg-white border border-tiby-teal-100 text-tiby-muted"
                        }`}
                      >
                        ✓ Sudah Minum
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFacts({ ...facts, medicationStatus: "BELUM_MINUM" })
                        }
                        className={`rounded-xl py-2 px-3 text-xs font-semibold transition cursor-pointer ${
                          facts.medicationStatus === "BELUM_MINUM"
                            ? "bg-tiby-teal-600 text-white"
                            : "bg-white border border-tiby-teal-100 text-tiby-muted"
                        }`}
                      >
                        ✕ Belum Minum
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-tiby-ink block mb-1">
                      Jumlah Butir Obat
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={12}
                      value={facts.pillsTakenCount}
                      onChange={(e) =>
                        setFacts({
                          ...facts,
                          pillsTakenCount: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full rounded-xl border border-tiby-teal-100 px-3 py-1.5 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-tiby-ink block mb-1">
                      Keluhan yang Terdeteksi
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {facts.symptoms.length === 0 ? (
                        <span className="text-xs text-tiby-muted italic">
                          Tidak ada keluhan yang terdeteksi
                        </span>
                      ) : (
                        facts.symptoms.map((s, idx) => (
                          <span
                            key={idx}
                            className="rounded-full bg-tiby-cream px-2.5 py-1 text-xs font-medium text-tiby-ink"
                          >
                            {s}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFlowState("idle")}
                      className="flex-1 rounded-full border border-tiby-teal-100 py-2.5 text-xs font-medium text-tiby-muted hover:bg-gray-50 cursor-pointer"
                    >
                      Rekam Ulang
                    </button>
                    <button
                      type="button"
                      onClick={submitConfirmedCheckIn}
                      className="flex-1 rounded-full bg-tiby-teal-600 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-tiby-teal-700 cursor-pointer"
                    >
                      Kirim Laporan
                    </button>
                  </div>
                </div>
              )}

              {/* MANUAL FORM FALLBACK */}
              {flowState === "manual" && (
                <div className="text-left space-y-3">
                  <div className="text-center">
                    <h2 className="font-heading text-lg font-600 text-tiby-ink">
                      Catat Minum Obat Manual
                    </h2>
                    <p className="text-xs text-tiby-muted">
                      Isi form sederhana di bawah ini
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-tiby-ink block mb-1">
                      Apakah sudah minum obat hari ini?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setManualForm({ ...manualForm, medicationStatus: "SUDAH_MINUM" })
                        }
                        className={`rounded-xl py-2 px-3 text-xs font-semibold transition cursor-pointer ${
                          manualForm.medicationStatus === "SUDAH_MINUM"
                            ? "bg-tiby-teal-600 text-white"
                            : "bg-white border border-tiby-teal-100 text-tiby-muted"
                        }`}
                      >
                        ✓ Sudah Minum
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setManualForm({ ...manualForm, medicationStatus: "BELUM_MINUM" })
                        }
                        className={`rounded-xl py-2 px-3 text-xs font-semibold transition cursor-pointer ${
                          manualForm.medicationStatus === "BELUM_MINUM"
                            ? "bg-tiby-teal-600 text-white"
                            : "bg-white border border-tiby-teal-100 text-tiby-muted"
                        }`}
                      >
                        ✕ Belum Minum
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-tiby-ink block mb-1">
                      Jumlah Butir Obat yang Diminum
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={manualForm.pillsTakenCount}
                      onChange={(e) =>
                        setManualForm({
                          ...manualForm,
                          pillsTakenCount: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full rounded-xl border border-tiby-teal-100 px-3 py-1.5 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-tiby-ink block mb-1">
                      Ada keluhan fisik hari ini? (Pilih jika ada)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {SYMPTOM_OPTIONS.map((item) => {
                        const isSelected = manualForm.selectedComplaints.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleSymptom(item.id)}
                            className={`rounded-full px-3 py-1 text-xs transition cursor-pointer ${
                              isSelected
                                ? item.type === "major"
                                  ? "bg-red-600 text-white font-medium"
                                  : "bg-tiby-teal-600 text-white font-medium"
                                : "bg-white border border-tiby-teal-100 text-tiby-muted hover:border-tiby-teal-600"
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFlowState("idle")}
                      className="flex-1 rounded-full border border-tiby-teal-100 py-2.5 text-xs font-medium text-tiby-muted hover:bg-gray-50 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={submitManualCheckIn}
                      className="flex-1 rounded-full bg-tiby-teal-600 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-tiby-teal-700 cursor-pointer"
                    >
                      Kirim Laporan
                    </button>
                  </div>
                </div>
              )}

              {/* COMPLETED VERDICT CARD */}
              {flowState === "completed" && (
                <div className="space-y-3 animate-fadeIn">
                  {/* Verdict Badge & Header */}
                  <div
                    className={`rounded-2xl p-4 text-left transition-colors ${
                      verdict?.verdict === "TERKENDALI" || !verdict
                        ? "bg-tiby-teal-50 border border-tiby-teal-100 text-tiby-teal-700"
                        : verdict.verdict === "PERLU_PERHATIAN"
                          ? "bg-tiby-cream border border-amber-200 text-tiby-ink"
                          : "bg-tiby-danger border border-red-200 text-tiby-danger-text"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-heading text-lg font-600">
                        {verdict?.verdict === "TERKENDALI" || !verdict
                          ? "🟢 Rutinitas Terkendali"
                          : verdict.verdict === "PERLU_PERHATIAN"
                            ? "🟡 Perlu Perhatian"
                            : "🔴 Segera ke Faskes"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isLockedToday && (
                          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-tiby-teal-700 shadow-xs">
                            Terkunci
                          </span>
                        )}
                        {verdict?.currentStreak !== undefined && (
                          <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold shadow-xs">
                            🔥 {verdict.currentStreak} Hari
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed font-body">
                      {verdict?.message ||
                        "Luar biasa! Obat hari ini sudah diminum dengan lengkap. Sampai jumpa besok pagi bersama Pandu!"}
                    </p>

                    {verdict?.verdict === "SEGERA_KE_FASKES" && (
                      <div className="mt-3 flex gap-2">
                        <a
                          href="tel:119"
                          className="inline-block rounded-full bg-red-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-red-700"
                        >
                          Hubungi Faskes
                        </a>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-tiby-muted">
                    Check-in hari ini sudah terkunci. Beristirahatlah yang cukup!
                  </p>
                </div>
              )}
            </div>

            {/* DAILY EDUCATIONAL CARD */}
            {eduCards.length > 0 && (
              <div className="rounded-3xl border border-tiby-teal-100 bg-white p-5 shadow-xs">
                <span className="text-[11px] font-bold text-tiby-teal-600 uppercase tracking-wider block mb-1">
                  Tips Sehat Hari Ini
                </span>
                <h3 className="font-heading text-base font-600 text-tiby-ink">
                  {eduCards[0].title}
                </h3>
                <p className="mt-1 text-xs text-tiby-muted leading-relaxed">
                  {eduCards[0].summary}
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EDUKASI */}
        {activeTab === "edukasi" && (
          <div className="space-y-3 animate-fadeIn">
            <div className="mb-2">
              <h2 className="font-heading text-xl font-600 text-tiby-ink">
                Pusat Edukasi Sehat
              </h2>
              <p className="text-xs text-tiby-muted">
                Informasi dan panduan penting selama masa pemulihan.
              </p>
            </div>

            {eduCards.map((card) => (
              <div
                key={card.id}
                className="rounded-2xl border border-tiby-teal-100 bg-white p-4 shadow-xs"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="rounded-full bg-tiby-teal-50 px-2 py-0.5 text-[10px] font-bold text-tiby-teal-700">
                    {card.category}
                  </span>
                </div>
                <h3 className="font-heading text-sm font-600 text-tiby-ink">
                  {card.title}
                </h3>
                <p className="mt-1 text-xs text-tiby-muted leading-relaxed">
                  {card.summary}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: PROFIL */}
        {activeTab === "profil" && (
          <div className="space-y-3 animate-fadeIn">
            <div className="rounded-2xl border border-tiby-teal-100 bg-white p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-tiby-teal-50 flex items-center justify-center text-tiby-teal-700 font-heading font-600 text-lg">
                  {user?.name?.[0] || user?.username?.[0] || "P"}
                </div>
                <div>
                  <h3 className="font-heading text-base font-600 text-tiby-ink">
                    {user?.name || user?.username}
                  </h3>
                  <p className="text-xs text-tiby-muted font-mono">@{user?.username}</p>
                  <span className="inline-block mt-0.5 rounded-full bg-tiby-teal-50 px-2 py-0.5 text-[10px] font-bold text-tiby-teal-700">
                    Peran: Pasien
                  </span>
                </div>
              </div>
            </div>

            {/* GANTI PASSWORD */}
            <ChangePasswordForm />

            <div className="rounded-2xl border border-tiby-teal-100 bg-white p-4 shadow-xs space-y-2 text-xs">
              <h4 className="font-heading text-sm font-600 text-tiby-ink">
                Privasi &amp; Pendampingan
              </h4>
              <p className="text-tiby-muted leading-relaxed">
                Data kesehatanmu dilindungi dengan enkripsi AES-256 dan hanya dapat diakses oleh Nakes &amp; PMO yang terverifikasi.
              </p>
              <button
                type="button"
                onClick={() => setConsentModalOpen(true)}
                className="text-xs font-semibold text-tiby-teal-700 hover:underline cursor-pointer block pt-1"
              >
                Tinjau Persetujuan Privasi
              </button>
            </div>

            <button
              onClick={() => handleSignOut()}
              className="w-full rounded-2xl border border-red-200 bg-white py-3 text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
            >
              Keluar dari Akun
            </button>
          </div>
        )}
        </div>
      </main>

      {/* BOTTOM NAVIGATION (PIVY STYLE 3-TABS) - Hidden on Desktop */}
      <nav
        aria-label="Navigasi Utama"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-tiby-teal-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]"
      >
          <div className="mx-auto flex max-w-[480px] items-center justify-around py-2.5">
            <button
              type="button"
              onClick={() => setActiveTab("rutinitas")}
              className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                activeTab === "rutinitas"
                  ? "text-tiby-teal-600 font-semibold"
                  : "text-tiby-muted hover:text-tiby-teal-700"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={activeTab === "rutinitas" ? 2 : 1.75}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-[11px]">Rutinitas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("edukasi")}
              className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                activeTab === "edukasi"
                  ? "text-tiby-teal-600 font-semibold"
                  : "text-tiby-muted hover:text-tiby-teal-700"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={activeTab === "edukasi" ? 2 : 1.75}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
              <span className="text-[11px]">Edukasi</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("profil")}
              className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                activeTab === "profil"
                  ? "text-tiby-teal-600 font-semibold"
                  : "text-tiby-muted hover:text-tiby-teal-700"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={activeTab === "profil" ? 2 : 1.75}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
              <span className="text-[11px]">Profil</span>
            </button>
          </div>
        </nav>

      {/* CONSENT MODAL */}
      {consentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-tiby-teal-100 text-center animate-fadeIn">
            <div className="flex justify-center mb-2">
              <PanduMascot emotion="happy" size={90} />
            </div>
            <h3 className="font-heading text-lg font-600 text-tiby-ink">
              Persetujuan Pendampingan
            </h3>
            <p className="mt-1 text-xs text-tiby-muted leading-relaxed">
              Agar Pandu bisa membantumu memantau rutinitas sehat, kami memerlukan izin untuk:
            </p>

            {consentError && (
              <div className="mt-3 rounded-2xl bg-tiby-danger p-2.5 text-xs text-tiby-danger-text border border-red-100 text-left animate-fadeIn">
                ⚠️ {consentError}
              </div>
            )}

            <div className="my-4 text-left space-y-2 rounded-2xl bg-tiby-teal-50/50 p-3.5 border border-tiby-teal-100 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-tiby-teal-600 font-bold">✓</span>
                <span>Memproses suara untuk ekstraksi fakta minum obat</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-tiby-teal-600 font-bold">✓</span>
                <span>Membagikan status kepatuhan kepada petugas faskes</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-tiby-teal-600 font-bold">✓</span>
                <span>Mengizinkan PMO mendampingi jika kamu lupa minum obat</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-tiby-teal-600 font-bold">✓</span>
                <span>Konfirmasi jadwal minum obat harian ({treatmentDetails.reminderTime})</span>
              </div>
            </div>

            <button
              type="button"
              disabled={consentLoading}
              onClick={handleGrantConsent}
              className="w-full rounded-full bg-tiby-teal-600 py-3 text-xs font-semibold text-white shadow-md hover:bg-tiby-teal-700 disabled:opacity-50 cursor-pointer"
            >
              {consentLoading ? "Menyimpan Persetujuan..." : "Setujui & Mulai"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
