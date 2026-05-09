import { buildCanonicalMetadata } from '@/lib/metadata';

export const metadata = buildCanonicalMetadata({
  title: 'About ChatorAI',
  description: 'Learn how ChatorAI helps businesses turn customer conversations into revenue across messaging channels.',
  path: '/about',
});

export default function AboutLayout({ children }) {
  return children;
}
