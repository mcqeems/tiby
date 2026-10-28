"use client";

import { useEffect, useState } from "react";
import MascotAnimation from "@/components/mascot-animation";
import { consentApi } from "@/lib/api/consent";
import { usePopup } from "@/components/ui/popup-provider";
import { ShieldCheck, FileText, Check, Loader2 } from "lucide-react";
import type { ConsentStatus, ConsentScope } from "@/lib/types/consent";

interface ConsentModalProps {
  role?: "PASIEN" | "PMO";
  onGranted?: () => void;
}

export default function ConsentModal({
  role = "PASIEN",
  onGranted,
}: ConsentModalProps) {
  const { notify } = usePopup();

  const [checking, setChecking] = useState(true);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedScopes, setSelectedScopes] = useState<ConsentScope[]>([]);
  const [scheduleConfirmed, setScheduleConfirmed] = useState(false);

  const isPmo = role === "PMO";

  useEffect(() => {
    let active = true;
    async function fetchConsent() {
      try {
        const res = await consentApi.getStatus();
        if (!active) return;
        const s = res as ConsentStatus;
        if (s.active) {
          setNeedsConsent(false);
        } else {
          setNeedsConsent(true);
          if (s.scopes) setSelectedScopes(s.scopes as ConsentScope[]);
        }
      } catch {
        if (active) {
          await notify({
            variant: "danger",
            title: "Gagal Memuat Data",
            description: "Tidak dapat mengambil status persetujuan.",
            confirmLabel: "Tutup",
          });
        }
      } finally {
        if (active) setChecking(false);
      }
    }
    fetchConsent();
    return () => {
      active = false;
    };
  }, [notify]);

  const scopesList = [
    {
      id: "PATIENT_DATA_SHARE" as ConsentScope,
      title: isPmo ? "Akses Data Pasien" : "Berbagi Data Pengobatan",
      description: isPmo
        ? "Mengizinkan saya melihat status kepatuhan dan keluhan pasien yang saya dampingi."
        : "Mengizinkan petugas fasilitas kesehatan melihat status kepatuhan dan keluhan Anda.",
    },
    {
      id: "PMO_STATUS_ONLY" as ConsentScope,
      title: isPmo ? "Penerimaan Notifikasi Darurat" : "Pemantauan oleh PMO",
      description: isPmo
        ? "Mengizinkan saya menerima notifikasi WhatsApp jika pasien lupa minum obat atau berisiko putus obat."
        : "Mengizinkan Pengawas Menelan Obat (PMO) Anda melihat status kepatuhan harian (tanpa isi percakapan).",
    },
    {
      id: "STT_AUDIO_PROCESSING" as ConsentScope,
      title: isPmo ? "Laporan Suara (Mewakili)" : "Pemrosesan Suara AI",
      description: isPmo
        ? "Mengizinkan saya menggunakan fitur suara untuk melaporkan kondisi pasien jika pasien tidak bisa melapor sendiri."
        : "Mengizinkan Pandu memproses rekaman suara Anda untuk mendeteksi keluhan secara otomatis.",
    },
  ];

  const toggleScope = (scope: ConsentScope) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const handleGrant = async () => {
    if (selectedScopes.length < 3) {
      return notify({
        variant: "warning",
        badgeText: "Validasi",
        title: "Persetujuan Belum Lengkap",
        description: "Anda harus mencentang ketiga izin di atas.",
        confirmLabel: "Mengerti",
      });
    }
    if (!scheduleConfirmed) {
      return notify({
        variant: "warning",
        badgeText: "Validasi",
        title: "Konfirmasi Jadwal",
        description: "Anda harus mengonfirmasi jadwal minum obat.",
        confirmLabel: "Mengerti",
      });
    }

    try {
      setSubmitting(true);
      await consentApi.grant(selectedScopes as string[], scheduleConfirmed);

      await notify({
        variant: "success",
        badgeText: "Persetujuan Aktif",
        title: "Terima Kasih!",
        description: "Data Anda kini aman dan sistem siap digunakan.",
        confirmLabel: "Mulai Gunakan Aplikasi",
      });

      setNeedsConsent(false);
      onGranted?.();
    } catch (err: unknown) {
      await notify({
        variant: "danger",
        title: "Gagal Menyimpan",
        description:
          err instanceof Error ? err.message : "Terjadi kesalahan pada server.",
        confirmLabel: "Tutup",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (checking || !needsConsent) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl animate-in zoom-in-95 max-h-[90vh] lg:max-h-[calc(100vh-2rem)]">
        <div className="overflow-y-auto p-6 lg:overflow-hidden lg:p-5">
          <div className="space-y-6 lg:space-y-3">
            <div className="text-center space-y-3 lg:space-y-1.5">
              <div className="mx-auto h-28 w-28 relative lg:h-16 lg:w-16">
                <MascotAnimation
                  emotion="empathy"
                  fill
                  altText="Privasi"
                  priority
                />
              </div>
              <h1 className="text-xl font-heading font-bold text-tiby-ink lg:text-lg">
                {isPmo
                  ? "Persetujuan Pengawas (PMO)"
                  : "Mari Jaga Privasi Anda"}
              </h1>
              <p className="mx-auto max-w-md text-sm text-tiby-muted lg:text-xs lg:max-w-lg">
                {isPmo
                  ? "Sebagai Pengawas Menelan Obat (PMO), Anda akan membantu memantau kepatuhan pasien. Mohon setujui ketentuan berikut."
                  : "Demi keamanan dan kenyamanan Anda, Pandu membutuhkan persetujuan Anda terkait data pengobatan."}
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 lg:space-y-2 lg:p-3">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3 lg:pb-2">
                <ShieldCheck className="h-5 w-5 text-tiby-teal-600 lg:h-4 lg:w-4" />
                <h2 className="font-heading font-semibold text-tiby-ink lg:text-sm">
                  Izin yang Dibutuhkan
                </h2>
              </div>

              {scopesList.map((scope) => (
                <label
                  key={scope.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl p-3 transition hover:bg-gray-50 lg:gap-2.5 lg:p-2"
                >
                  <div className="pt-0.5">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition lg:h-5 lg:w-5 ${
                        selectedScopes.includes(scope.id)
                          ? "border-tiby-teal-600 bg-tiby-teal-600"
                          : "border-gray-300"
                      }`}
                    >
                      {selectedScopes.includes(scope.id) && (
                        <Check className="h-4 w-4 text-white lg:h-3 lg:w-3" />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={selectedScopes.includes(scope.id)}
                      onChange={() => toggleScope(scope.id)}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-tiby-ink lg:text-[13px]">
                      {scope.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-tiby-muted lg:text-[11px] lg:leading-snug">
                      {scope.description}
                    </p>
                  </div>
                </label>
              ))}

              <div className="border-t border-gray-100 pt-3 lg:pt-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl p-3 transition hover:bg-tiby-teal-50/50 lg:gap-2.5 lg:p-2">
                  <div className="pt-0.5">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition lg:h-5 lg:w-5 ${
                        scheduleConfirmed
                          ? "border-tiby-teal-600 bg-tiby-teal-600"
                          : "border-gray-300"
                      }`}
                    >
                      {scheduleConfirmed && (
                        <Check className="h-4 w-4 text-white lg:h-3 lg:w-3" />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={scheduleConfirmed}
                      onChange={(e) => setScheduleConfirmed(e.target.checked)}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-tiby-ink lg:text-[13px]">
                      Konfirmasi Jadwal Pengobatan
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-tiby-muted lg:text-[11px] lg:leading-snug">
                      {isPmo
                        ? "Saya mengonfirmasi bahwa saya akan membantu mengingatkan jadwal minum obat pasien sesuai dengan anjuran dokter."
                        : "Saya mengonfirmasi bahwa jadwal dan dosis obat yang tertera di aplikasi sudah sesuai dengan anjuran dokter."}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <p className="flex items-center justify-center gap-1 text-center text-[11px] text-tiby-muted lg:text-[10px]">
              <FileText className="h-3 w-3" />
              Dilindungi oleh UU Perlindungan Data Pribadi (UU PDP).
            </p>
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-100 bg-white p-4 lg:p-3">
          <button
            onClick={handleGrant}
            disabled={submitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-tiby-teal-600 text-sm font-semibold text-white transition hover:bg-tiby-teal-700 disabled:opacity-70 lg:h-11"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...
              </>
            ) : (
              "Saya Setuju & Lanjutkan"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
