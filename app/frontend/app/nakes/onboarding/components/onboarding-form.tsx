"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { usePopup } from "@/components/ui/popup-provider";
import PublicLoading from "@/components/ui/public-loading";
import OnboardingSuccessCard from "./onboarding-success-card";
import type {
  CreateOnboardingDto,
  OnboardingCredentials,
  PmoRelationship,
} from "@tiby/ts-shared";
import {
  Camera,
  UserPlus,
  Users,
  Search,
  Check,
  PhoneCall,
  Send,
  Pill,
  UserCheck,
} from "lucide-react";

type PmoMode = "baru" | "existing";

type ExistingUser = {
  id: string;
  username: string;
  name: string;
  role: string;
  facilityId?: string | null;
};

export default function OnboardingForm() {
  const { confirm, notify } = usePopup();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState<CreateOnboardingDto>({
    patient: { fullName: "", username: "", whatsappNumber: "" },
    pmo: {
      fullName: "",
      username: "",
      whatsappNumber: "",
      relationship: "KELUARGA" as PmoRelationship,
    },
    familyContact: {
      fullName: "",
      whatsappNumber: "",
      notifyOnEscalation: true,
    },
    regimenCode: "FDC-4",
    dailyPillQuota: 4,
    reminderTimeLocal: "08:00",
    timezone: "Asia/Jakarta",
    startDate: todayStr,
  });

  const [pmoMode, setPmoMode] = useState<PmoMode>("baru");
  const [existingUsers, setExistingUsers] = useState<ExistingUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedExistingPmo, setSelectedExistingPmo] =
    useState<ExistingUser | null>(null);
  const [usersSearch, setUsersSearch] = useState("");

  const [includeFamily, setIncludeFamily] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdCredentials, setCreatedCredentials] =
    useState<OnboardingCredentials | null>(null);

  const handleSwitchToExistingPmo = async () => {
    setPmoMode("existing");
    if (existingUsers.length > 0) return;

    setLoadingUsers(true);
    try {
      const users = await api.users.getAll();
      setExistingUsers(users.filter((u) => u.role === "PMO"));
    } catch {
      setExistingUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSelectExistingPmo = (user: ExistingUser) => {
    setSelectedExistingPmo(user);
    setForm((prev) => ({
      ...prev,
      pmo: {
        fullName: user.name,
        username: user.username,
        whatsappNumber: prev.pmo.whatsappNumber,
        relationship: prev.pmo.relationship,
      },
    }));
  };

  const handleOcrFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);

    try {
      const draft = await api.faskes.ocrExtract(file);
      setForm((prev) => ({
        ...prev,
        patient: {
          ...prev.patient,
          fullName: draft.patientName || prev.patient.fullName,
        },
        regimenCode: draft.regimenCode || prev.regimenCode,
        dailyPillQuota: draft.dailyPillQuota ?? prev.dailyPillQuota,
        startDate: draft.startDate || prev.startDate,
      }));

      await notify({
        variant: "success",
        badgeText: "Ekstraksi OCR",
        title: "Data Kartu Berhasil Dibaca",
        description: `Nama pasien, regimen (${draft.regimenCode || form.regimenCode}), dan dosis berhasil diisi otomatis oleh sistem.`,
        confirmLabel: "Lanjutkan",
      });
    } catch (err: unknown) {
      await notify({
        variant: "warning",
        badgeText: "Pindai Kartu",
        title: "Foto Tidak Terbaca Otomatis",
        description:
          err instanceof Error
            ? err.message
            : "Pastikan foto kartu pengobatan cukup terang, atau isi kolom formulir secara manual.",
        confirmLabel: "Isi Manual",
      });
    } finally {
      setOcrLoading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isConfirmed = await confirm({
      variant: "info",
      badgeText: "Verifikasi Data",
      title: `Terbitkan akun untuk ${form.patient.fullName}?`,
      description: `Sistem akan membuat akun Pasien (@${form.patient.username}) dan PMO (@${form.pmo.username}) dengan regimen ${form.regimenCode} (${form.dailyPillQuota} butir per hari).`,
      confirmLabel: "Ya, Terbitkan Akun",
      cancelLabel: "Periksa Kembali",
    });

    if (!isConfirmed) return;

    setSubmitting(true);

    try {
      const payload: CreateOnboardingDto = {
        ...form,
        familyContact:
          includeFamily && form.familyContact?.fullName
            ? form.familyContact
            : undefined,
      };
      const creds = await api.faskes.onboard(payload);
      setCreatedCredentials(creds);

      await notify({
        variant: "success",
        badgeText: "Selesai",
        title: "Akun dan Terapi Berhasil Dibuat",
        description:
          "Silakan salin informasi login sementara Pasien dan PMO pada kartu di layar sebelum meninggalkan halaman ini.",
        confirmLabel: "Lihat Kredensial",
      });
    } catch (err: unknown) {
      await notify({
        variant: "danger",
        badgeText: "Gagal",
        title: "Pendaftaran Tidak Berhasil",
        description:
          err instanceof Error
            ? err.message
            : "Terjadi kendala saat menerbitkan rencana terapi. Pastikan username belum pernah digunakan.",
        confirmLabel: "Tutup",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCreatedCredentials(null);
    setSelectedExistingPmo(null);
    setPmoMode("baru");
    setUsersSearch("");
    setForm({
      patient: { fullName: "", username: "", whatsappNumber: "" },
      pmo: {
        fullName: "",
        username: "",
        whatsappNumber: "",
        relationship: "KELUARGA",
      },
      familyContact: {
        fullName: "",
        whatsappNumber: "",
        notifyOnEscalation: true,
      },
      regimenCode: "FDC-4",
      dailyPillQuota: 4,
      reminderTimeLocal: "08:00",
      timezone: "Asia/Jakarta",
      startDate: todayStr,
    });
  };

  const filteredUsers = existingUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(usersSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(usersSearch.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {submitting && (
        <PublicLoading
          message="Menerbitkan akun dan rencana terapi pasien..."
          fullScreen
        />
      )}

      {createdCredentials && (
        <OnboardingSuccessCard
          credentials={createdCredentials}
          onReset={resetForm}
        />
      )}

      {/* OCR SCAN CARD UPLOAD OPTION */}
      {!createdCredentials && (
        <div className="rounded-3xl border border-dashed border-tiby-teal-100 bg-white p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-tiby-teal-50 text-tiby-teal-700">
                <Camera className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-heading text-sm font-semibold text-tiby-ink">
                  Pindai Kartu Pengobatan (OCR)
                </h3>
                <p className="text-xs text-tiby-muted mt-0.5">
                  Unggah foto kartu pengobatan pasien untuk mengisi formulir
                  secara otomatis.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center justify-center gap-2 rounded-full bg-tiby-teal-50 border border-tiby-teal-100 px-4 py-2 text-xs font-semibold text-tiby-teal-700 hover:bg-tiby-teal-100/60 transition cursor-pointer shrink-0">
              <Camera className="w-3.5 h-3.5" />
              <span>{ocrLoading ? "Mengekstrak..." : "Unggah Foto Kartu"}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleOcrFile}
                disabled={ocrLoading}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
          </div>
        </div>
      )}

      {!createdCredentials && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: DATA PASIEN */}
          <div className="rounded-3xl border border-tiby-teal-100 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-tiby-teal-100/60 pb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-tiby-teal-50 text-tiby-teal-700">
                <UserCheck className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[11px] font-semibold text-tiby-teal-700 block">
                  Langkah 1 dari 3
                </span>
                <h3 className="font-heading text-base font-semibold text-tiby-ink">
                  Informasi Pasien
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-tiby-ink mb-1">
                  Nama Lengkap Pasien *
                </label>
                <input
                  type="text"
                  required
                  value={form.patient.fullName}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      patient: { ...form.patient, fullName: e.target.value },
                    })
                  }
                  placeholder="cth: Budi Santoso"
                  className="w-full rounded-xl border border-tiby-teal-100 px-3.5 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-tiby-ink mb-1">
                  Username Pasien *
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={30}
                  value={form.patient.username}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      patient: { ...form.patient, username: e.target.value },
                    })
                  }
                  placeholder="cth: budisantoso"
                  className="w-full rounded-xl border border-tiby-teal-100 px-3.5 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-tiby-ink mb-1">
                  Nomor WhatsApp Pasien *
                </label>
                <input
                  type="tel"
                  required
                  value={form.patient.whatsappNumber}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      patient: {
                        ...form.patient,
                        whatsappNumber: e.target.value,
                      },
                    })
                  }
                  placeholder="cth: 08123456789"
                  className="w-full rounded-xl border border-tiby-teal-100 px-3.5 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: DATA PMO */}
          <div className="rounded-3xl border border-tiby-teal-100 bg-white p-6 shadow-xs space-y-4">
            <div className="border-b border-tiby-teal-100/60 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-tiby-teal-50 text-tiby-teal-700">
                    <Users className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="text-[11px] font-semibold text-tiby-teal-700 block">
                      Langkah 2 dari 3
                    </span>
                    <h3 className="font-heading text-base font-semibold text-tiby-ink">
                      Pengawas Menelan Obat (PMO)
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 rounded-xl bg-tiby-teal-50/70 border border-tiby-teal-100 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPmoMode("baru");
                      setSelectedExistingPmo(null);
                      setForm((prev) => ({
                        ...prev,
                        pmo: {
                          fullName: "",
                          username: "",
                          whatsappNumber: "",
                          relationship: prev.pmo.relationship,
                        },
                      }));
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      pmoMode === "baru"
                        ? "bg-white text-tiby-teal-700 shadow-sm"
                        : "text-tiby-muted"
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Buat Baru</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSwitchToExistingPmo}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      pmoMode === "existing"
                        ? "bg-white text-tiby-teal-700 shadow-sm"
                        : "text-tiby-muted"
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Pilih Terdaftar</span>
                  </button>
                </div>
              </div>
            </div>

            {pmoMode === "existing" && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-tiby-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={usersSearch}
                    onChange={(e) => setUsersSearch(e.target.value)}
                    placeholder="Cari nama atau username PMO..."
                    className="w-full rounded-xl border border-tiby-teal-100 pl-9 pr-3.5 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
                  />
                </div>
                {loadingUsers ? (
                  <PublicLoading message="Memuat daftar pengawas..." />
                ) : filteredUsers.length === 0 ? (
                  <p className="text-xs text-tiby-muted py-3 text-center">
                    Tidak ada PMO ditemukan.
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-tiby-teal-100 divide-y divide-tiby-teal-50">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectExistingPmo(user)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition cursor-pointer ${
                          selectedExistingPmo?.id === user.id
                            ? "bg-tiby-teal-50 text-tiby-teal-700"
                            : "bg-white hover:bg-gray-50"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-semibold">{user.name}</p>
                          <p className="text-[11px] text-tiby-muted font-mono">
                            @{user.username}
                          </p>
                        </div>
                        {selectedExistingPmo?.id === user.id && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold">
                            <Check className="w-3.5 h-3.5" />
                            <span>Dipilih</span>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-tiby-ink mb-1">
                  Nama Lengkap PMO *
                </label>
                <input
                  type="text"
                  required
                  value={form.pmo.fullName}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      pmo: { ...form.pmo, fullName: e.target.value },
                    })
                  }
                  placeholder="cth: Ratna Dewi"
                  readOnly={pmoMode === "existing" && !!selectedExistingPmo}
                  className="w-full rounded-xl border border-tiby-teal-100 px-3.5 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-tiby-ink mb-1">
                  Username PMO *
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={30}
                  value={form.pmo.username}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      pmo: { ...form.pmo, username: e.target.value },
                    })
                  }
                  placeholder="cth: ratnadewi"
                  readOnly={pmoMode === "existing" && !!selectedExistingPmo}
                  className="w-full rounded-xl border border-tiby-teal-100 px-3.5 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-tiby-ink mb-1">
                  WhatsApp PMO *
                </label>
                <input
                  type="tel"
                  required
                  value={form.pmo.whatsappNumber}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      pmo: { ...form.pmo, whatsappNumber: e.target.value },
                    })
                  }
                  placeholder="cth: 08812312345"
                  className="w-full rounded-xl border border-tiby-teal-100 px-3.5 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-tiby-ink mb-1">
                  Hubungan *
                </label>
                <select
                  value={form.pmo.relationship}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      pmo: {
                        ...form.pmo,
                        relationship: e.target.value as PmoRelationship,
                      },
                    })
                  }
                  className="w-full rounded-xl border border-tiby-teal-100 bg-white px-3 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
                >
                  <option value="KELUARGA">Keluarga</option>
                  <option value="KADER">Kader Kesehatan</option>
                  <option value="NAKES">Tenaga Kesehatan</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: RENCANA TERAPI */}
          <div className="rounded-3xl border border-tiby-teal-100 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-tiby-teal-100/60 pb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-tiby-teal-50 text-tiby-teal-700">
                <Pill className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[11px] font-semibold text-tiby-teal-700 block">
                  Langkah 3 dari 3
                </span>
                <h3 className="font-heading text-base font-semibold text-tiby-ink">
                  Rencana Terapi Obat
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-tiby-ink mb-1">
                  Regimen *
                </label>
                <input
                  type="text"
                  required
                  value={form.regimenCode}
                  onChange={(e) =>
                    setForm({ ...form, regimenCode: e.target.value })
                  }
                  placeholder="cth: FDC-4"
                  className="w-full rounded-xl border border-tiby-teal-100 px-3.5 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-tiby-ink mb-1">
                  Butir Harian *
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  required
                  value={form.dailyPillQuota}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      dailyPillQuota: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="w-full rounded-xl border border-tiby-teal-100 px-3.5 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-tiby-ink mb-1">
                  Jam Pengingat *
                </label>
                <input
                  type="time"
                  required
                  value={form.reminderTimeLocal}
                  onChange={(e) =>
                    setForm({ ...form, reminderTimeLocal: e.target.value })
                  }
                  className="w-full rounded-xl border border-tiby-teal-100 px-3.5 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-tiby-ink mb-1">
                  Tanggal Mulai *
                </label>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                  className="w-full rounded-xl border border-tiby-teal-100 px-3.5 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: KONTAK DARURAT OPSIONAL */}
          <div className="rounded-3xl border border-tiby-teal-100 bg-white p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-tiby-teal-50 text-tiby-teal-700">
                  <PhoneCall className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-heading text-sm font-semibold text-tiby-ink">
                    Kontak Darurat Tambahan (Opsional)
                  </h3>
                  <p className="text-xs text-tiby-muted">
                    Dihubungi otomatis oleh sistem jika pasien memerlukan
                    eskalasi darurat.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIncludeFamily(!includeFamily)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer shrink-0 ${
                  includeFamily
                    ? "bg-tiby-teal-600 text-white"
                    : "bg-white border border-tiby-teal-100 text-tiby-muted hover:text-tiby-ink"
                }`}
              >
                {includeFamily ? "Diaktifkan" : "+ Tambahkan"}
              </button>
            </div>

            {includeFamily && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-tiby-ink mb-1">
                    Nama Kontak Darurat
                  </label>
                  <input
                    type="text"
                    value={form.familyContact?.fullName || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        familyContact: {
                          fullName: e.target.value,
                          whatsappNumber:
                            form.familyContact?.whatsappNumber || "",
                          notifyOnEscalation: true,
                        },
                      })
                    }
                    placeholder="cth: Ibu Kandung"
                    className="w-full rounded-xl border border-tiby-teal-100 px-3.5 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-tiby-ink mb-1">
                    Nomor WhatsApp Darurat
                  </label>
                  <input
                    type="tel"
                    value={form.familyContact?.whatsappNumber || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        familyContact: {
                          fullName: form.familyContact?.fullName || "",
                          whatsappNumber: e.target.value,
                          notifyOnEscalation: true,
                        },
                      })
                    }
                    placeholder="cth: 08129876543"
                    className="w-full rounded-xl border border-tiby-teal-100 px-3.5 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-tiby-teal-600 px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-tiby-teal-700 transition disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Simpan & Terbitkan Akun</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
