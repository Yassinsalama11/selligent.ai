import { buildCanonicalMetadata } from '@/lib/metadata';

export const metadata = buildCanonicalMetadata({
  title: 'Terms of Service',
  description: 'Read the ChatorAI terms of service for platform usage, subscriptions, and billing conditions.',
  path: '/terms',
});

export default function TermsLayout({ children }) {
  return children;
}
