'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * ChatorAI logo component
 * size: 'sm' | 'md' | 'lg' | 'xl'
 */
export default function Logo({ size = 'md', href, className }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sizes = {
    sm: { height: 20, width: 70 },
    md: { height: 28, width: 98 },
    lg: { height: 36, width: 126 },
    xl: { height: 48, width: 168 },
  };
  const s = sizes[size] || sizes.md;

  // Default to dark version during hydration or if theme is unknown
  const isLight = mounted && resolvedTheme === 'light';
  const logoSrc = isLight ? '/ChatOrAi-Black.png' : '/ChatOrAi.png';

  const content = (
    <div className={cn("flex items-center", className)}>
      <Image
        src={logoSrc}
        alt="ChatorAI"
        width={s.width * 4}
        height={s.height * 4}
        style={{ width: s.width, height: s.height, objectFit: 'contain' }}
        className="shrink-0 block"
        priority
      />
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="no-underline inline-flex">
        {content}
      </Link>
    );
  }
  return content;
}
