import { useEffect, useRef } from "react";

/** Sets up a crisp (DPR-aware) canvas at a fixed logical size and runs `frame` every animation frame. */
export function useGameCanvas(width: number, height: number, frame: (ctx: CanvasRenderingContext2D, dt: number, now: number) => boolean | void) {
  const ref = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(frame);
  frameRef.current = frame;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    let raf = 0;
    let last = performance.now();
    let stopped = false;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (frameRef.current(ctx, dt, now) === false) stopped = true;
      if (!stopped) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    // Pause when the tab is hidden so dt doesn't jump.
    const vis = () => {
      last = performance.now();
    };
    document.addEventListener("visibilitychange", vis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [width, height]);

  return ref;
}

/** Pointer x (or y) in logical canvas units. */
export function logicalPoint(canvas: HTMLCanvasElement, e: { clientX: number; clientY: number }, width: number, height: number) {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * width, y: ((e.clientY - r.top) / r.height) * height };
}

export const FONT_DISPLAY = "'Big Shoulders Display', Impact, sans-serif";
export const FONT_BODY = "'Instrument Sans Variable', 'Noto Kufi Arabic Variable', system-ui, sans-serif";
