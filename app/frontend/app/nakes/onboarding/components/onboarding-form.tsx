"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import OnboardingSuccessCard from "./onboarding-success-card";
import type {
  CreateOnboardingDto,
  OnboardingCredentials,
  PmoRelationship,
} from "@tiby/ts-shared";

type PmoMode = "baru" | "existing";

type ExistingUser = {
  id: string;
  username: string;
  name: string;
  role: string;
  facilityId?: string | null;
};

export default function OnboardingForm() {
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
  const [ocrMessage, setOcrMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] =
    useState<OnboardingCredentials | null>(null);

  // Fungsi fetch dipicu langsung saat tombol mode "existing" dipilih (Event-driven, bebas dari useEffect lint error)
  const handleSwitchToExistingPmo = async () => {
    setPmoMode("existing");
    if (existingUsers.length > 0) return; // Jangan fetch ulang jika sudah ada datanya

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
    setOcrMessage(null);
    setErrorMsg(null);

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
      setOcrMessage(
        `Data kartu berhasil diekstrak! (Akurasi: ${Math.round((draft.confidence || 0.8) * 100)}%)`,
      );
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Gagal membaca teks kartu pengobatan",
      );
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

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
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Gagal mendaftarkan rencana terapi pasien",
      );
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
      {createdCredentials && (
        <OnboardingSuccessCard
          credentials={createdCredentials}
          onReset={resetForm}
        />
      )}

      {/* OCR SCAN CARD UPLOAD OPTION */}
      <div className="rounded-3xl border border-dashed border-tiby-teal-100 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-heading text-sm font-600 text-tiby-ink">
              Scan / Unggah Kartu Pengobatan Pasien (OCR)
            </h3>
            <p className="text-xs text-tiby-muted mt-0.5">
              Unggah foto kartu pengobatan (TB-01) untuk mengisi otomatis nama,
              regimen, dan tanggal mulai.
            </p>
          </div>

          <label className="relative inline-flex items-center justify-center rounded-full bg-tiby-teal-50 border border-tiby-teal-100 px-4 py-2 text-xs font-semibold text-tiby-teal-700 hover:bg-tiby-teal-100/60 transition cursor-pointer shrink-0">
            {ocrLoading ? "Mengekstrak Foto..." : "Unggah Foto Kartu"}
            <input
              type="file"
              accept="image/*"
              onChange={handleOcrFile}
              disabled={ocrLoading}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
        </div>
        {ocrMessage && (
          <p className="mt-2 text-xs text-tiby-teal-700 font-medium">
            {ocrMessage}
          </p>
        )}
      </div>

      {errorMsg && (
        <div className="rounded-2xl border border-red-100 bg-tiby-danger p-3 text-xs text-tiby-danger-text flex justify-between">
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {!createdCredentials && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: DATA PASIEN */}
          <div className="rounded-3xl border border-tiby-teal-100 bg-white p-6 shadow-xs space-y-4">
            <div className="border-b border-tiby-teal-100/60 pb-2">
              <span className="text-[10px] font-bold text-tiby-teal-700 uppercase tracking-wider block">
                Langkah 1
              </span>
              <h3 className="font-heading text-base font-600 text-tiby-ink">
                Data Pribadi Pasien
              </h3>
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
              <span className="text-[10px] font-bold text-tiby-teal-700 uppercase tracking-wider block">
                Langkah 2
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-1">
                <h3 className="font-heading text-base font-600 text-tiby-ink">
                  Pengawas Menelan Obat (PMO)
                </h3>
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
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      pmoMode === "baru"
                        ? "bg-white text-tiby-teal-700 shadow-sm"
                        : "text-tiby-muted"
                    }`}
                  >
                    + Daftarkan Baru
                  </button>
                  <button
                    type="button"
                    onClick={handleSwitchToExistingPmo}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      pmoMode === "existing"
                        ? "bg-white text-tiby-teal-700 shadow-sm"
                        : "text-tiby-muted"
                    }`}
                  >
                    Pilih PMO Terdaftar
                  </button>
                </div>
              </div>
            </div>

            {pmoMode === "existing" && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={usersSearch}
                  onChange={(e) => setUsersSearch(e.target.value)}
                  placeholder="Cari nama atau username PMO..."
                  className="w-full rounded-xl border border-tiby-teal-100 px-3.5 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
                />
                {loadingUsers ? (
                  <p className="text-xs text-tiby-muted py-3 text-center">
                    Memuat daftar PMO...
                  </p>
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
                          <span className="text-xs font-bold">Dipilih</span>
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
            <div className="border-b border-tiby-teal-100/60 pb-2">
              <span className="text-[10px] font-bold text-tiby-teal-700 uppercase tracking-wider block">
                Langkah 3
              </span>
              <h3 className="font-heading text-base font-600 text-tiby-ink">
                Rencana Terapi Obat
              </h3>
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

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-tiby-teal-600 px-8 py-3 text-sm font-semibold text-white shadow-md hover:bg-tiby-teal-700 transition disabled:opacity-50 cursor-pointer"
            >
              {submitting
                ? "Menerbitkan Rencana Terapi..."
                : "Simpan & Terbitkan Akun"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
