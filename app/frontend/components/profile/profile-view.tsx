"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, type TibyUser } from "@/lib/auth-client";
import { usersApi, type UserItem } from "@/lib/api/users";
import { consentApi } from "@/lib/api/consent";
import { usePopup } from "@/components/ui/popup-provider";
import PublicLoading from "@/components/ui/public-loading";
import Dialog from "@/components/ui/dialog";
import PasswordForm from "@/components/profile/password-form";
import WhatsappConnectCard from "@/components/whatsapp/whatsapp-connect-card";
import PushToggleCard from "@/components/push/push-toggle-card";
import ThemeToggle from "@/components/theme/theme-toggle";
import FamilyContactsCard from "@/app/pasien/profile/components/family-contacts-card";
import {
  AtSign,
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  SunMoon,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  NAKES: "Tenaga Kesehatan",
  PMO: "PMO",
  PASIEN: "Pasien",
};

const roleLabel = (role?: string | null) =>
  (role && ROLE_LABEL[role.toUpperCase()]) || role || "-";

type ActionKey =
  | "theme"
  | "password"
  | "whatsapp"
  | "push"
  | "family"
  | "privacy";

interface ProfileAction {
  key: ActionKey;
  icon: LucideIcon;
  title: string;
  description: string;
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
          className={`truncate text-[13px] font-semibold text-tiby-ink ${mono ? "font-mono" : ""}`}
        >
          {value}
        </dd>
      </div>
    </div>
  );
}

export default function ProfileView() {
  const { data: session, isPending } = useSession();
  const { notify, confirm } = usePopup();

  const [me, setMe] = useState<UserItem | null>(null);
  const [activeDialog, setActiveDialog] = useState<ActionKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  const user = session?.user as TibyUser | undefined;
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const res = await usersApi.getMe();
        if (active) setMe(res);
      } catch {
        // The session still has enough to render the page.
      }
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [userId]);

  if (isPending) return <PublicLoading fullScreen message="Memuat profil..." />;

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

  const isPasien = user.role === "PASIEN";
  const hasWhatsapp = ["PASIEN", "PMO", "NAKES"].includes(user.role);

  const handleRevokeConsent = async () => {
    const isConfirmed = await confirm({
      variant: "danger",
      badgeText: "Peringatan Privasi",
      title: "Cabut Persetujuan Data?",
      description:
        "Jika dicabut, petugas dan PMO tidak bisa lagi memantau pengobatan Anda. Anda akan diarahkan kembali ke halaman persetujuan.",
      confirmLabel: "Ya, Cabut Izin",
      cancelLabel: "Batal",
    });

    if (!isConfirmed) return;

    try {
      setRevoking(true);
      await consentApi.revoke(
        "Dicabut mandiri oleh pengguna melalui halaman profil",
      );
      await notify({
        variant: "success",
        title: "Persetujuan Dicabut",
        description: "Anda telah mencabut izin berbagi data. Mengalihkan...",
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
      setRevoking(false);
    }
  };

  const actions: ProfileAction[] = [
    {
      key: "theme",
      icon: SunMoon,
      title: "Tampilan",
      description: "Terang, gelap, atau ikuti pengaturan perangkat.",
    },
    {
      key: "password",
      icon: KeyRound,
      title: "Keamanan Akun",
      description: "Perbarui kata sandi untuk masuk di sesi berikutnya.",
    },
  ];

  if (hasWhatsapp) {
    actions.push(
      {
        key: "whatsapp",
        icon: MessageCircle,
        title: "WhatsApp",
        description: me?.whatsappNumber
          ? `Nomor terdaftar: ${me.whatsappNumber}. Kelola verifikasi.`
          : "Hubungkan nomor untuk menerima pengingat dari Pandu.",
      },
      {
        key: "push",
        icon: Bell,
        title: "Notifikasi Push",
        description: "Atur pengingat dan pemberitahuan di perangkat ini.",
      },
    );
  }

  if (isPasien) {
    actions.push(
      {
        key: "family",
        icon: Users,
        title: "Kontak Darurat",
        description: "Kelola keluarga yang dihubungi jika Anda tidak melapor.",
      },
      {
        key: "privacy",
        icon: ShieldAlert,
        title: "Privasi & Data",
        description: "Lihat dan kelola izin berbagi data pengobatan Anda.",
      },
    );
  }

  const joined = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      })
    : "-";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-tiby-ink">
          Profil Saya
        </h1>
        <p className="mt-1 text-sm text-tiby-muted">
          Kelola informasi akun dan keamanan Anda.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        <div className="relative h-28 overflow-hidden bg-linear-to-r from-tiby-teal-600 to-tiby-teal-700">
          <span
            aria-hidden="true"
            className="absolute -right-8 -top-12 h-44 w-44 rounded-full bg-white/10"
          />
          <span
            aria-hidden="true"
            className="absolute -bottom-16 left-1/3 h-36 w-36 rounded-full bg-white/5"
          />
        </div>

        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end">
            <span className="relative z-10 flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-tiby-teal-50 font-heading text-3xl font-semibold uppercase text-tiby-teal-700 shadow-md ring-4 ring-white">
              {user.name?.charAt(0) || user.username?.charAt(0) || "?"}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-heading text-xl font-semibold text-tiby-ink">
                {user.name || user.username}
              </h2>
              <p className="font-mono text-sm text-tiby-muted">
                @{user.username}
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-tiby-teal-50 px-3 py-1 text-[11px] font-semibold text-tiby-teal-700 ring-1 ring-tiby-teal-100">
              <ShieldCheck className="h-3.5 w-3.5" />
              {roleLabel(user.role)}
            </span>
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InfoItem
              icon={AtSign}
              label="Username"
              value={user.username || "-"}
              mono
            />
            {user.email && (
              <InfoItem icon={Mail} label="Email" value={user.email} />
            )}
            <InfoItem
              icon={Building2}
              label="Faskes"
              value={me?.facility || "Belum terhubung"}
            />
            <InfoItem icon={CalendarDays} label="Bergabung" value={joined} />
          </dl>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        <header className="border-b border-gray-100 px-5 py-4 sm:px-6">
          <h2 className="font-heading text-base font-semibold text-tiby-ink">
            Pengaturan Akun
          </h2>
          <p className="mt-0.5 text-xs text-tiby-muted">
            Pilih pengaturan untuk melihat detail dan mengubahnya.
          </p>
        </header>

        <div className="divide-y divide-gray-100">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.key}
                type="button"
                onClick={() => setActiveDialog(action.key)}
                className="group flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-gray-50 sm:px-6"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tiby-teal-50 text-tiby-teal-700 ring-1 ring-tiby-teal-100">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-tiby-ink">
                    {action.title}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-tiby-muted">
                    {action.description}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-tiby-teal-600" />
              </button>
            );
          })}
        </div>
      </section>

      <Dialog
        open={activeDialog === "theme"}
        onClose={() => setActiveDialog(null)}
        title="Tampilan"
        description="Pilih tema aplikasi. Pengaturan tersimpan di perangkat ini."
        size="md"
      >
        <ThemeToggle />
      </Dialog>

      <Dialog
        open={activeDialog === "password"}
        onClose={() => setActiveDialog(null)}
        title="Keamanan Akun"
        description="Perbarui kata sandi akun Anda."
        size="md"
      >
        <PasswordForm onSuccess={() => setActiveDialog(null)} />
      </Dialog>

      {hasWhatsapp && (
        <Dialog
          open={activeDialog === "whatsapp"}
          onClose={() => setActiveDialog(null)}
          title="WhatsApp"
          description="Hubungkan nomor agar Pandu bisa mengirim pengingat dan pemberitahuan."
          size="md"
        >
          <WhatsappConnectCard bare />
        </Dialog>
      )}

      {hasWhatsapp && (
        <Dialog
          open={activeDialog === "push"}
          onClose={() => setActiveDialog(null)}
          title="Notifikasi Push"
          description="Atur pengingat di perangkat ini."
          size="md"
        >
          <PushToggleCard bare />
        </Dialog>
      )}

      {isPasien && (
        <Dialog
          open={activeDialog === "family"}
          onClose={() => setActiveDialog(null)}
          title="Kontak Darurat"
          description="Keluarga yang dihubungi sistem jika Anda tidak melapor."
          size="xl"
        >
          <FamilyContactsCard patientId={user.id} />
        </Dialog>
      )}

      {isPasien && (
        <Dialog
          open={activeDialog === "privacy"}
          onClose={() => setActiveDialog(null)}
          title="Privasi & Keamanan Data"
          description="Kelola izin berbagi data pengobatan Anda."
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-tiby-muted">
              Saat ini Anda telah memberikan izin kepada Fasilitas Kesehatan dan
              sistem Tiby untuk memproses data pendampingan. Jika Anda mencabut
              izin ini, fitur pendampingan akan dinonaktifkan dan data Anda
              tidak akan lagi terlihat oleh petugas.
            </p>
            <button
              type="button"
              onClick={handleRevokeConsent}
              disabled={revoking}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-6 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-70"
            >
              {revoking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldAlert className="h-4 w-4" />
              )}
              {revoking ? "Memproses..." : "Cabut Persetujuan Data"}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
