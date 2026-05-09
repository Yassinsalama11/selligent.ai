import { buildCanonicalMetadata } from '@/lib/metadata';

export const metadata = buildCanonicalMetadata({
  title: 'Press',
  description: 'Find ChatorAI press information, company background, and media contact details.',
  path: '/press',
});

export default function PressLayout({ children }) {
  return children;
}
