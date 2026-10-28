"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { banner } from "@/lib/motion";
import { usersApi } from "@/lib/api/users";

export default function ChangePasswordForm() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (form.newPassword !== form.confirmPassword) {
      setErrorMsg("Konfirmasi password baru tidak cocok.");
      return;
    }

    if (form.newPassword.length < 8) {
      setErrorMsg("Password baru minimal 8 karakter.");
      return;
    }

    setLoading(true);
    try {
      const res = await usersApi.changePassword(form.currentPassword, form.newPassword);
      setSuccessMsg(res.message || "Password berhasil diubah.");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal mengubah password. Periksa password lama Anda.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-tiby-teal-100 bg-white p-6 shadow-xs space-y-4">
      <div className="border-b border-tiby-teal-100/60 pb-2">
        <h3 className="font-heading text-base font-600 text-tiby-ink">Ganti Password</h3>
        <p className="text-xs text-tiby-muted mt-0.5">
          Gunakan password kuat yang mudah kamu ingat. Minimal 8 karakter.
        </p>
      </div>

      <AnimatePresence initial={false}>
        {successMsg && (
          <motion.div
            variants={banner}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="rounded-2xl border border-teal-100 bg-tiby-teal-50 px-4 py-3 text-xs text-tiby-teal-700 flex justify-between items-center"
          >
            <span>✓ {successMsg}</span>
            <button
              type="button"
              onClick={() => setSuccessMsg(null)}
              className="ml-2 font-bold cursor-pointer"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {errorMsg && (
          <motion.div
            variants={banner}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="rounded-2xl border border-red-100 bg-tiby-danger px-4 py-3 text-xs text-tiby-danger-text flex justify-between items-center"
          >
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="ml-2 font-bold cursor-pointer"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Password Lama */}
        <div>
          <label className="block text-xs font-medium text-tiby-ink mb-1">
            Password Saat Ini *
          </label>
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              required
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              placeholder="Masukkan password saat ini"
              autoComplete="current-password"
              className="w-full rounded-xl border border-tiby-teal-100 px-3.5 pr-10 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-tiby-muted hover:text-tiby-teal-700 cursor-pointer"
              aria-label={showCurrent ? "Sembunyikan" : "Tampilkan"}
            >
              {showCurrent ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
          <p className="mt-1 text-[10px] text-tiby-muted">
            Gunakan password sementara yang diberikan oleh petugas saat pertama kali daftar.
          </p>
        </div>

        {/* Password Baru */}
        <div>
          <label className="block text-xs font-medium text-tiby-ink mb-1">
            Password Baru *
          </label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              required
              minLength={8}
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              placeholder="Minimal 8 karakter"
              autoComplete="new-password"
              className="w-full rounded-xl border border-tiby-teal-100 px-3.5 pr-10 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-tiby-muted hover:text-tiby-teal-700 cursor-pointer"
              aria-label={showNew ? "Sembunyikan" : "Tampilkan"}
            >
              {showNew ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Konfirmasi Password Baru */}
        <div>
          <label className="block text-xs font-medium text-tiby-ink mb-1">
            Konfirmasi Password Baru *
          </label>
          <input
            type="password"
            required
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            placeholder="Ulangi password baru"
            autoComplete="new-password"
            className={`w-full rounded-xl border px-3.5 py-2 text-xs text-tiby-ink focus:outline-none focus:ring-2 focus:ring-tiby-teal-600 ${
              form.confirmPassword && form.confirmPassword !== form.newPassword
                ? "border-red-200 bg-red-50/30"
                : "border-tiby-teal-100"
            }`}
          />
          {form.confirmPassword && form.confirmPassword !== form.newPassword && (
            <p className="mt-1 text-[10px] text-red-600">Password tidak cocok.</p>
          )}
        </div>

        <div className="pt-1 flex justify-end">
          <button
            type="submit"
            disabled={loading || (!!form.confirmPassword && form.confirmPassword !== form.newPassword)}
            className="rounded-full bg-tiby-teal-600 px-6 py-2 text-xs font-semibold text-white shadow-sm hover:bg-tiby-teal-700 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Menyimpan..." : "Simpan Password Baru"}
          </button>
        </div>
      </form>
    </div>
  );
}
