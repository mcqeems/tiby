"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { whatsappApi } from "@/lib/api/whatsapp";
import type {
  WhatsappConnectChallenge,
  WhatsappConnectionStatus,
} from "@tiby/ts-shared";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

interface WhatsappConnectCardProps {
  familyContactId?: string;
  /** Number stored on the family contact; prefilled and locked. */
  defaultPhoneNumber?: string;
  title?: string;
  description?: string;
  onVerified?: () => void;
  /** Render only the controls, without the card chrome (for dialogs). */
  bare?: boolean;
}

function formatRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function WhatsappConnectCard({
  familyContactId,
  defaultPhoneNumber,
  title = "WhatsApp",
  description = "Hubungkan nomor untuk menerima pengingat dan pemberitahuan dari Pandu.",
  onVerified,
  bare = false,
}: WhatsappConnectCardProps) {
  const isFamilyContact = Boolean(familyContactId);
  const [status, setStatus] = useState<WhatsappConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState(defaultPhoneNumber ?? "");
  const [challenge, setChallenge] = useState<WhatsappConnectChallenge | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verifiedCallback = useRef(onVerified);

  useEffect(() => {
    verifiedCallback.current = onVerified;
  }, [onVerified]);

  const loadStatus = useCallback(async () => {
    try {
      const res = await whatsappApi.getStatus(familyContactId);
      setStatus(res);
      if (res.phoneNumber) {
        setPhone((prev) => prev || res.phoneNumber!);
      }
      if (res.verified) {
        setChallenge(null);
      } else if (res.pendingCode && res.expiresAt) {
        // The status endpoint already knows about a code created before this
        // mount (modal reopened, page reloaded). Show it instead of losing it.
        setChallenge((prev) =>
          prev ?? {
            verificationCode: res.pendingCode!,
            botPhoneNumber: "",
            wahaDeepLink: "",
            expiresAt: res.expiresAt!,
          },
        );
        setRemaining(
          Math.max(
            0,
            Math.floor((Date.parse(res.expiresAt) - Date.now()) / 1000),
          ),
        );
      }
      return res;
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat status WhatsApp.",
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [familyContactId]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (!active) return;
      setLoading(true);
      setError(null);
      setStatus(null);
      setChallenge(null);
      loadStatus().then((res) => {
        if (!active) return;
        if (res?.verified) setChanging(false);
      });
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [loadStatus]);

  // Countdown while a code is on screen.
  useEffect(() => {
    if (!challenge) return;
    const expires = Date.parse(challenge.expiresAt);
    const timer = setInterval(() => {
      const left = Math.max(0, Math.floor((expires - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setChallenge(null);
        setStatus((prev) =>
          prev ? { ...prev, pendingCode: null, expiresAt: null } : prev,
        );
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [challenge]);

  // Poll until the phone sends the code.
  useEffect(() => {
    if (!challenge) return;
    let active = true;
    const timer = setInterval(async () => {
      try {
        const res = await whatsappApi.getStatus(familyContactId);
        if (!active) return;
        if (res.verified) {
          setStatus(res);
          setChallenge(null);
          setChanging(false);
          verifiedCallback.current?.();
        }
      } catch {
        // keep polling; a transient failure should not kill the flow
      }
    }, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [challenge, familyContactId]);

  const requestCode = async () => {
    setError(null);

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8) {
      setError("Nomor WhatsApp minimal 8 digit.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await whatsappApi.connect({
        phoneNumber: digits,
        ...(familyContactId ? { familyContactId } : {}),
      });
      setChallenge(res);
      setRemaining(
        Math.max(0, Math.floor((Date.parse(res.expiresAt) - Date.now()) / 1000)),
      );
      setCopied(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Gagal membuat kode verifikasi.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    void requestCode();
  };

  const copyCode = async () => {
    if (!challenge) return;
    try {
      await navigator.clipboard.writeText(challenge.verificationCode);
      setCopied(true);
    } catch {
      setError("Gagal menyalin. Salin kode secara manual.");
    }
  };

  const verified = Boolean(status?.verified) && !changing;

  return (
    <section
      className={
        bare
          ? ""
          : "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs"
      }
    >
      {!bare && (
        <header className="flex items-center gap-3 border-b border-gray-100 bg-linear-to-r from-tiby-teal-50/70 to-white px-6 py-4 sm:px-8">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-tiby-teal-700 shadow-sm ring-1 ring-tiby-teal-100">
            <MessageCircle className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-heading text-base font-semibold leading-tight text-tiby-ink">
              {title}
            </h3>
            <p className="mt-0.5 text-xs text-tiby-muted">{description}</p>
          </div>
        </header>
      )}

      <div className={bare ? "space-y-4" : "space-y-4 p-6 sm:p-8"}>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-tiby-teal-600" />
          </div>
        ) : verified ? (
          <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-emerald-600 ring-1 ring-emerald-200">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  Terhubung
                </p>
                <p className="text-xs text-emerald-700">
                  {status?.phoneNumber || "-"}
                  {status?.verifiedAt
                    ? ` · ${new Date(status.verifiedAt).toLocaleDateString("id-ID")}`
                    : ""}
                </p>
              </div>
            </div>
            {!isFamilyContact && (
              <button
                type="button"
                onClick={() => setChanging(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Ganti nomor
              </button>
            )}
          </div>
        ) : challenge ? (
          <div className="space-y-4">
            <p className="text-sm text-tiby-muted">
              Kirim kode ini dari nomor WhatsApp Anda ke bot Tiby:
            </p>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-tiby-teal-200 bg-tiby-teal-50/60 px-4 py-3">
              <span className="font-mono text-2xl font-bold tracking-[0.25em] text-tiby-teal-800">
                {challenge.verificationCode}
              </span>
              <button
                type="button"
                onClick={copyCode}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-tiby-teal-700 ring-1 ring-tiby-teal-200 hover:bg-tiby-teal-50"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Tersalin" : "Salin"}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {challenge.wahaDeepLink ? (
                <a
                  href={challenge.wahaDeepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-tiby-teal-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-tiby-teal-700"
                >
                  <ExternalLink className="h-4 w-4" />
                  Buka WhatsApp
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => void requestCode()}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl border border-tiby-teal-200 bg-white px-4 py-2.5 text-xs font-semibold text-tiby-teal-700 hover:bg-tiby-teal-50 disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? "Membuat kode…" : "Buat kode baru"}
                </button>
              )}
              <span className="text-xs text-tiby-muted">
                Kedaluwarsa dalam{" "}
                <span className="font-mono font-semibold text-tiby-ink">
                  {formatRemaining(remaining)}
                </span>
              </span>
            </div>

            <p className="text-[11px] text-tiby-muted">
              {challenge.botPhoneNumber
                ? `Bot: ${challenge.botPhoneNumber} · `
                : ""}
              Nomor: {phone} · Menunggu verifikasi… halaman ini akan
              diperbarui otomatis.
            </p>
          </div>
        ) : (
          <form onSubmit={handleConnect} className="space-y-3">
            {status?.pendingCode && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                Masih ada kode sebelumnya. Membuat kode baru akan menggantikannya.
              </p>
            )}
            <div>
              <label
                htmlFor="whatsapp-phone"
                className="mb-1.5 block text-xs font-semibold text-tiby-ink"
              >
                Nomor WhatsApp
              </label>
              <input
                id="whatsapp-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                readOnly={isFamilyContact}
                placeholder="08xxxxxxxxxx"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-tiby-ink placeholder:text-gray-400 focus:border-tiby-teal-600 focus:outline-none focus:ring-4 focus:ring-tiby-teal-600/10 read-only:bg-gray-50 read-only:text-tiby-muted"
              />
              <p className="mt-1 text-[11px] text-tiby-muted">
                {isFamilyContact
                  ? "Nomor ini terikat pada kontak darurat. Ubah lewat kontak jika perlu."
                  : "Gunakan nomor yang bisa membuka WhatsApp. Format 08…, 8…, atau +62…."}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-tiby-teal-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-tiby-teal-700 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Membuat kode…" : "Dapatkan kode verifikasi"}
              </button>
              {changing && (
                <button
                  type="button"
                  onClick={() => {
                    setChanging(false);
                    setPhone("");
                  }}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-tiby-muted hover:bg-gray-50"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
