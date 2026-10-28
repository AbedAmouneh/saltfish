/**
 * Placeholder wordmark until the official vector logo arrives:
 * a hand-drawn wave over "SALT FISH" with the signature dot.
 */
export function Logo({ className = "", dot = "#ff8a3d" }: { className?: string; dot?: string }) {
  return (
    <span className={`inline-flex flex-col items-center leading-none ${className}`} dir="ltr">
      <svg viewBox="0 0 60 16" className="h-[0.5em] w-[1.9em]" aria-hidden="true">
        <path d="M3 12c3-8 10-10 14-5s3 7 7 6 4-9 10-9 6 8 11 7 7-6 11-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <span className="font-display text-[1em] font-[800] tracking-[0.02em] whitespace-nowrap uppercase">
        Salt Fish
        <span aria-hidden="true" className="ms-[0.08em] inline-block size-[0.17em] rounded-full align-[0.12em]" style={{ background: dot }} />
      </span>
      <span className="sr-only">Saltfish</span>
    </span>
  );
}
