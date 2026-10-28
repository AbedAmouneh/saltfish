import { SaltyMascot } from "~/components/salty/SaltyMascot";
import type { GameId } from "~/lib/games";

/** Cover art for each game card (pure CSS/SVG, no images). */
export function GameArt({ game, className = "" }: { game: GameId; className?: string }) {
  if (game === "handroll-rush")
    return (
      <div className={`tile-pattern relative grid place-items-center overflow-hidden ${className}`}>
        <svg viewBox="0 0 160 120" className="w-1/2" aria-hidden="true">
          <rect x="40" y="88" width="80" height="16" rx="7" fill="#1E2A1F" />
          <ellipse cx="62" cy="40" rx="15" ry="10" fill="#FFF8EC" stroke="#2a1d14" strokeWidth="2.5" />
          <rect x="88" y="22" width="30" height="17" rx="5" fill="#F27A3E" stroke="#2a1d14" strokeWidth="2.5" />
          <circle cx="80" cy="66" r="11" fill="#3E7D3A" stroke="#2a1d14" strokeWidth="2.5" />
          <circle cx="80" cy="66" r="7.5" fill="#D9F0B8" />
          <g transform="translate(128 58) rotate(20)">
            <rect x="-2.5" y="-2" width="5" height="22" rx="2" fill="#CFC8C2" stroke="#2a1d14" strokeWidth="2" />
            <rect x="-8" y="-11" width="16" height="10" rx="3" fill="#CFC8C2" stroke="#2a1d14" strokeWidth="2" />
          </g>
        </svg>
      </div>
    );
  if (game === "catch")
    return (
      <div className={`relative grid place-items-center overflow-hidden bg-[linear-gradient(180deg,#1f4a50,#0b1416)] ${className}`}>
        <svg viewBox="0 0 160 120" className="absolute inset-0 size-full" aria-hidden="true">
          <path d="M120 0v52" stroke="rgba(246,231,214,.7)" strokeWidth="1.5" />
          <path d="M120 52v10a7 7 0 0 0 14 0v-6" fill="none" stroke="#d9d2cc" strokeWidth="3" strokeLinecap="round" />
          <circle cx="26" cy="30" r="3" fill="none" stroke="rgba(255,255,255,.25)" />
          <circle cx="48" cy="90" r="2" fill="none" stroke="rgba(255,255,255,.25)" />
          <rect x="0" y="106" width="160" height="14" fill="#B43A2B" />
        </svg>
        <SaltyMascot className="relative w-2/5 -scale-x-100" />
      </div>
    );
  return (
    <div className={`grid place-items-center overflow-hidden bg-[#EFE6D6] ${className}`}>
      <p className="flex items-baseline gap-2 font-display text-5xl font-[900] uppercase" dir="ltr">
        <span className="text-[#D2372B]">Salt</span>
        <span className="text-2xl text-[#1E2B57] normal-case">or</span>
        <span className="text-[#1E2B57]">Fish?</span>
      </p>
    </div>
  );
}
