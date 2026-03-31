/**
 * Programmatic SVG illustration for the Live module.
 * Renders a screen, audience silhouettes, play icon, and signal waves.
 * All CSS animations are defined in index.css and respect prefers-reduced-motion.
 */
export function LiveIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Screen glow */}
      <rect
        x="80" y="20" width="160" height="100" rx="8"
        className="live-screen-glow"
        fill="hsl(225 60% 80% / 0.15)"
      />

      {/* Screen body */}
      <rect
        x="85" y="25" width="150" height="90" rx="6"
        fill="hsl(225 40% 92% / 0.6)"
        stroke="hsl(225 40% 80% / 0.5)"
        strokeWidth="1.5"
      />

      {/* Screen inner gradient */}
      <rect
        x="90" y="30" width="140" height="80" rx="4"
        fill="hsl(230 50% 96% / 0.7)"
      />

      {/* Play icon (triangle) */}
      <g className="live-play-pulse">
        <circle cx="160" cy="70" r="16" fill="hsl(225 50% 65% / 0.2)" />
        <path d="M153 60 L153 80 L171 70 Z" fill="hsl(225 55% 60% / 0.6)" />
      </g>

      {/* Screen stand */}
      <rect x="150" y="115" width="20" height="8" rx="1" fill="hsl(225 20% 78% / 0.4)" />
      <rect x="140" y="121" width="40" height="4" rx="2" fill="hsl(225 20% 78% / 0.3)" />

      {/* Signal waves (right of screen) */}
      <g className="live-signal-pulse" opacity="0.4">
        <path d="M252 55 Q262 55 262 65" stroke="hsl(225 50% 65%)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M256 48 Q272 48 272 65" stroke="hsl(225 50% 65%)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M260 41 Q282 41 282 65" stroke="hsl(225 50% 65%)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>

      {/* Audience silhouettes */}
      <g opacity="0.25">
        {/* Person 1 */}
        <circle cx="90" cy="170" r="8" fill="hsl(225 30% 55%)" />
        <ellipse cx="90" cy="190" rx="12" ry="14" fill="hsl(225 30% 55%)" />

        {/* Person 2 */}
        <circle cx="120" cy="165" r="9" fill="hsl(230 30% 50%)" />
        <ellipse cx="120" cy="187" rx="13" ry="15" fill="hsl(230 30% 50%)" />

        {/* Person 3 (center, slightly taller) */}
        <circle cx="155" cy="160" r="10" fill="hsl(225 35% 52%)" />
        <ellipse cx="155" cy="184" rx="14" ry="16" fill="hsl(225 35% 52%)" />

        {/* Person 4 */}
        <circle cx="190" cy="163" r="9" fill="hsl(230 30% 48%)" />
        <ellipse cx="190" cy="186" rx="13" ry="15" fill="hsl(230 30% 48%)" />

        {/* Person 5 */}
        <circle cx="225" cy="168" r="8" fill="hsl(225 30% 55%)" />
        <ellipse cx="225" cy="189" rx="12" ry="14" fill="hsl(225 30% 55%)" />
      </g>
    </svg>
  );
}
