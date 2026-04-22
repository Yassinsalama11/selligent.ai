'use client';
import Image from 'next/image';
import Link from 'next/link';

/**
 * ChatOrAI Logo component
 * size: 'sm' | 'md' | 'lg' | 'xl'
 * variant: ignored (since the image is now the full logo)
 * href: wrap in link if provided
 */
export default function Logo({ size = 'md', variant = 'full', href, style = {} }) {
  // Approximate 3.5:1 ratio for 748x210 PNG
  const sizes = {
    sm: { height: 20, width: 70 },
    md: { height: 28, width: 98 },
    lg: { height: 36, width: 126 },
    xl: { height: 48, width: 168 },
  };
  const s = sizes[size] || sizes.md;

  const content = (
    <div style={{ display: 'flex', alignItems: 'center', ...style }}>
      <Image
        src="/ChatOrAi.png"
        alt="ChatOrAI"
        width={s.width * 4}
        height={s.height * 4}
        style={{ width: s.width, height: s.height, objectFit: 'contain', flexShrink: 0, display: 'block' }}
        priority
      />
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
