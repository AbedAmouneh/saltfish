import { Link } from "react-router";
import { Logo } from "./Logo";

export const VOXIRE_URL = "https://voxire.com";

/** Voxire's wordmark (emblem + name), colored to suit this site's background. Height comes from className. */
export function VoxireWordmark({ className = "" }: { className?: string }) {
  return <img src="/brand/voxire-wordmark.webp" width={237} height={96} alt="Voxire" decoding="async" className={`w-auto ${className}`} />;
}

/**
 * "Saltfish × Voxire" lockup: the Saltfish logo (links home) next to Voxire's wordmark (links to voxire.com).
 * Font size on the parent sets the Saltfish logo; voxireClassName sets the wordmark height.
 */
export function CollabLogo({ homeHref, voxireClassName = "h-[1.1em]", className = "" }: { homeHref?: string; voxireClassName?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.4em] ${className}`} dir="ltr">
      {homeHref ? (
        <Link to={homeHref} aria-label="Saltfish">
          <Logo />
        </Link>
      ) : (
        <Logo />
      )}
      {/* "×" and the wordmark stay together if the lockup wraps onto two lines */}
      <span className="inline-flex shrink-0 items-center gap-[0.4em]">
        <span aria-hidden="true" className="text-[0.6em] font-semibold opacity-60">
          ×
        </span>
        <a href={VOXIRE_URL} target="_blank" rel="noopener" className="inline-flex transition-opacity hover:opacity-80">
          <VoxireWordmark className={voxireClassName} />
        </a>
      </span>
    </span>
  );
}
