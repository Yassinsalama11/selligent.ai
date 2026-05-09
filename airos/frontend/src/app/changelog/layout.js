import { buildCanonicalMetadata } from '@/lib/metadata';

export const metadata = buildCanonicalMetadata({
  title: 'ChatorAI Changelog',
  description: 'Track product releases, improvements, and fixes across the ChatorAI platform.',
  path: '/changelog',
});

export default function ChangelogLayout({ children }) {
  return children;
}
