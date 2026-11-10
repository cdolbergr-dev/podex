import { useId } from "react";

/** Trading-card inspired mark (original artwork — not official Pokémon branding). */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const holo = `${uid}-holo`;
  const gold = `${uid}-gold`;
  const gloss = `${uid}-gloss`;

  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
      <defs>
        <linearGradient id={gold} x1="16" y1="3" x2="16" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f0d56a" />
          <stop offset="0.45" stopColor="#c9a227" />
          <stop offset="1" stopColor="#9a7b1c" />
        </linearGradient>
        <linearGradient id={holo} x1="8" y1="10" x2="24" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#67e8f9" />
          <stop offset="0.35" stopColor="#a78bfa" />
          <stop offset="0.65" stopColor="#fcd34d" />
          <stop offset="1" stopColor="#f472b6" />
        </linearGradient>
        <linearGradient id={gloss} x1="9" y1="10" x2="18" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Soft stack hint */}
      <rect
        x="9"
        y="5"
        width="16.5"
        height="23"
        rx="2"
        className="fill-foreground"
        opacity="0.07"
        transform="rotate(4 17 16.5)"
      />

      {/* Card body */}
      <rect x="7.25" y="3.75" width="17.5" height="24.5" rx="2.15" fill="var(--surface)" stroke={`url(#${gold})`} strokeWidth="1.15" />

      {/* Inner frame */}
      <rect
        x="8.45"
        y="4.95"
        width="15.1"
        height="22.1"
        rx="1.35"
        stroke={`url(#${gold})`}
        strokeWidth="0.65"
        opacity="0.9"
      />

      {/* Name bar */}
      <path
        d="M8.75 5.85h14.5a.65.65 0 0 1 .65.65v3.15H8.1V6.5a.65.65 0 0 1 .65-.65z"
        className="fill-foreground"
        opacity="0.92"
      />

      {/* HP badge */}
      <circle cx="21.85" cy="7.75" r="2.05" fill="var(--surface)" stroke={`url(#${gold})`} strokeWidth="0.6" />
      <text
        x="21.85"
        y="8.35"
        textAnchor="middle"
        fontSize="2.15"
        fontWeight="700"
        className="fill-foreground"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        HP
      </text>

      {/* Illustration window */}
      <rect x="9.15" y="10.35" width="13.7" height="11.2" rx="0.75" fill={`url(#${holo})`} />
      <path d="M9.15 10.35h6.2l-6.2 6.4V10.35z" fill={`url(#${gloss})`} />

      {/* Catalog grid motif in the art (Podex) */}
      <g opacity="0.42" className="fill-foreground">
        <rect x="11.2" y="12.5" width="3.2" height="4.2" rx="0.45" />
        <rect x="15.4" y="12.5" width="3.2" height="4.2" rx="0.45" />
        <rect x="11.2" y="17.5" width="3.2" height="2.8" rx="0.45" />
        <rect x="15.4" y="17.5" width="3.2" height="2.8" rx="0.45" />
      </g>

      {/* Attack / footer strip */}
      <rect x="9.15" y="23.15" width="13.7" height="3.35" rx="0.55" className="fill-foreground" opacity="0.07" />
      <circle cx="11.15" cy="24.8" r="0.95" fill={`url(#${gold})`} opacity="0.95" />
      <path
        d="M13.1 24.35h6.1a.35.35 0 0 1 0 .7h-6.1a.35.35 0 0 1 0-.7zm0 1.15h4.2a.35.35 0 0 1 0 .7h-4.2a.35.35 0 0 1 0-.7z"
        className="fill-foreground"
        opacity="0.35"
      />

      {/* Rarity star */}
      <path
        d="M22.35 25.05l.55 1.12 1.24.18-.9.88.21 1.23-1.1-.58-1.1.58.21-1.23-.9-.88 1.24-.18.55-1.12z"
        fill={`url(#${gold})`}
      />
    </svg>
  );
}
