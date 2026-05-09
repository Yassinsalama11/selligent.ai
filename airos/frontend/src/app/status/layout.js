import { buildCanonicalMetadata } from '@/lib/metadata';

export const metadata = buildCanonicalMetadata({
  title: 'System Status',
  description: 'Monitor ChatorAI platform status across messaging, billing, AI, and infrastructure services.',
  path: '/status',
});

export default function StatusLayout({ children }) {
  return children;
}
