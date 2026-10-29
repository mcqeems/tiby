"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, ArrowUp, ArrowRight } from "lucide-react";
import Mascot from "@/components/mascot";
import { EASE, Reveal } from "./shared";

const PANDU_MESSAGES = [
  "Pelan-pelan saja, aku di sini.",
  "Satu langkah kecil hari ini sudah cukup.",
  "Kamu nggak sendirian di perjalanan ini.",
  "Sudah minum obat hari ini? Aku bangga sama kamu.",
];

function PanduBubble() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setI((v) => (v + 1) % PANDU_MESSAGES.length),
      4200,
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex items-end gap-3">
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative h-28 w-28 shrink-0"
      >
        <Mascot
          emotion="happy"
          fill
          altText="Pandu"
          className="drop-shadow-lg"
        />
      </motion.div>

      <div className="relative mb-6 min-h-[64px] flex-1 rounded-2xl rounded-bl-md border border-tiby-teal-100 bg-white px-4 py-3 shadow-sm">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="text-sm leading-relaxed text-tiby-ink"
          >
            {PANDU_MESSAGES[i]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

function BreathingPause() {
  const [inhale, setInhale] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setInhale((v) => !v), 4000);
    return () => clearInterval(t);
  }, []);

  const loop = { duration: 8, repeat: Infinity, ease: "easeInOut" as const };

  return (
    <div className="flex items-center gap-5">
      <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full bg-tiby-teal-500/20"
          animate={{ scale: [0.7, 1.15, 0.7] }}
          transition={loop}
        />
        <motion.span
          aria-hidden
          className="absolute inset-3 rounded-full bg-tiby-teal-100"
          animate={{ scale: [0.8, 1.1, 0.8] }}
          transition={loop}
        />
        <span className="relative h-5 w-5 rounded-full bg-tiby-teal-600" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-tiby-muted">
          Jeda sejenak
        </p>
        <div className="relative h-7 w-44">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={inhale ? "in" : "out"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 font-heading text-lg font-semibold text-tiby-ink"
            >
              {inhale ? "Tarik napas…" : "Hembuskan pelan…"}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="relative w-fit text-gray-500 transition-colors hover:text-tiby-teal-700 after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-0 after:bg-tiby-teal-600 after:transition-all after:duration-300 hover:after:w-full"
      >
        {children}
      </Link>
    </li>
  );
}

const PRIVACY_BADGES = [
  "Dilindungi UU PDP",
  "Notifikasi netral",
  "Rekaman suara dihapus setelah diproses",
];

export default function Footer() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    startTransition(() => {
      setCurrentYear(new Date().getFullYear());
    });
  }, []);

  return (
    <footer className="relative mt-10 overflow-hidden bg-gradient-to-b from-white via-tiby-teal-50/60 to-tiby-teal-50">
      <div className="mx-auto max-w-6xl px-6 pt-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-heading text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl">
              Jangan buru-buru pergi.{" "}
              <span className="text-tiby-teal-600">Kamu sudah sejauh ini.</span>
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-gray-500">
              Perjalanan sembuh itu maraton, bukan lari cepat. Tarik napas
              sebentar, lalu mulai dari langkah kecil bersama Pandu.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 rounded-full bg-tiby-teal-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-tiby-teal-900/10 transition-all hover:-translate-y-0.5 hover:bg-tiby-teal-700"
              >
                Masuk ke Tiby
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/login"
                className="px-4 py-3.5 text-sm font-semibold text-tiby-muted transition-colors hover:text-tiby-teal-700"
              >
                Sudah punya akun? Masuk
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap gap-2 text-xs font-medium text-tiby-teal-700">
              {PRIVACY_BADGES.map((t) => (
                <li
                  key={t}
                  className="flex items-center gap-1.5 rounded-full border border-tiby-teal-100 bg-white/70 px-3 py-1.5"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="space-y-6 rounded-[2rem] border border-white bg-white/70 p-6 shadow-[0_24px_60px_-30px_rgba(15,41,38,0.3)] backdrop-blur md:p-8">
              <PanduBubble />
              <div className="h-px bg-gradient-to-r from-transparent via-tiby-teal-100 to-transparent" />
              <BreathingPause />
            </div>
          </Reveal>
        </div>

        <div className="mt-20 grid grid-cols-2 gap-10 border-t border-tiby-teal-100/70 pt-12 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Image
              src="/logo/logo.png"
              alt="Tiby Logo"
              width={1024}
              height={448}
              sizes="100px"
              // Same file the navbar already preloads, so eager costs no request
              // and keeps Next's LCP check quiet about the shared src.
              loading="eager"
              className="mb-4 h-auto w-[100px] object-contain"
            />
            <p className="max-w-[16rem] text-xs leading-relaxed text-gray-500">
              Teman pengobatan yang selalu ada, tanpa membuatmu merasa dihakimi.
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-bold">Produk</h4>
            <ul className="space-y-2.5 text-xs">
              <FooterLink href="#fitur">Fitur</FooterLink>
              <FooterLink href="#faq">Keamanan</FooterLink>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-bold">Sumber Daya</h4>
            <ul className="space-y-2.5 text-xs">
              <FooterLink href="#">Edukasi Kemenkes</FooterLink>
              <FooterLink href="#">Blog Kesehatan</FooterLink>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-bold">Legal</h4>
            <ul className="space-y-2.5 text-xs">
              <FooterLink href="#">Kebijakan Privasi</FooterLink>
              <FooterLink href="#">Syarat Ketentuan</FooterLink>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-tiby-teal-100/70 py-6 text-xs text-gray-500 sm:flex-row">
          <p>&copy; {currentYear ?? "…"} Tim Argon</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="group inline-flex items-center gap-1.5 rounded-full border border-tiby-teal-100 bg-white px-3.5 py-1.5 font-semibold text-tiby-teal-700 transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            Kembali ke atas
            <ArrowUp className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none select-none overflow-hidden"
      >
        <motion.p
          initial={{ y: "40%", opacity: 0 }}
          whileInView={{ y: "14%", opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: EASE }}
          className="bg-gradient-to-b from-tiby-teal-100 to-transparent bg-clip-text text-center font-heading text-[28vw] font-bold leading-[0.8] tracking-tighter text-transparent md:text-[18rem]"
        >
          tiby
        </motion.p>
      </div>
    </footer>
  );
}
