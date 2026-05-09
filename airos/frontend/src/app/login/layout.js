import { buildNoIndexMetadata } from '@/lib/metadata';

export const metadata = buildNoIndexMetadata({
  title: 'Sign In',
  description: 'Sign in to your ChatorAI workspace.',
  path: '/login',
});

export default function LoginLayout({ children }) {
  return children;
}
