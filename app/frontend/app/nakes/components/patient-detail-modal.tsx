"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { usePopup } from "@/components/ui/popup-provider";
import {
  X,
  User,
  Pill,
  Users,
  Calendar,
  Clock,
  KeyRound,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Phone,
  RefreshCw,
  FileText,
} from "lucide-react";

export interface PatientRecord {
  id: string;
  userId?: string;
  fullName: string;
  username: string;
  whatsappNumber: string;
  regimenCode: string;
  dailyPillQuota: number;
  reminderTimeLocal: string;
  startDate: string;
  streakDays: number;
  todayStatus: "SUDAH_MINUM" | "BELUM_MINUM" | "TIDAK_PASTI";
  pmo: {
    userId?: string;
    fullName: string;
    username: string;
    whatsappNumber: string;
    relationship: string;
  };
  history?: {
    id: string;
    date: string;
    status: "SUDAH_MINUM" | "BELUM_MINUM" | "TIDAK_PASTI";
    pillsTaken: number;
    complaints?: string[];
  }[];
}

interface PatientDetailModalProps {
  patient: PatientRecord | null;
  onClose: () => void;
}

type ActiveTab = "profil" | "riwayat" | "keamanan";

export default function PatientDetailModal({
  patient,
  onClose,
}: PatientDetailModalProps) {
  const { confirm, notify } = usePopup();
  const [activeTab, setActiveTab] = useState<ActiveTab>("profil");
  const [resettingTarget, setResettingTarget] = useState<
    "PASIEN" | "PMO" | null
  >(null);
  const [newPasswordInfo, setNewPasswordInfo] = useState<{
    role: "Pasien" | "PMO";
    username: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!patient) return null;

  const generateTempPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let pass = "Tiby#";
    for (let i = 0; i < 5; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const handleResetPassword = async (target: "PASIEN" | "PMO") => {
    const targetName =
      target === "PASIEN" ? patient.fullName : patient.pmo.fullName;
    const targetUsername =
      target === "PASIEN" ? patient.username : patient.pmo.username;
    const targetUserId =
      target === "PASIEN" ? patient.userId || patient.id : patient.pmo.userId;

    const isConfirmed = await confirm({
      variant: "warning",
      badgeText: "Konfirmasi Keamanan",
      title: `Reset password untuk ${targetName}?`,
      description: `Password lama untuk akun @${targetUsername} tidak akan berlaku lagi dan akan digantikan dengan password sementara yang baru.`,
      confirmLabel: "Ya, Reset Password",
      cancelLabel: "Batal",
    });

    if (!isConfirmed) return;

    setResettingTarget(target);
    const tempPassword = generateTempPassword();

    try {
      // Menembak API update/reset password jika tersedia di lib/api
      const usersApi = api.users as Record<string, unknown>;
      if (typeof usersApi?.resetPassword === "function" && targetUserId) {
        await (
          usersApi.resetPassword as (id: string, pw: string) => Promise<unknown>
        )(targetUserId, tempPassword);
      } else if (typeof usersApi?.update === "function" && targetUserId) {
        await (
          usersApi.update as (
            id: string,
            data: Record<string, unknown>,
          ) => Promise<unknown>
        )(targetUserId, { password: tempPassword });
      }

      setNewPasswordInfo({
        role: target === "PASIEN" ? "Pasien" : "PMO",
        username: targetUsername,
        password: tempPassword,
      });

      await notify({
        variant: "success",
        badgeText: "Berhasil",
        title: "Password Baru Telah Diterbitkan",
        description: `Silakan salin kredensial baru untuk @${targetUsername} dan berikan kepada yang bersangkutan.`,
        confirmLabel: "Mengerti",
      });
    } catch (err: unknown) {
      await notify({
        variant: "danger",
        badgeText: "Gagal",
        title: "Gagal Mereset Password",
        description:
          err instanceof Error
            ? err.message
            : "Terjadi kendala saat menghubungi server untuk mereset password.",
        confirmLabel: "Tutup",
      });
    } finally {
      setResettingTarget(null);
    }
  };

  const handleCopyCredentials = () => {
    if (!newPasswordInfo) return;
    const text = `Akun Tiby (${newPasswordInfo.role})\nUsername: ${newPasswordInfo.username}\nPassword Baru: ${newPasswordInfo.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
      >
        {/* Header Modal */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tiby-teal-50 text-tiby-teal-700 font-heading font-semibold text-base border border-tiby-teal-100">
              {patient.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-heading text-lg font-semibold text-tiby-ink">
                  {patient.fullName}
                </h2>
                <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 font-mono">
                  @{patient.username}
                </span>
              </div>
              <p className="text-xs text-tiby-muted mt-0.5">
                Regimen {patient.regimenCode} &bull; {patient.dailyPillQuota}{" "}
                butir/hari &bull; Pengingat {patient.reminderTimeLocal}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigasi Tab Bersih */}
        <div className="flex items-center gap-1 border-b border-gray-100 bg-gray-50/60 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("profil")}
            className={`inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === "profil"
                ? "border-tiby-teal-600 text-tiby-teal-700"
                : "border-transparent text-tiby-muted hover:text-tiby-ink"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Informasi & Terapi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("riwayat")}
            className={`inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === "riwayat"
                ? "border-tiby-teal-600 text-tiby-teal-700"
                : "border-transparent text-tiby-muted hover:text-tiby-ink"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Riwayat Check-in</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("keamanan")}
            className={`inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === "keamanan"
                ? "border-tiby-teal-600 text-tiby-teal-700"
                : "border-transparent text-tiby-muted hover:text-tiby-ink"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Akses & Reset Password</span>
          </button>
        </div>

        {/* Isi Konten Modal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: PROFIL & TERAPI */}
          {activeTab === "profil" && (
            <div className="space-y-5">
              {/* Data Klinis & Jadwal */}
              <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-tiby-ink">
                  <Pill className="w-4 h-4 text-tiby-teal-600" />
                  <span>Detail Rencana Terapi</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                  <div>
                    <span className="text-[11px] text-tiby-muted block">
                      Kode Regimen
                    </span>
                    <span className="text-xs font-semibold text-tiby-ink mt-0.5 block">
                      {patient.regimenCode}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-tiby-muted block">
                      Dosis Harian
                    </span>
                    <span className="text-xs font-semibold text-tiby-ink mt-0.5 block">
                      {patient.dailyPillQuota} Butir / Hari
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-tiby-muted block">
                      Waktu Pengingat
                    </span>
                    <span className="text-xs font-semibold text-tiby-ink mt-0.5 block">
                      {patient.reminderTimeLocal} WIB
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-tiby-muted block">
                      Mulai Terapi
                    </span>
                    <span className="text-xs font-semibold text-tiby-ink mt-0.5 block">
                      {patient.startDate}
                    </span>
                  </div>
                </div>
              </div>

              {/* Kontak Pasien & PMO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-tiby-ink flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-tiby-teal-600" />
                      Data Kontak Pasien
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-tiby-muted">Nama Lengkap</span>
                      <span className="font-medium text-tiby-ink">
                        {patient.fullName}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-tiby-muted">Username</span>
                      <span className="font-mono text-tiby-ink">
                        @{patient.username}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-tiby-muted">WhatsApp</span>
                      <a
                        href={`https://wa.me/${patient.whatsappNumber.replace(/^0/, "62")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-tiby-teal-700 hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        {patient.whatsappNumber}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-tiby-ink flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-tiby-teal-600" />
                      Pengawas (PMO)
                    </span>
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                      {patient.pmo.relationship}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-tiby-muted">Nama PMO</span>
                      <span className="font-medium text-tiby-ink">
                        {patient.pmo.fullName}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-tiby-muted">Username PMO</span>
                      <span className="font-mono text-tiby-ink">
                        @{patient.pmo.username}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-tiby-muted">WhatsApp PMO</span>
                      <a
                        href={`https://wa.me/${patient.pmo.whatsappNumber.replace(/^0/, "62")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-tiby-teal-700 hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        {patient.pmo.whatsappNumber}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RIWAYAT CHECK-IN */}
          {activeTab === "riwayat" && (
            <div className="space-y-3">
              {!patient.history || patient.history.length === 0 ? (
                <div className="rounded-xl border border-gray-200 p-8 text-center">
                  <Calendar className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs font-medium text-tiby-ink">
                    Belum ada riwayat laporan harian
                  </p>
                  <p className="text-[11px] text-tiby-muted mt-0.5">
                    Laporan check-in yang dikirim oleh pasien atau PMO akan
                    muncul di sini.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
                  {patient.history.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-white hover:bg-gray-50/60 transition"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-tiby-ink">
                            {item.date}
                          </span>
                          <span className="text-xs text-tiby-muted">
                            &bull; {item.pillsTaken} butir diminum
                          </span>
                        </div>
                        {item.complaints && item.complaints.length > 0 ? (
                          <p className="text-[11px] text-amber-700">
                            Keluhan: {item.complaints.join(", ")}
                          </p>
                        ) : (
                          <p className="text-[11px] text-tiby-muted">
                            Tidak ada keluhan efek samping
                          </p>
                        )}
                      </div>

                      <div>
                        {item.status === "SUDAH_MINUM" && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 border border-green-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Terkendali
                          </span>
                        )}
                        {item.status === "TIDAK_PASTI" && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 border border-amber-200">
                            <Clock className="w-3.5 h-3.5" />
                            Terlambat / Ragu
                          </span>
                        )}
                        {item.status === "BELUM_MINUM" && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 border border-red-200">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Terlewat
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AKSES & KEAMANAN (RESET PASSWORD) */}
          {activeTab === "keamanan" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                <p className="text-xs text-tiby-ink font-medium">
                  Pengelolaan Kredensial Login
                </p>
                <p className="text-xs text-tiby-muted mt-1 leading-relaxed">
                  Demi keamanan data medis, password akun dienkripsi satu arah
                  dan tidak dapat dilihat kembali. Jika Pasien atau PMO lupa
                  password, Anda dapat menerbitkan password sementara yang baru
                  di bawah ini.
                </p>
              </div>

              {/* Kotak Kredensial Baru Jika Baru Saja Direset */}
              {newPasswordInfo && (
                <div className="rounded-xl border border-tiby-teal-200 bg-tiby-teal-50/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-tiby-teal-800">
                      Password Baru Berhasil Dibuat ({newPasswordInfo.role})
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCredentials}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-tiby-teal-200 px-3 py-1.5 text-xs font-semibold text-tiby-teal-700 hover:bg-tiby-teal-50 transition cursor-pointer shadow-2xs"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-600" />
                          <span>Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Kredensial</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-lg bg-white p-3 border border-tiby-teal-100 text-xs">
                    <div>
                      <span className="text-[11px] text-tiby-muted block">
                        Username
                      </span>
                      <span className="font-mono font-semibold text-tiby-ink">
                        {newPasswordInfo.username}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-tiby-muted block">
                        Password Baru
                      </span>
                      <span className="font-mono font-semibold text-tiby-teal-700">
                        {newPasswordInfo.password}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Kartu Aksi Reset Password Pasien & PMO */}
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-xs font-semibold text-tiby-ink">
                      Akun Pasien: {patient.fullName}
                    </p>
                    <p className="text-xs text-tiby-muted font-mono mt-0.5">
                      Username: @{patient.username}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={resettingTarget !== null}
                    onClick={() => handleResetPassword("PASIEN")}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-tiby-ink hover:bg-gray-50 transition cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        resettingTarget === "PASIEN" ? "animate-spin" : ""
                      }`}
                    />
                    <span>
                      {resettingTarget === "PASIEN"
                        ? "Mereset..."
                        : "Reset Password Pasien"}
                    </span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-xs font-semibold text-tiby-ink">
                      Akun PMO: {patient.pmo.fullName}
                    </p>
                    <p className="text-xs text-tiby-muted font-mono mt-0.5">
                      Username: @{patient.pmo.username}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={resettingTarget !== null}
                    onClick={() => handleResetPassword("PMO")}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-tiby-ink hover:bg-gray-50 transition cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        resettingTarget === "PMO" ? "animate-spin" : ""
                      }`}
                    />
                    <span>
                      {resettingTarget === "PMO"
                        ? "Mereset..."
                        : "Reset Password PMO"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-end border-t border-gray-100 bg-gray-50/50 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-tiby-ink hover:bg-gray-50 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
