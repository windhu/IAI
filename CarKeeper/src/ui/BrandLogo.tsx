interface BrandLogoProps {
  size?: 'small' | 'large';
  decorative?: boolean;
}

export function BrandLogo({ size = 'small', decorative = false }: BrandLogoProps) {
  return (
    <svg
      className={`brand-logo brand-logo-${size}`}
      viewBox="0 0 176 44"
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : '峰哥出品'}
      aria-hidden={decorative || undefined}
      focusable="false"
    >
      <rect x="1" y="1" width="174" height="42" rx="21" fill="var(--card)" stroke="var(--border)" />
      <circle cx="22" cy="22" r="16" fill="var(--blue)" />
      <text x="22" y="29" textAnchor="middle" fill="#fff" fontSize="20" fontWeight="700">
        峰
      </text>
      <text x="45" y="28" fill="var(--text)" fontSize="16" fontWeight="700">
        峰哥出品
      </text>
    </svg>
  );
}
