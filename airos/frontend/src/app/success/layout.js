import { buildNoIndexMetadata } from '@/lib/metadata';

export const metadata = buildNoIndexMetadata({
  title: 'Payment Success',
  description: 'Subscription payment completed successfully.',
  path: '/success',
});

export default function SuccessLayout({ children }) {
  return children;
}
