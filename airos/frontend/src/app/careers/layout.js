import { buildCanonicalMetadata } from '@/lib/metadata';

export const metadata = buildCanonicalMetadata({
  title: 'Careers at ChatorAI',
  description: 'Explore open roles at ChatorAI across engineering, AI, growth, and customer success.',
  path: '/careers',
});

export default function CareersLayout({ children }) {
  return children;
}
