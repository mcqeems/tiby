"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Reveal } from "./shared";
import Image from "next/image";

const ROW_A = [
  "SUDAH_MINUM • Rani",
  "Rani • 12 hari patuh",
  "TERKENDALI • Bagas",
  "Bagas • PMO aktif",
  "SEMBUH • dr. Maya",
  "Maya • Faskes Menteng",
];

const ROW_B = [
  "+12 hari streak • Dewi",
  "Dewi • fase lanjutan",
  "PATUH • Andi",
  "Andi • 30 hari patuh",
  "SEHAT • Sinta",
  "Sinta • tanpa gejala",
];

function MarqueeRow({
  items,
  reverse,
}: {
  items: string[];
  reverse?: boolean;
}) {
  return (
    <div className="relative overflow-hidden py-2 [-webkit-mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
      <motion.div
        animate={{ x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ repeat: Infinity, ease: "linear", duration: 60 }}
        className="flex w-max gap-3"
      >
        {[...items, ...items, ...items, ...items].map((item, i) => (
          <span
            key={i}
            className="whitespace-nowrap rounded-full bg-gray-200/70 px-5 py-2 text-xs font-medium tracking-wider text-gray-700"
          >
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export default function CTA() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gray-50 px-8 py-16 text-center md:px-16">
          <h2 className="relative font-heading text-3xl font-bold leading-tight tracking-tight text-gray-900 md:text-5xl">
            Kalau kamu scroll sejauh ini,
            <br />
            Saatnya <span className="text-tiby-teal-500">Sembuh Bersama.</span>
          </h2>
          <Link
            href="/login"
            className="group relative mt-9 inline-flex items-center gap-2 rounded-full bg-tiby-teal-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-tiby-teal-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            Masuk ke Tiby
          </Link>

          <div className="relative mt-12">
            <MarqueeRow items={ROW_A} />
            <MarqueeRow items={ROW_B} reverse />
          </div>

          <div className="relative w-full">
            <Image
              src="/landing/panda-cloud.png"
              alt="panda cloud"
              width={300}
              height={100}
              className="absolute inset-x-0 -bottom-2 mx-auto w-max"
            ></Image>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
