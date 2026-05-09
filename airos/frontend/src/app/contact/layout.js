import { buildCanonicalMetadata } from '@/lib/metadata';

export const metadata = buildCanonicalMetadata({
  title: 'Contact ChatorAI',
  description: 'Contact ChatorAI for sales, support, partnerships, and security inquiries.',
  path: '/contact',
});

export default function ContactLayout({ children }) {
  return children;
}
