import { buildCanonicalMetadata } from '@/lib/metadata';

export const metadata = buildCanonicalMetadata({
  title: 'Book a ChatorAI Demo',
  description: 'Schedule a ChatorAI demo to see AI-powered sales and support workflows across WhatsApp, Instagram, Messenger, and web chat.',
  path: '/demo',
});

export default function DemoLayout({ children }) {
  return children;
}
