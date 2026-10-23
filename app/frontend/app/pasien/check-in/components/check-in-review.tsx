import { useState } from "react";
import Image from "next/image"; // ✅ Import Image
import { ArrowRight, Edit3, CheckCircle2 } from "lucide-react";

interface CheckInReviewProps {
  transcript: string;
  onSubmit: (editedText: string) => void;
}

export default function CheckInReview({ transcript, onSubmit }: CheckInReviewProps) {
  const [text, setText] = useState(transcript);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="space-y-6">
      {/* ✅ Tambahkan Maskot Thinking */}
      <div className="flex flex-col items-center space-y-2">
        <div className="w-24 h-24 relative">
          <Image
            src="/mascot/thinking/thinking.webp"
            alt="Pandu berpikir"
            fill
            className="object-contain"
            priority
          />
        </div>
        <div className="text-center space-y-1">
          <h2 className="font-heading text-lg font-semibold text-tiby-ink">
            Konfirmasi Laporanmu
          </h2>
          <p className="text-xs text-tiby-muted">
            Pastikan transkripnya benar, lalu kirim. Pandu akan mengekstrak isi
            laporan di langkah berikutnya.
          </p>
        </div>
      </div>

      {/* Kotak Transkrip */}
      <div className="bg-tiby-teal-50 border border-tiby-teal-100 rounded-2xl p-5 space-y-4 shadow-2xs">
        {isEditing ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-32 p-3 text-sm rounded-xl border border-tiby-teal-200 focus:ring-2 focus:ring-tiby-teal-600 focus:outline-none bg-white text-tiby-ink"
            placeholder="Tulis laporanmu di sini..."
          />
        ) : (
          <p className="text-sm text-tiby-ink leading-relaxed italic">
            &quot;{text || "Tidak ada transkrip suara."}&quot;
          </p>
        )}

        <div className="flex justify-end">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs flex items-center gap-1.5 text-tiby-teal-700 font-semibold hover:text-tiby-teal-800 transition"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {isEditing ? "Simpan Perubahan" : "Ubah Teks"}
          </button>
        </div>
      </div>

      <button
        onClick={() => onSubmit(text)}
        className="w-full h-12 bg-tiby-teal-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-tiby-teal-700 transition shadow-md shadow-tiby-teal-600/20"
      >
        <CheckCircle2 className="w-5 h-5" /> Kirim Laporan
      </button>
    </div>
  );
}
