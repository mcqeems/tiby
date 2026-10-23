import Image from "next/image"; // ✅ Import Image
import { CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";

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
  // ✅ Tambahkan path gambar maskot
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

  return (
    <div className="flex flex-col items-center justify-center py-10 space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ✅ Ganti Ikon Bulat dengan Maskot */}
      <div className="relative w-40 h-40">
        <Image
          src={config.mascot}
          alt={config.title}
          fill
          className="object-contain"
          priority
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Icon className={`w-6 h-6 ${config.color}`} />
          <h2 className={`font-heading text-2xl font-bold ${config.color}`}>
            {config.title}
          </h2>
        </div>
        <p className="text-sm text-tiby-muted max-w-sm mx-auto px-4 leading-relaxed">
          {message}
        </p>
      </div>

      {verdict === "TERKENDALI" && (
        <div className="bg-tiby-teal-50 px-6 py-3 rounded-full border border-tiby-teal-100 shadow-2xs">
          <p className="text-sm font-semibold text-tiby-teal-700 flex items-center gap-2">
            <span className="text-lg">🔥</span> {streak} Hari Berturut-turut
          </p>
        </div>
      )}
    </div>
  );
}
