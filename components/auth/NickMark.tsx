/** App wordmark with the court-line motif. */
export function NickMark({ size = 64 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" rx="16" fill="url(#nick-g)" />
        <defs>
          <linearGradient id="nick-g" x1="0" y1="0" x2="64" y2="64">
            <stop offset="0" stopColor="#2952FF" />
            <stop offset="0.52" stopColor="#7B48FF" />
            <stop offset="1" stopColor="#FF5A47" />
          </linearGradient>
        </defs>
        <path d="M8 44h48M8 24h48M32 24v20" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
        <text
          x="32"
          y="42"
          textAnchor="middle"
          fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
          fontWeight="800"
          fontSize="32"
          fill="#fff"
        >
          N
        </text>
      </svg>
      <span className="text-[28px] font-extrabold tracking-tight">Nick</span>
    </div>
  );
}
