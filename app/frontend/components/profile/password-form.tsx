"use client";

import { useState } from "react";
import { errorMessage } from "@/lib/errors";
import { usersApi } from "@/lib/api/users";
import { Check, Eye, EyeOff, KeyRound, Loader2, Lock, ShieldCheck } from "lucide-react";

import { notify } from "@/lib/toast";
const inputCls =
  "peer h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-11 text-sm text-tiby-ink placeholder:text-gray-400 shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition hover:border-tiby-teal-200 focus:border-tiby-teal-600 focus:outline-none focus:ring-4 focus:ring-tiby-teal-600/10";

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

function Requirement({
  met,
  children,
}: {
  met: boolean;
  children: React.ReactNode;
}) {
  return (
    <li
      className={`inline-flex items-center gap-1.5 text-xs transition-colors ${met ? "font-semibold text-emerald-700" : "text-tiby-muted"}`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full transition-colors ${met ? "bg-emerald-500 text-white" : "bg-gray-200 text-transparent"}`}
      >
        <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
      </span>
      {children}
    </li>
  );
}

export default function PasswordForm({ onSuccess }: { onSuccess?: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(newPassword);
  const lengthOk = newPassword.length >= 8;
  const matchOk = confirmPassword !== "" && confirmPassword === newPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lengthOk) {
      return notify.warning("Password Terlalu Pendek", "Password baru minimal 8 karakter.");
    }
    if (!matchOk) {
      return notify.warning("Konfirmasi Tidak Cocok", "Pastikan konfirmasi password sama dengan password baru.");
    }

    try {
      setLoading(true);
      await usersApi.changePassword(currentPassword, newPassword);
      notify.success("Password Berhasil Diubah", "Gunakan password baru Anda untuk login di sesi berikutnya.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onSuccess?.();
    } catch (err: unknown) {
      notify.error("Gagal Mengubah Password", errorMessage(err, "Pastikan password lama Anda benar."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PasswordField
        id="current-password"
        label="Password Saat Ini"
        value={currentPassword}
        onChange={setCurrentPassword}
        placeholder="Masukkan password lama"
        autoComplete="current-password"
        visible={showPassword}
        onToggleVisible={() => setShowPassword((v) => !v)}
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
          onToggleVisible={() => setShowPassword((v) => !v)}
        />
        <PasswordField
          id="confirm-password"
          label="Konfirmasi Password Baru"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Ulangi password baru"
          autoComplete="new-password"
          visible={showPassword}
          onToggleVisible={() => setShowPassword((v) => !v)}
        />
      </div>

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
              className={`h-1.5 rounded-full transition-colors duration-300 ${strength.score >= step ? strength.bar : "bg-gray-200"}`}
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
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-tiby-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_6px_16px_-6px_rgba(13,148,136,0.6)] transition hover:-translate-y-0.5 hover:bg-tiby-teal-700 disabled:opacity-70 disabled:shadow-none"
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
  );
}
