import { buildNoIndexMetadata } from '@/lib/metadata';

export const metadata = buildNoIndexMetadata({
  title: 'Payment Cancelled',
  description: 'Payment flow cancelled before subscription activation.',
  path: '/cancel',
});

export default function CancelLayout({ children }) {
  return children;
}
