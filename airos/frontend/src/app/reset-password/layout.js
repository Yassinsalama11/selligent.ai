import { buildNoIndexMetadata } from '@/lib/metadata';

export const metadata = buildNoIndexMetadata({
  title: 'Reset Password',
  description: 'Reset your ChatorAI account password.',
  path: '/reset-password',
});

export default function ResetPasswordLayout({ children }) {
  return children;
}
