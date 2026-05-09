import { buildNoIndexMetadata } from '@/lib/metadata';

export const metadata = buildNoIndexMetadata({
  title: 'Accept Workspace Invite',
  description: 'Accept a ChatorAI workspace invitation and finish account setup.',
  path: '/accept-invite',
});

export default function AcceptInviteLayout({ children }) {
  return children;
}
