import { buildCanonicalMetadata } from '@/lib/metadata';

export const metadata = buildCanonicalMetadata({
  title: 'Cookie Policy',
  description: 'Read the ChatorAI cookie policy and how cookie preferences are handled across the platform.',
  path: '/cookies',
});

export default function CookiesLayout({ children }) {
  return children;
}
