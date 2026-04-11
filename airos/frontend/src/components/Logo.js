'use client';
import Image from 'next/image';
import Link from 'next/link';

/**
 * Selligent.ai Logo component
 * size: 'sm' | 'md' | 'lg' | 'xl'
 * variant: 'full' (icon + wordmark) | 'icon' (mark only) | 'wordmark' (text only)
 * href: wrap in link if provided
 * dark: if false, show on white/light bg (not needed — PNG has transparent-friendly look)
 */
export default function Logo({ size = 'md', variant = 'full', href, style = {} }) {
  const sizes = {
    sm: { icon: 26, fontSize: 14, gap: 7 },
    md: { icon: 34, fontSize: 17, gap: 9 },
    lg: { icon: 44, fontSize: 22, gap: 12 },
    xl: { icon: 56, fontSize: 28, gap: 14 },
  };
  const s = sizes[size] || sizes.md;

  const icon = (
    <Image
      src="/selligent-logo.png"
      alt="Selligent.ai"
      width={s.icon * 4}
      height={s.icon * 4}
      style={{ width: s.icon, height: s.icon, objectFit: 'contain', flexShrink: 0 }}
      priority
    />
  );

  const wordmark = (
    <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700,
      fontSize: s.fontSize, letterSpacing: '-0.025em',
      whiteSpace: 'nowrap', color: 'var(--t1)', lineHeight: 1 }}>
      selligent<span style={{ color: '#38bdf8' }}>.ai</span>
    </span>
  );

  const content = (
    <div style={{ display: 'flex', alignItems: 'center', gap: s.gap, ...style }}>
      {(variant === 'full' || variant === 'icon') && icon}
      {(variant === 'full' || variant === 'wordmark') && wordmark}
    </div>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: 'none', display: 'inline-flex' }}>
        {content}
      </Link>
    );
  }
  return content;
}
