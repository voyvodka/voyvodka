export function Logo() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="SO"
      role="img"
    >
      <rect x="0.5" y="0.5" width="31" height="31" stroke="#3a4650" fill="#151e25" />
      <rect x="0" y="0" width="32" height="2" fill="url(#logo-accent)" />
      <text
        x="16"
        y="22"
        textAnchor="middle"
        fontFamily="Space Mono, monospace"
        fontSize="12"
        fontWeight="700"
        fill="#75a8ff"
        letterSpacing="1"
      >
        SO
      </text>
      <defs>
        <linearGradient id="logo-accent" x1="0" y1="0" x2="32" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="50%" stopColor="#75a8ff" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
    </svg>
  );
}
