import { buildNoIndexMetadata } from '@/lib/metadata';

export const metadata = buildNoIndexMetadata({
  title: 'Verify Email',
  description: 'Verify the email address attached to your ChatorAI account.',
  path: '/verify-email',
});

export default function VerifyEmailLayout({ children }) {
  return children;
}
