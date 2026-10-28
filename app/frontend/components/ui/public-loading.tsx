"use client";

import Mascot from "@/components/mascot";

interface PublicLoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export default function PublicLoading({
  message = "Sedang memuat data Tiby...",
  fullScreen = false,
}: PublicLoadingProps) {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="relative mb-4 flex items-center justify-center pt-2">
        <div className="absolute inset-0 rounded-full bg-radial from-tiby-teal-500/20 to-transparent blur-xl scale-125 pointer-events-none" />
        <div className="motion-safe:animate-float">
          <Mascot
            emotion="happy"
            size={80}
            altText="Maskot Pandu Memuat"
            priority
            className="relative drop-shadow-md motion-safe:animate-blink"
          />
        </div>
      </div>

      <h4 className="font-heading text-sm font-semibold text-tiby-ink">
        {message}
      </h4>
      <p className="mt-1 text-xs text-tiby-muted">
        Mohon tunggu sebentar, sistem sedang menyiapkan semuanya untuk Anda.
      </p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-xs">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full rounded-3xl border border-tiby-teal-100/60 bg-white p-8 shadow-xs flex items-center justify-center">
      {content}
    </div>
  );
}
