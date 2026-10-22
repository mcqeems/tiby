"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, type TibyUser } from "@/lib/auth-client";
import { usersApi } from "@/lib/api/users";
import { usePopup } from "@/components/ui/popup-provider";
import PublicLoading from "@/components/ui/public-loading";
import {
  AtSign,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";


const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  NAKES: "Tenaga Kesehatan",
  PMO: "PMO",
  PASIEN: "Pasien",
  PATIENT: "Pasien",
};

const roleLabel = (role?: string | null) =>
  (role && ROLE_LABEL[role.toUpperCase()]) || role || "-";

const inputCls =
  "peer h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-11 text-sm text-tiby-ink placeholder:text-gray-400 shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition hover:border-tiby-teal-200 focus:border-tiby-teal-600 focus:outline-none focus:ring-4 focus:ring-tiby-teal-600/10";

/** Hanya indikator visual; aturan validasi sebenarnya tetap di handleChangePassword. */
function getPasswordStrength(pw: string) {
  if (!pw) return { score: 0, label: "", bar: "bg-gray-200", text: "" };

  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score += 1;
  if (pw.length < 8) score = Math.min(score, 1);

  const levels = [
    { label: "Lemah", bar: "bg-red-500", text: "text-red-600" },
    { label: "Lemah", bar: "bg-red-500", text: "text-red-600" },
    { label: "Cukup", bar: "bg-amber-500", text: "text-amber-700" },
    { label: "Baik", bar: "bg-tiby-teal-600", text: "text-tiby-teal-700" },
    { label: "Kuat", bar: "bg-emerald-500", text: "text-emerald-700" },
  ];
  return { score, ...levels[score] };
}

function InfoItem({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-tiby-teal-700 shadow-2xs ring-1 ring-gray-200">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-[10px] font-semibold uppercase tracking-wider text-tiby-muted">
          {label}
        </dt>
        <dd
          className={`truncate text-[13px] font-semibold text-tiby-ink ${
            mono ? "font-mono" : ""
          }`}
        >
          {value}
        </dd>
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  visible,
  onToggleVisible,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  visible: boolean;
  onToggleVisible: () => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold text-tiby-ink"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={inputCls}
        />
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors peer-focus:text-tiby-teal-600" />
        <button
          type="button"
          onClick={onToggleVisible}
          aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-tiby-ink"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function Requirement({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li
      className={`inline-flex items-center gap-1.5 text-xs transition-colors ${
        met ? "font-semibold text-emerald-700" : "text-tiby-muted"
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full transition-colors ${
          met ? "bg-emerald-500 text-white" : "bg-gray-200 text-transparent"
        }`}
      >
        <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
      </span>
      {children}
    </li>
  );
}


export default function ProfileView() {
  const { data: session, isPending } = useSession();
  const { notify } = usePopup();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (isPending) return <PublicLoading fullScreen message="Memuat profil..." />;

  const user = session?.user as TibyUser | undefined;

  if (!user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
          <Lock className="h-5 w-5" />
        </span>
        <p className="mt-4 text-sm font-semibold text-tiby-ink">
          Sesi tidak ditemukan. Silakan login kembali.
        </p>
        <Link
          href="/login"
          className="mt-5 rounded-xl bg-tiby-teal-600 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-tiby-teal-700"
        >
          Ke Halaman Login
        </Link>
      </div>
    );
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      return notify({
        variant: "warning",
        title: "Password Terlalu Pendek",
        description: "Password baru minimal 8 karakter.",
        confirmLabel: "Mengerti",
      });
    }

    if (newPassword !== confirmPassword) {
      return notify({
        variant: "warning",
        title: "Konfirmasi Tidak Cocok",
        description: "Pastikan konfirmasi password sama dengan password baru.",
        confirmLabel: "Mengerti",
      });
    }

    try {
      setLoading(true);
      await usersApi.changePassword(currentPassword, newPassword);

      await notify({
        variant: "success",
        badgeText: "Keamanan Akun",
        title: "Password Berhasil Diubah",
        description:
          "Gunakan password baru Anda untuk login di sesi berikutnya.",
        confirmLabel: "Tutup",
      });

      // Reset form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      await notify({
        variant: "danger",
        badgeText: "Gagal",
        title: "Gagal Mengubah Password",
        description:
          err instanceof Error
            ? err.message
            : "Pastikan password lama Anda benar.",
        confirmLabel: "Tutup",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleVisible = () => setShowPassword(!showPassword);
  const strength = getPasswordStrength(newPassword);
  const lengthOk = newPassword.length >= 8;
  const matchOk = confirmPassword !== "" && confirmPassword === newPassword;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-24 md:pb-10">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-tiby-ink">
          Profil Saya
        </h1>
        <p className="mt-1 text-sm text-tiby-muted">
          Kelola informasi akun dan keamanan Anda.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        <div className="relative h-28 overflow-hidden bg-linear-to-r from-tiby-teal-600 to-tiby-teal-700 sm:h-32">
          <span
            aria-hidden="true"
            className="absolute -right-8 -top-12 h-44 w-44 rounded-full bg-white/10"
          />
          <span
            aria-hidden="true"
            className="absolute -bottom-16 left-1/3 h-36 w-36 rounded-full bg-white/5"
          />
        </div>

        <div className="px-6 pb-6 sm:px-8 sm:pb-8">
          <div className="-mt-12 flex flex-col items-center gap-4 sm:-mt-14 sm:flex-row sm:items-end">
            <span className="relative z-10 flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-tiby-teal-50 font-heading text-3xl font-semibold uppercase text-tiby-teal-700 shadow-md ring-4 ring-white sm:h-28 sm:w-28 sm:text-4xl">
              {user.name?.charAt(0) || user.username?.charAt(0) || "?"}
            </span>
            <div className="min-w-0 text-center sm:pb-1 sm:text-left">
              <h2 className="truncate font-heading text-xl font-semibold text-tiby-ink">
                {user.name || user.username}
              </h2>
              <p className="font-mono text-sm text-tiby-muted">
                @{user.username}
              </p>
            </div>
          </div>

          <dl
            className={`mt-6 grid gap-3 ${
              user.email ? "sm:grid-cols-3" : "sm:grid-cols-2"
            }`}
          >
            <InfoItem
              icon={AtSign}
              label="Username"
              value={user.username || "-"}
              mono
            />
            <InfoItem
              icon={ShieldCheck}
              label="Peran"
              value={roleLabel(user.role)}
            />
            {user.email && (
              <InfoItem icon={Mail} label="Email" value={user.email} />
            )}
          </dl>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        <header className="flex items-center gap-3 border-b border-gray-100 bg-linear-to-r from-tiby-teal-50/70 to-white px-6 py-4 sm:px-8">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-tiby-teal-700 shadow-sm ring-1 ring-tiby-teal-100">
            <KeyRound className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h3 className="font-heading text-base font-semibold leading-tight text-tiby-ink">
              Ubah Password
            </h3>
            <p className="mt-0.5 text-xs text-tiby-muted">
              Gunakan password baru untuk login di sesi berikutnya.
            </p>
          </div>
        </header>

        <form
          onSubmit={handleChangePassword}
          className="space-y-5 p-6 sm:p-8"
        >
          <PasswordField
            id="current-password"
            label="Password Saat Ini"
            value={currentPassword}
            onChange={setCurrentPassword}
            placeholder="Masukkan password lama"
            autoComplete="current-password"
            visible={showPassword}
            onToggleVisible={toggleVisible}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <PasswordField
              id="new-password"
              label="Password Baru"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Minimal 8 karakter"
              autoComplete="new-password"
              visible={showPassword}
              onToggleVisible={toggleVisible}
            />
            <PasswordField
              id="confirm-password"
              label="Konfirmasi Password Baru"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Ulangi password baru"
              autoComplete="new-password"
              visible={showPassword}
              onToggleVisible={toggleVisible}
            />
          </div>

          {/* Kekuatan password + syarat */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-tiby-muted">
                Kekuatan password
              </span>
              <span
                aria-live="polite"
                className={`text-xs font-semibold ${strength.text}`}
              >
                {strength.label || "-"}
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-4 gap-1.5" aria-hidden="true">
              {[1, 2, 3, 4].map((step) => (
                <span
                  key={step}
                  className={`h-1.5 rounded-full transition-colors duration-300 ${
                    strength.score >= step ? strength.bar : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            <ul className="mt-3.5 flex flex-wrap gap-x-5 gap-y-1.5">
              <Requirement met={lengthOk}>Minimal 8 karakter</Requirement>
              <Requirement met={matchOk}>Konfirmasi cocok</Requirement>
            </ul>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-xs text-tiby-muted">
              <ShieldCheck className="h-4 w-4 shrink-0 text-tiby-teal-600" />
              Pastikan password lama Anda benar.
            </p>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-tiby-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_6px_16px_-6px_rgba(13,148,136,0.6)] transition hover:-translate-y-0.5 hover:bg-tiby-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiby-teal-600 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {loading ? "Menyimpan..." : "Simpan Password Baru"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}