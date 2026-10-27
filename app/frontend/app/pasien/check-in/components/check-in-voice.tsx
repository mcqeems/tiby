"use client";

import { useState } from "react";
import Image from "next/image";
import { Mic, Square } from "lucide-react";

interface CheckInVoiceProps {
  onStart: () => void;
  onStop: () => void;
  onFallback: () => void;
}

export default function CheckInVoice({
  onStart,
  onStop,
  onFallback,
}: CheckInVoiceProps) {
  const [isRecording, setIsRecording] = useState(false);

  const toggleRecord = () => {
    if (isRecording) {
      onStop();
    } else {
      onStart();
    }
    setIsRecording(!isRecording);
  };

  return (
    <div className="flex flex-col items-center justify-center py-10 space-y-8">
      <div className="relative">
        <div className="w-36 h-36 bg-tiby-teal-50 rounded-full flex items-center justify-center border-4 border-tiby-teal-100 shadow-sm overflow-hidden transition-all duration-300">
          <Image
            src={
              isRecording
                ? "/mascot/listening/listening-stroke.png"
                : "/mascot/idle/idle.png"
            }
            alt={isRecording ? "Pandu mendengarkan" : "Pandu menunggu"}
            width={140}
            height={140}
            className="object-contain w-full h-full p-2"
            priority
          />
        </div>
        {isRecording && (
          <span className="absolute -bottom-2 -right-2 flex h-6 w-6">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-6 w-6 bg-red-500 border-2 border-white"></span>
          </span>
        )}
      </div>

      <div className="text-center space-y-2">
        <h2 className="font-heading text-xl font-bold text-tiby-ink">
          {isRecording
            ? "Pandu sedang mendengarkan..."
            : "Bagaimana perasaanmu hari ini?"}
        </h2>
        <p className="text-sm text-tiby-muted max-w-xs mx-auto">
          {isRecording
            ? "Silakan ceritakan obat yang sudah diminum atau keluhanmu."
            : "Tekan tombol di bawah dan mulailah berbicara dengan santai."}
        </p>
      </div>

      <button
        onClick={toggleRecord}
        aria-label={isRecording ? "Berhenti merekam" : "Mulai merekam"}
        className={`w-24 h-24 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-300 ${
          isRecording
            ? "bg-red-500 animate-pulse ring-4 ring-red-200"
            : "bg-tiby-teal-600 hover:bg-tiby-teal-700 hover:scale-105"
        }`}
      >
        {isRecording ? (
          <Square className="w-8 h-8 fill-current" />
        ) : (
          <Mic className="w-10 h-10" />
        )}
      </button>

      <button
        onClick={onFallback}
        className="text-xs font-semibold text-tiby-muted hover:text-tiby-teal-700 underline underline-offset-4 transition"
      >
        Suara tidak jelas? Gunakan tombol manual
      </button>
    </div>
  );
}
