"use client";

import { useEffect, useRef, useState } from "react";

export type LogoAnimateVersion = "full" | "stop-middle";

interface LogoAnimateProps {
  /** Which Lottie file to play. Defaults to the full animation. */
  version?: LogoAnimateVersion;
  /** Loop forever (default) or play once and rest on the final frame. */
  loop?: boolean;
  /** Height in px; width follows the 1196:600 artboard. Defaults to 48. */
  size?: number;
  className?: string;
  altText?: string;
}

const LOGO_LOADERS: Record<
  LogoAnimateVersion,
  () => Promise<{ default: unknown }>
> = {
  full: () => import("@/public/logo/lottie/tiby-logo-scale-x2.json"),
  "stop-middle": () =>
    import("@/public/logo/lottie/tiby-logo-scale-x2-stop-at-middle.json"),
};

/** Logo artboard ratio: 1196 x 600. */
const ASPECT = 1196 / 600;

type LottieInstance = {
  play: () => void;
  pause: () => void;
  destroy: () => void;
  isPaused: boolean;
  addEventListener: (name: "complete", callback: () => void) => void;
};

/** Start still (matches SSR), then follow the OS preference on the client. */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

export default function LogoAnimate({
  version = "full",
  loop = true,
  size = 48,
  className = "",
  altText = "Tiby",
}: LogoAnimateProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<LottieInstance | null>(null);
  const finishedRef = useRef(false);
  const [inView, setInView] = useState(false);
  const [hasBeenInView, setHasBeenInView] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const reduceMotion = usePrefersReducedMotion();

  // The JSONs are logo-only with no static fallback art, so reduced-motion
  // renders the sized box without attaching an animation.
  const canAnimate = !reduceMotion;

  // Load the animation once the logo nears the viewport, then pause it
  // whenever it scrolls away.
  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setInView(true);
      setHasBeenInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setHasBeenInView(true);
      },
      { rootMargin: "240px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // A bfcache/history restore does not re-run effects, so re-assert playback
  // whenever the page becomes visible again.
  useEffect(() => {
    const resume = () => {
      const animation = animationRef.current;
      if (!animation || document.visibilityState !== "visible") return;
      if (!loop && finishedRef.current) return;
      if (animation.isPaused) animation.play();
    };
    const onPageShow = () => resume();
    const onVisibility = () => {
      if (!document.hidden) resume();
    };
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loop]);

  useEffect(() => {
    if (!canAnimate || !hasBeenInView) return;

    let cancelled = false;

    void (async () => {
      try {
        const [data, lottieModule] = await Promise.all([
          LOGO_LOADERS[version](),
          import("lottie-web"),
        ]);

        if (cancelled || !containerRef.current) return;

        const lottie = lottieModule.default || lottieModule;
        containerRef.current.innerHTML = "";
        finishedRef.current = false;
        const instance = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop,
          autoplay: false,
          animationData: data.default,
        });
        instance.addEventListener("complete", () => {
          finishedRef.current = true;
        });
        animationRef.current = instance;
        setLoaded(true);
        // The play effect below may have already run against a missing
        // instance during a restore race; re-assert here.
        if (document.visibilityState === "visible") instance.play();
      } catch {
        // Keep the empty box if the animation cannot load.
      }
    })();

    return () => {
      cancelled = true;
      animationRef.current?.destroy();
      animationRef.current = null;
      // A remount must go through the full load-then-play chain again.
      finishedRef.current = false;
      setLoaded(false);
    };
  }, [version, loop, canAnimate, hasBeenInView]);

  useEffect(() => {
    const animation = animationRef.current;
    if (!animation) return;
    if (!inView) {
      animation.pause();
      return;
    }
    // A one-shot that already reached its last frame stays there.
    if (!loop && finishedRef.current) return;
    animation.play();
  }, [inView, loaded, loop]);

  return (
    <div
      ref={containerRef}
      role={altText ? "img" : undefined}
      aria-label={altText || undefined}
      aria-hidden={altText ? undefined : true}
      className={className}
      style={{ width: Math.round(size * ASPECT), height: size }}
    />
  );
}
