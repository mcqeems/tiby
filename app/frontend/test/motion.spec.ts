import { describe, expect, it } from "vitest";
import * as motionConfig from "@/lib/motion";
import {
  banner,
  fadeDown,
  fadeUp,
  listItem,
  overlay,
  popIn,
  popItem,
  popover,
  revealItem,
  scaleIn,
  slideIn,
  staggerParent,
  VIEWPORT,
} from "@/lib/motion";

const ALL_VARIANTS = {
  banner,
  fadeDown,
  fadeUp,
  listItem,
  overlay,
  popIn,
  popItem,
  popover,
  revealItem,
  scaleIn,
  slideIn,
};

describe("motion variants", () => {
  it("every variant defines the states AnimatePresence drives", () => {
    for (const [name, variant] of Object.entries(ALL_VARIANTS)) {
      expect(variant, name).toHaveProperty("hidden");
      expect(variant, name).toHaveProperty("visible");
    }
  });

  it("anything that opens and closes has an exit state", () => {
    for (const variant of [overlay, popIn, popover, fadeUp, fadeDown, banner, scaleIn, slideIn]) {
      expect(variant).toHaveProperty("exit");
    }
  });

  it("stagger parents only set staggerChildren, never a per-child delay", () => {
    const parent = staggerParent(0.05, 0.1);
    expect(parent.visible).toEqual({
      transition: { staggerChildren: 0.05, delayChildren: 0.1 },
    });
    expect(JSON.stringify(parent)).not.toMatch(/delay:/);
  });

  it("staggerParent defaults are usable", () => {
    expect(staggerParent().visible).toEqual({
      transition: { staggerChildren: 0.06, delayChildren: 0 },
    });
  });

  it("the scroll viewport fires once and has a margin", () => {
    expect(VIEWPORT.once).toBe(true);
    expect(String(VIEWPORT.margin)).toMatch(/px$/);
  });

  it("no variant animates layout properties", () => {
    const serialized = JSON.stringify(ALL_VARIANTS);
    for (const forbidden of ["width", "height", "top", "bottom", "left", "right"]) {
      expect(serialized).not.toMatch(new RegExp(`"${forbidden}"`));
    }
  });

  it("exports nothing that no component uses", () => {
    // `fade`, `sheetUp` and `shake` were speculative; keep the module honest.
    for (const dead of ["fade", "sheetUp", "shake"]) {
      expect(Object.keys(motionConfig)).not.toContain(dead);
    }
  });
});
