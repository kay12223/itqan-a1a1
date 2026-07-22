import { useState } from "react";

export default function Logo({ size = "text-2xl", showRipple = true, onClick }) {
  const [ripples, setRipples] = useState([]);

  const onEnter = () => {
    if (!showRipple) return;
    const id = Date.now();
    setRipples((r) => [...r, id]);
    setTimeout(() => setRipples((r) => r.filter((x) => x !== id)), 1600);
  };

  return (
    <div
      className="relative inline-flex items-center gap-2.5 select-none"
      onMouseEnter={onEnter}
      onClick={onClick}
      data-testid="itqan-logo"
      style={onClick ? { cursor: "pointer" } : {}}
    >
      {/* ── Logo mark ── */}
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
        <svg viewBox="0 0 40 40" fill="none" className="absolute inset-0 h-full w-full drop-shadow-lg">
          <defs>
            <linearGradient id="lgFill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="55%" stopColor="#6d28d9" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="lgStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(96,165,250,0.7)" />
              <stop offset="100%" stopColor="rgba(167,139,250,0.7)" />
            </linearGradient>
            <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Hexagon body */}
          <path
            d="M20 2.5L35.5 11.25V28.75L20 37.5L4.5 28.75V11.25Z"
            fill="url(#lgFill)"
            filter="url(#glow)"
          />
          {/* Hex border */}
          <path
            d="M20 2.5L35.5 11.25V28.75L20 37.5L4.5 28.75V11.25Z"
            stroke="url(#lgStroke)"
            strokeWidth="1.2"
            fill="none"
          />
          {/* Inner highlight line */}
          <path
            d="M20 6L32 12.5V27.5L20 34L8 27.5V12.5Z"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="0.8"
            fill="none"
          />
          {/* Arabic letter إ */}
          <text
            x="20" y="26.5"
            textAnchor="middle"
            fill="white"
            fontFamily="'Cairo', 'Tajawal', sans-serif"
            fontSize="17"
            fontWeight="900"
            letterSpacing="-0.5"
          >
            إ
          </text>
        </svg>

        {/* Ripple rings on hover */}
        {ripples.map((id) => (
          <span
            key={id}
            className="absolute rounded-full border border-blue-400/40 animate-ping-soft"
            style={{ inset: "-5px" }}
          />
        ))}
      </span>

      {/* ── Text ── */}
      <div className="leading-none">
        <p className={`font-display font-black tracking-tight ${size} animate-pulse-glow`}>
          إتقان
        </p>
        <p className="text-[9px] font-medium text-blue-400/70 mt-0.5">إدارة الشغل</p>
      </div>
    </div>
  );
}
