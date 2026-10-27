import Image from "next/image";
import { CheckCircle2, AlertTriangle, ShieldAlert, Flame } from "lucide-react";

interface CheckInResultProps {
  verdict: string;
  message: string;
  streak: number;
}

export default function CheckInResult({
  verdict,
  message,
  streak,
}: CheckInResultProps) {
  const config =
    verdict === "TERKENDALI"
      ? {
          color: "text-emerald-600",
          mascot: "/mascot/happy/happy-stroke.png",
          icon: CheckCircle2,
          title: "Luar Biasa!",
        }
      : verdict === "PERLU_PERHATIAN"
        ? {
            color: "text-amber-600",
            mascot: "/mascot/empathy/empathy.png",
            icon: AlertTriangle,
            title: "Perlu Perhatian",
          }
        : {
            color: "text-red-600",
            mascot: "/mascot/alert/alert.png",
            icon: ShieldAlert,
            title: "Segera ke Faskes",
          };

  const Icon = config.icon;

  // Logika: Jika streak 1, artinya baru mulai atau baru reset. Ubah pesannya!
  let displayMessage = message;
  if (verdict === "TERKENDALI") {
    if (streak === 1) {
      displayMessage =
        "Api semangatmu baru saja dinyalakan kembali! Ayo jaga konsistensi minum obatmu besok ya.";
    } else {
      displayMessage = `Luar biasa! Kamu sudah konsisten selama ${streak} hari. Pertahankan semangatmu!`;
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-6 space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="relative w-40 h-40">
        <Image
          src={config.mascot}
          alt={config.title}
          fill
          className="object-contain drop-shadow-xl"
          priority
        />
      </div>

      <div className="space-y-3 px-4">
        <div className="flex items-center justify-center gap-2">
          <Icon className={`w-7 h-7 ${config.color}`} />
          <h2 className={`font-heading text-3xl font-bold ${config.color}`}>
            {config.title}
          </h2>
        </div>
        <p className="text-sm text-tiby-muted leading-relaxed max-w-sm mx-auto">
          {displayMessage}
        </p>
      </div>

      {verdict === "TERKENDALI" && (
        <div
          className={`px-6 py-3 rounded-2xl border ${streak === 1 ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-tiby-teal-50 border-tiby-teal-200 text-tiby-teal-700"} shadow-sm flex items-center gap-3`}
        >
          <Flame
            className={`w-6 h-6 ${streak === 1 ? "text-amber-500 fill-amber-500" : "text-orange-500 fill-orange-500"} animate-pulse`}
          />
          <div className="text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
              Streak Kamu
            </p>
            <p className="font-bold text-lg leading-none">{streak} Hari</p>
          </div>
        </div>
      )}
    </div>
  );
}
