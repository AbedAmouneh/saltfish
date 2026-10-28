/** Salty: the yellow fish with sunglasses (drawn in the spirit of the Faqra posters). */
export function SaltyMascot({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 130 100" className={className} aria-hidden="true">
      <path d="M96 50 L126 26 L120 50 L126 74 Z" fill="#F6CF2E" stroke="#2a1d14" strokeWidth="3.5" strokeLinejoin="round" />
      <ellipse cx="58" cy="50" rx="44" ry="36" fill="#F6CF2E" stroke="#2a1d14" strokeWidth="3.5" />
      <path d="M58 16 Q70 4 84 18" fill="#F6CF2E" stroke="#2a1d14" strokeWidth="3.5" strokeLinejoin="round" />
      <rect x="18" y="34" width="26" height="17" rx="7" fill="#1a1412" />
      <rect x="50" y="34" width="26" height="17" rx="7" fill="#1a1412" />
      <path d="M44 40 h6" stroke="#1a1412" strokeWidth="4" />
      <path d="M22 38 l8 0M54 38 l8 0" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity=".7" />
      <ellipse cx="34" cy="66" rx="7" ry="5" fill="#C2412F" stroke="#2a1d14" strokeWidth="3" />
      <path d="M70 70 q8 4 14 -2" fill="none" stroke="#2a1d14" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
