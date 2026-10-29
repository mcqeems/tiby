"use client";

import RevealBase from "@/components/ui/reveal";

export { EASE_OUT as EASE } from "@/lib/motion";
export { default as Reveal } from "@/components/ui/reveal";

/**
 * Reference-style section heading: two-line title with the second line in
 * Tiby teal, optional gray subcopy. No eyebrow pill — the reference uses
 * plain bold titles.
 */
export function SectionHeading({
  line1,
  line2,
  desc,
}: {
  line1: string;
  line2: string;
  desc?: string;
}) {
  return (
    <RevealBase className="mx-auto mb-10 max-w-3xl text-center">
      <h2 className="font-sans text-4xl font-bold leading-[1.15] tracking-tight text-gray-900 md:text-5xl">
        {line1}{" "}
        <span className="text-tiby-teal-500">{line2}</span>
      </h2>
      {desc && (
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-gray-500">
          {desc}
        </p>
      )}
    </RevealBase>
  );
}
