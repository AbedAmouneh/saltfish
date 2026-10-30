import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";

/**
 * A photo in the Instagram strip that reacts to the pointer: it tilts towards the cursor, lifts,
 * catches a soft gleam, and shows an Instagram badge. Styles live in app.css (.insta-tile).
 * Touch screens get a press effect instead; reduced-motion visitors get no tilt.
 */
export function InstaTile({ href, className = "", style, children }: { href: string; className?: string; style?: CSSProperties; children: ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null);

  const onMove = (e: PointerEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${((0.5 - y) * 16).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${((x - 0.5) * 16).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
    el.dataset.tracking = "";
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    for (const p of ["--rx", "--ry", "--mx", "--my"]) el.style.removeProperty(p);
    delete el.dataset.tracking;
  };

  return (
    <a ref={ref} href={href} target="_blank" rel="noopener" className={`insta-tile ${className}`} style={style} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
      <span aria-hidden="true" className="insta-shine" />
      <span aria-hidden="true" className="insta-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
        </svg>
      </span>
    </a>
  );
}
