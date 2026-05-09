import { buildCanonicalMetadata } from '@/lib/metadata';

export const metadata = buildCanonicalMetadata({
  title: 'ChatorAI Blog',
  description: 'Product updates, eCommerce playbooks, and AI insights from the ChatorAI team.',
  path: '/blog',
});

export default function BlogLayout({ children }) {
  return children;
}
