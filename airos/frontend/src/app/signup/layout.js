import { buildNoIndexMetadata } from '@/lib/metadata';

export const metadata = buildNoIndexMetadata({
  title: 'Start Free Trial',
  description: 'Create a ChatorAI workspace and start your free trial.',
  path: '/signup',
});

export default function SignupLayout({ children }) {
  return children;
}
