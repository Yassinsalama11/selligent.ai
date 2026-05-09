import { buildCanonicalMetadata } from '@/lib/metadata';

export const metadata = buildCanonicalMetadata({
  title: 'Privacy Policy',
  description: 'Read how ChatorAI handles customer data, privacy workflows, and platform data processing.',
  path: '/privacy',
});

export default function PrivacyLayout({ children }) {
  return children;
}
