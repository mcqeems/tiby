"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/** Emotions that ship a Lottie file. */
export type AnimatedMascotEmotion = "wave" | "idle" | "listening" | "empathy";
/** Emotions that only exist as the outlined `-stroke` artwork. */
export type StaticMascotEmotion = "happy" | "thinking" | "alert";
export type MascotEmotion = AnimatedMascotEmotion | StaticMascotEmotion;

interface MascotProps<E extends MascotEmotion = MascotEmotion> {
  emotion?: E;
  /**
   * Play the Lottie file. Without it (and for every emotion that has no
   * Lottie) the static `-stroke` artwork renders, so passing this for
   * `happy`, `thinking`, or `alert` is a type error.
   */
  animated?: E extends AnimatedMascotEmotion ? boolean : false;
  /** Loop forever (default) or play once and rest on the final frame. */
  loop?: boolean;
  size?: number;
  fill?: boolean;
  className?: string;
  altText?: string;
  priority?: boolean;
}

const LOTTIE_LOADERS: Record<
  AnimatedMascotEmotion,
  () => Promise<{ default: unknown }>
> = {
  wave: () =>
    import("@/public/mascot/motion-graph(lottie,mp4,gif)/wave.json"),
  idle: () =>
    import("@/public/mascot/motion-graph(lottie,mp4,gif)/idle.json"),
  listening: () =>
    import("@/public/mascot/motion-graph(lottie,mp4,gif)/listening.json"),
  empathy: () =>
    import("@/public/mascot/motion-graph(lottie,mp4,gif)/empathy.json"),
};

const isAnimatedEmotion = (
  emotion: MascotEmotion,
): emotion is AnimatedMascotEmotion => emotion in LOTTIE_LOADERS;

/** Every static mascot uses the outlined `-stroke` artwork. */
const STROKE_ART: Record<MascotEmotion, string> = {
  wave: "/mascot/happy/happy-stroke.png",
  idle: "/mascot/idle/idle-stroke.png",
  listening: "/mascot/listening/listening-stroke.png",
  happy: "/mascot/happy/happy-stroke.png",
  empathy: "/mascot/empathy/empathy-stroke.png",
  thinking: "/mascot/thinking/thinking-stroke.png",
  alert: "/mascot/alert/alert-stroke.png",
};

type LottieInstance = {
  play: () => void;
  pause: () => void;
  destroy: () => void;
  addEventListener: (name: "complete", callback: () => void) => void;
};

/** Start static (matches SSR), then follow the OS preference on the client. */
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

export default function Mascot<E extends MascotEmotion = MascotEmotion>(
  props: MascotProps<E>,
) {
  const {
    emotion = "wave",
    size = 100,
    fill = false,
    className = "",
    altText = "",
    priority = false,
    loop = true,
  } = props;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const lottieRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<LottieInstance | null>(null);
  const finishedRef = useRef(false);
  const [inView, setInView] = useState(false);
  const [hasBeenInView, setHasBeenInView] = useState(false);
  const [loadedEmotion, setLoadedEmotion] =
    useState<AnimatedMascotEmotion | null>(null);
  const reduceMotion = usePrefersReducedMotion();

  const animatable = isAnimatedEmotion(emotion) ? emotion : null;
  const canAnimate = Boolean(props.animated) && animatable !== null && !reduceMotion;
  const isLoaded = animatable !== null && loadedEmotion === animatable;

  // Load the JSON only once the mascot approaches the viewport, then pause it
  // again whenever it scrolls away.
  useEffect(() => {
    const element = wrapperRef.current;
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

  useEffect(() => {
    if (!animatable || !canAnimate || !hasBeenInView) return;

    let cancelled = false;

    void (async () => {
      try {
        const [data, lottieModule] = await Promise.all([
          LOTTIE_LOADERS[animatable](),
          import("lottie-web"),
        ]);

        if (cancelled || !lottieRef.current) return;

        const lottie = lottieModule.default || lottieModule;
        lottieRef.current.innerHTML = "";
        finishedRef.current = false;
        const instance = lottie.loadAnimation({
          container: lottieRef.current,
          renderer: "svg",
          loop,
          autoplay: false,
          animationData: data.default,
        });
        instance.addEventListener("complete", () => {
          finishedRef.current = true;
        });
        animationRef.current = instance;
        setLoadedEmotion(animatable);
      } catch {
        // Keep the stroke image visible if the animation cannot load.
      }
    })();

    return () => {
      cancelled = true;
      animationRef.current?.destroy();
      animationRef.current = null;
    };
  }, [animatable, canAnimate, hasBeenInView, loop]);

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
  }, [inView, isLoaded, loop]);

  return (
    <div
      ref={wrapperRef}
      role={altText ? "img" : undefined}
      aria-label={altText || undefined}
      aria-hidden={altText ? undefined : true}
      className={`relative flex items-center justify-center ${
        fill ? "h-full w-full" : ""
      } ${className}`}
      style={fill ? undefined : { width: size, height: size }}
    >
      <Image
        src={STROKE_ART[emotion]}
        alt=""
        fill
        sizes={fill ? "200px" : `${size}px`}
        priority={priority}
        draggable={false}
        className={`object-contain transition-opacity duration-300 ${
          isLoaded && canAnimate ? "opacity-0" : "opacity-100"
        }`}
      />

      {canAnimate && (
        <div
          ref={lottieRef}
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}
