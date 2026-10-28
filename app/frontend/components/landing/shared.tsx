"use client";

import RevealBase from "@/components/ui/reveal";

export { EASE_OUT as EASE } from "@/lib/motion";
export { default as Reveal } from "@/components/ui/reveal";

export function SectionHeading({
  eyebrow,
  children,
  desc,
}: {
  eyebrow: string;
  children: React.ReactNode;
  desc?: string;
}) {
  return (
    <RevealBase className="mx-auto mb-14 max-w-2xl text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-tiby-teal-100 bg-tiby-teal-50/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-tiby-teal-700">
        {eyebrow}
      </span>
      <h2 className="mt-4 font-heading text-3xl font-bold leading-tight tracking-tight md:text-5xl">
        {children}
      </h2>
      {desc && (
        <p className="mx-auto mt-4 max-w-lg text-gray-500 leading-relaxed">
          {desc}
        </p>
      )}
    </RevealBase>
  );
}
