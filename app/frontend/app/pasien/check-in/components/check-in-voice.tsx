"use client";

import { useState } from "react";
import { Mic, Square } from "lucide-react";
import Mascot from "@/components/mascot";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from "motion/react";

interface CheckInVoiceProps {
  onStart: () => Promise<boolean>;
  onStop: () => void;
  onFallback: () => void;
}

/** Elemen halaman muncul berurutan saat pertama kali tampil */
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 22 },
  },
};

const BAR_DURATIONS = [0.9, 0.65, 1.1, 0.75, 1.0, 0.7, 0.95];

export default function CheckInVoice({
  onStart,
  onStop,
  onFallback,
}: CheckInVoiceProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const reduceMotion = useReducedMotion();

  const toggleRecord = async () => {
    if (isRecording) {
      onStop();
      setIsRecording(false);
      return;
    }

    if (isStarting) return;
    setIsStarting(true);
    try {
      const started = await onStart();
      setIsRecording(started);
    } finally {
      setIsStarting(false);
    }
  };

  const glow = isRecording ? "239,68,68" : "13,148,136";
  const baseShadow = "0 8px 20px -4px rgba(0,0,0,0.2)";

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col items-center justify-center py-10 space-y-8"
    >
      {/* ---------- Maskot ---------- */}
      <motion.div variants={item} className="relative">
        {/* Gelombang suara yang menyebar saat merekam */}
        <AnimatePresence>
          {isRecording &&
            !reduceMotion &&
            [0, 1, 2].map((i) => (
              <motion.span
                key={i}
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full border-2 border-tiby-teal-400"
                initial={{ opacity: 0, scale: 1 }}
                animate={{ opacity: [0.55, 0], scale: [1, 1.8] }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                transition={{
                  duration: 2.1,
                  repeat: Infinity,
                  ease: "easeOut",
                  // Phase offset between the looping rings, not a stagger.
                  delay: i * 0.7,
                }}
              />
            ))}
        </AnimatePresence>

        {/* Maskot bernapas (idle) atau berdenyut (merekam) */}
        <motion.div
          animate={
            reduceMotion
              ? undefined
              : isRecording
                ? { y: 0, scale: [1, 1.05, 1] }
                : { y: [0, -6, 0], scale: 1 }
          }
          transition={{
            duration: isRecording ? 1.3 : 3.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative w-36 h-36 bg-tiby-teal-50 rounded-full flex items-center justify-center border-4 border-tiby-teal-100 shadow-sm overflow-hidden"
        >
          {/* Ganti gambar maskot dengan transisi pop */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isRecording ? "listening" : "idle"}
              initial={{ opacity: 0, scale: 0.75, rotate: -8 }}
              animate={{
                opacity: 1,
                scale: 1,
                rotate: 0,
                transition: { type: "spring", stiffness: 320, damping: 18 },
              }}
              exit={{
                opacity: 0,
                scale: 0.85,
                transition: { duration: 0.15 },
              }}
              className="w-full h-full"
            >
              <div className="h-full w-full p-2">
                <Mascot
                  animated
                  emotion={isRecording ? "listening" : "idle"}
                  fill
                  altText={isRecording ? "Pandu mendengarkan" : "Pandu menunggu"}
                  preload
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Titik merah REC */}
        <AnimatePresence>
          {isRecording && (
            <motion.span
              className="absolute -bottom-2 -right-2 flex h-6 w-6"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 16 }}
            >
              {!reduceMotion && (
                <motion.span
                  className="absolute inline-flex h-full w-full rounded-full bg-red-400"
                  animate={{ scale: [1, 2], opacity: [0.7, 0] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                />
              )}
              <span className="relative inline-flex rounded-full h-6 w-6 bg-red-500 border-2 border-white" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div variants={item} className="text-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={isRecording ? "rec" : "idle"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="space-y-2"
          >
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
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <motion.div
        variants={item}
        aria-hidden
        className="flex items-center justify-center"
      >
        <AnimatePresence>
          {isRecording && (
            <motion.div
              className="flex h-full items-center gap-1"
              initial={{ opacity: 0, scaleY: 0.4 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.4 }}
              transition={{ duration: 0.25 }}
            >
              {BAR_DURATIONS.map((d, i) => (
                <motion.span
                  key={i}
                  className="h-full w-1 rounded-full bg-tiby-teal-500"
                  initial={{ scaleY: 0.2 }}
                  animate={
                    reduceMotion
                      ? { scaleY: 0.6 }
                      : { scaleY: [0.2, 1, 0.45, 0.85, 0.2] }
                  }
                  transition={{
                    duration: d,
                    repeat: Infinity,
                    ease: "easeInOut",
                    // Desyncs the looping bars on purpose; not an entry stagger.
                    delay: i * 0.08,
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ---------- Tombol rekam ---------- */}
      <motion.div variants={item}>
        <motion.button
          onClick={() => void toggleRecord()}
          disabled={isStarting}
          aria-label={isRecording ? "Berhenti merekam" : "Mulai merekam"}
          whileHover={isRecording ? undefined : { scale: 1.06 }}
          whileTap={{ scale: 0.9 }}
          animate={
            reduceMotion
              ? { boxShadow: `${baseShadow}, 0 0 0 0 rgba(${glow},0)` }
              : {
                  boxShadow: [
                    `${baseShadow}, 0 0 0 0 rgba(${glow},0.45)`,
                    `${baseShadow}, 0 0 0 ${isRecording ? 20 : 16}px rgba(${glow},0)`,
                  ],
                }
          }
          transition={{
            boxShadow: {
              duration: isRecording ? 1.2 : 2,
              repeat: Infinity,
              ease: "easeOut",
            },
            scale: { type: "spring", stiffness: 400, damping: 20 },
          }}
          className={`w-24 h-24 rounded-full flex items-center justify-center text-white transition-colors duration-300 ${
            isRecording
              ? "bg-red-500"
              : "bg-tiby-teal-600 hover:bg-tiby-teal-700"
          }`}
        >
          {/* Ikon Mic <-> Square berputar bergantian */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isRecording ? "stop" : "mic"}
              initial={{ scale: 0, rotate: -90, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0, rotate: 90, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 26 }}
              className="flex"
            >
              {isRecording ? (
                <Square className="w-8 h-8 fill-current" />
              ) : (
                <Mic className="w-10 h-10" />
              )}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </motion.div>

      {/* ---------- Fallback manual ---------- */}
      <motion.button
        variants={item}
        onClick={onFallback}
        whileTap={{ scale: 0.96 }}
        className="text-xs font-semibold text-tiby-muted hover:text-tiby-teal-700 underline underline-offset-4 transition-colors"
      >
        Suara tidak jelas? Gunakan tombol manual
      </motion.button>
    </motion.div>
  );
}
