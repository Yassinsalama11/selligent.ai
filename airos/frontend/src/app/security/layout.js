import { buildCanonicalMetadata } from '@/lib/metadata';

export const metadata = buildCanonicalMetadata({
  title: 'Security',
  description: 'Review ChatorAI security foundations, operational safeguards, and security contact details.',
  path: '/security',
});

export default function SecurityLayout({ children }) {
  return children;
}
