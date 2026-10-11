export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="lg-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a594ff" />
          <stop offset="1" stopColor="#5b45e0" />
        </linearGradient>
        <linearGradient id="lg-sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#lg-bg)" />
      <circle cx="16" cy="16" r="10" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.2" />
      <circle cx="16" cy="16" r="6" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.2" />
      <g className="logo-sweep">
        <path d="M16 16 L16 6 A10 10 0 0 1 25.5 12.9 Z" fill="url(#lg-sweep)" opacity="0.55" />
        <line x1="16" y1="16" x2="16" y2="6" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
      </g>
      <circle cx="16" cy="16" r="1.8" fill="#fff" />
      <circle cx="21.5" cy="11" r="1.6" fill="#3ddc97" className="live-dot" />
    </svg>
  );
}
