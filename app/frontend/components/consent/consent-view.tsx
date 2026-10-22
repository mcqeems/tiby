"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { consentApi } from "@/lib/api/consent";
import { usePopup } from "@/components/ui/popup-provider";
import PublicLoading from "@/components/ui/public-loading";
import { ShieldCheck, FileText, Check } from "lucide-react";
import type { ConsentStatus, ConsentScope } from "@/lib/types/consent";

const AVAILABLE_SCOPES = [
  {
    id: "PATIENT_DATA_SHARE" as ConsentScope,
    title: "Berbagi Data Pengobatan",
    description:
      "Mengizinkan petugas fasilitas kesehatan melihat status kepatuhan dan keluhan Anda.",
  },
  {
    id: "PMO_STATUS_ONLY" as ConsentScope,
    title: "Pemantauan oleh PMO",
    description:
      "Mengizinkan Pengawas Menelan Obat (PMO) Anda melihat status kepatuhan harian (tanpa isi percakapan).",
  },
  {
    id: "STT_AUDIO_PROCESSING" as ConsentScope,
    title: "Pemrosesan Suara AI",
    description:
      "Mengizinkan Pandu memproses rekaman suara Anda untuk mendeteksi keluhan secara otomatis.",
  },
];

export default function ConsentView({
  role = "PASIEN",
}: {
  role?: "PASIEN" | "PMO";
}) {
  const router = useRouter();
  const { notify, confirm } = usePopup();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ConsentStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // State form
  const [selectedScopes, setSelectedScopes] = useState<ConsentScope[]>([]);
  const [scheduleConfirmed, setScheduleConfirmed] = useState(false);

  useEffect(() => {
    let active = true;
    async function fetchConsent() {
      try {
        const res = await consentApi.getStatus();
        if (active) {
          // ✅ FIX: Memastikan tipe data sesuai
          setStatus(res as ConsentStatus);
          if (res.scopes) {
            setSelectedScopes(res.scopes as ConsentScope[]);
          }
        }
      } catch {
        if (active) {
          await notify({
            variant: "danger",
            title: "Gagal Memuat Data",
            description: "Tidak dapat mengambil status persetujuan Anda.",
            confirmLabel: "Tutup",
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchConsent();
    return () => {
      active = false;
    };
  }, [notify]);

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
        description:
          "Anda harus mencentang ketiga izin di atas agar Pandu dapat bekerja maksimal.",
        confirmLabel: "Mengerti",
      });
    }
    if (!scheduleConfirmed) {
      return notify({
        variant: "warning",
        badgeText: "Validasi",
        title: "Konfirmasi Jadwal",
        description:
          "Anda harus mengonfirmasi jadwal minum obat terlebih dahulu.",
        confirmLabel: "Mengerti",
      });
    }

    try {
      setSubmitting(true);
      // ✅ Mengirim array of string (di-cast agar sesuai tipe)
      await consentApi.grant(selectedScopes as string[], scheduleConfirmed);

      await notify({
        variant: "success",
        badgeText: "Persetujuan Aktif",
        title: "Terima Kasih!",
        description:
          "Data Anda kini aman dan Pandu siap mendampingi pengobatan Anda.",
        confirmLabel: "Mulai Gunakan Aplikasi",
      });

      // Redirect ke halaman utama sesuai role
      router.replace(role === "PMO" ? "/pmo" : "/pasien");
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

  const handleRevoke = async () => {
    const isConfirmed = await confirm({
      variant: "danger",
      badgeText: "Peringatan",
      title: "Cabut Persetujuan?",
      description:
        "Jika dicabut, petugas dan PMO tidak bisa lagi memantau pengobatan Anda. Fitur pendampingan akan dinonaktifkan.",
      confirmLabel: "Ya, Cabut",
      cancelLabel: "Batal",
    });

    if (!isConfirmed) return;

    try {
      setSubmitting(true);
      await consentApi.revoke("Dicabut mandiri oleh pengguna");

      await notify({
        variant: "success",
        title: "Persetujuan Dicabut",
        description: "Anda telah mencabut izin berbagi data.",
        confirmLabel: "Tutup",
      });

      window.location.reload();
    } catch (err: unknown) {
      await notify({
        variant: "danger",
        title: "Gagal Mencabut",
        description:
          err instanceof Error ? err.message : "Terjadi kesalahan pada server.",
        confirmLabel: "Tutup",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <PublicLoading fullScreen message="Memeriksa status persetujuan..." />
    );

  if (status?.active) {
    return (
      <div className="max-w-2xl mx-auto py-10 space-y-6 text-center animate-in fade-in">
        <div className="w-28 h-28 mx-auto relative">
          <Image
            src="/mascot/happy/happy.webp"
            alt="Disetujui"
            fill
            className="object-contain"
          />
        </div>
        <h1 className="text-2xl font-heading font-bold text-tiby-ink">
          Persetujuan Aktif
        </h1>
        <p className="text-sm text-tiby-muted max-w-md mx-auto">
          Anda telah menyetujui pemrosesan data pada{" "}
          {new Date(status.grantedAt!).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          . Pandu siap mendampingi Anda.
        </p>
        <div className="pt-6">
          <button
            onClick={handleRevoke}
            disabled={submitting}
            className="text-xs font-semibold text-red-600 hover:text-red-700 underline underline-offset-4"
          >
            {submitting ? "Memproses..." : "Cabut Persetujuan Privasi"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="text-center space-y-3">
        <div className="w-32 h-32 mx-auto relative">
          <Image
            src="/mascot/empathy/empathy.webp"
            alt="Privasi"
            fill
            className="object-contain"
          />
        </div>
        <h1 className="text-2xl font-heading font-bold text-tiby-ink">
          Sebelum Memulai, <br /> Mari Jaga Privasi Anda
        </h1>
        <p className="text-sm text-tiby-muted max-w-md mx-auto">
          Demi keamanan dan kenyamanan Anda, Pandu membutuhkan persetujuan Anda
          terkait data pengobatan.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 mb-2 pb-4 border-b border-gray-100">
          <ShieldCheck className="w-5 h-5 text-tiby-teal-600" />
          <h2 className="font-heading font-semibold text-tiby-ink">
            Izin yang Dibutuhkan
          </h2>
        </div>

        {AVAILABLE_SCOPES.map((scope) => (
          <label
            key={scope.id}
            className="flex items-start gap-4 p-3 rounded-2xl hover:bg-gray-50 cursor-pointer transition"
          >
            <div className="pt-1">
              <div
                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition ${selectedScopes.includes(scope.id) ? "bg-tiby-teal-600 border-tiby-teal-600" : "border-gray-300"}`}
              >
                {selectedScopes.includes(scope.id) && (
                  <Check className="w-4 h-4 text-white" />
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
              <p className="font-semibold text-sm text-tiby-ink">
                {scope.title}
              </p>
              <p className="text-xs text-tiby-muted mt-0.5 leading-relaxed">
                {scope.description}
              </p>
            </div>
          </label>
        ))}

        <div className="pt-4 border-t border-gray-100">
          <label className="flex items-start gap-4 p-3 rounded-2xl hover:bg-tiby-teal-50/50 cursor-pointer transition">
            <div className="pt-1">
              <div
                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition ${scheduleConfirmed ? "bg-tiby-teal-600 border-tiby-teal-600" : "border-gray-300"}`}
              >
                {scheduleConfirmed && <Check className="w-4 h-4 text-white" />}
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={scheduleConfirmed}
                onChange={(e) => setScheduleConfirmed(e.target.checked)}
              />
            </div>
            <div>
              <p className="font-semibold text-sm text-tiby-ink">
                Konfirmasi Jadwal Pengobatan
              </p>
              <p className="text-xs text-tiby-muted mt-0.5 leading-relaxed">
                Saya mengonfirmasi bahwa jadwal dan dosis obat yang tertera di
                aplikasi sudah sesuai dengan anjuran dokter.
              </p>
            </div>
          </label>
        </div>
      </div>

      <button
        onClick={handleGrant}
        disabled={submitting}
        className="w-full h-14 bg-tiby-teal-600 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-tiby-teal-700 transition shadow-lg shadow-tiby-teal-600/20 disabled:opacity-70"
      >
        {submitting ? "Menyimpan..." : "Saya Setuju & Lanjutkan"}
      </button>

      <p className="text-center text-[11px] text-tiby-muted flex items-center justify-center gap-1">
        <FileText className="w-3 h-3" />
        Dilindungi oleh UU Perlindungan Data Pribadi (UU PDP).
      </p>
    </div>
  );
}
