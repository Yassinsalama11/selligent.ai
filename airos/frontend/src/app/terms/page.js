'use client';
import Link from 'next/link';
import Image from 'next/image';

function PageShell({ title, subtitle, children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--t1)' }}>
      <nav style={{ borderBottom: '1px solid var(--border)', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'inline-flex' }}>
            <Image src="/ChatOrAi.png" alt="ChatOrAI" width={130} height={32} style={{ height: 32, width: 'auto', objectFit: 'contain' }} priority />
          </div>
        </Link>
        <Link href="/" style={{ fontSize: 13, color: 'var(--t4)', textDecoration: 'none' }}>← Back to Home</Link>
      </nav>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '64px 32px 100px' }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Legal</div>
          <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 12 }}>{title}</h1>
          <p style={{ fontSize: 15, color: 'var(--t3)' }}>{subtitle}</p>
        </div>
        <div style={{ fontSize: 15, color: 'var(--t2)', lineHeight: 1.85 }}>{children}</div>
      </div>
      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 32px', textAlign: 'center', fontSize: 13, color: 'var(--t4)' }}>
        © {new Date().getFullYear()} ChatOrAI · <Link href="/terms" style={{ color: 'var(--t4)' }}>Terms</Link> · <Link href="/privacy" style={{ color: 'var(--t4)' }}>Privacy</Link> · <Link href="/cookies" style={{ color: 'var(--t4)' }}>Cookies</Link>
      </footer>
    </div>
  );
}
const H2 = ({ c }) => <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', marginTop: 40, marginBottom: 12 }}>{c}</h2>;
const P = ({ c }) => <p style={{ marginBottom: 16 }}>{c}</p>;
const Ul = ({ items }) => <ul style={{ marginBottom: 16, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>{items.map((it, i) => <li key={i} style={{ listStyle: 'disc' }}>{it}</li>)}</ul>;

export default function TermsPage() {
  return (
    <PageShell title="Terms of Service" subtitle={`Last updated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}>

      <P c="Please read these Terms of Service carefully before using ChatOrAI. By accessing or using our platform, you agree to be bound by these terms." />

      <H2 c="1. Acceptance of Terms" />
      <P c="By creating an account or using any part of the ChatOrAI platform, you agree to these Terms of Service and our Privacy Policy. If you are using the platform on behalf of a business, you represent that you have authority to bind that business to these terms." />

      <H2 c="2. Description of Service" />
      <P c="ChatOrAI provides an AI-powered revenue operating system for eCommerce businesses, including a unified messaging inbox, AI intent detection, lead scoring, reply generation, CRM tools, and analytics. We reserve the right to modify, suspend, or discontinue any part of the service at any time with reasonable notice." />

      <H2 c="3. Account Registration" />
      <Ul items={[
        'You must provide accurate, complete, and current information when registering',
        'You are responsible for maintaining the confidentiality of your account credentials',
        'You must be at least 18 years old to use the platform',
        'One person or entity may not maintain more than one free trial account',
        'You are responsible for all activity under your account',
      ]} />

      <H2 c="4. Subscriptions and Billing" />
      <P c="ChatOrAI offers paid subscription plans billed monthly in EUR. By subscribing, you authorize us to charge your payment method on a recurring basis." />
      <Ul items={[
        'Trial period: 7 days free, no credit card required',
        'After trial, your account locks until a paid plan is activated',
        'Subscriptions renew automatically at the end of each billing period',
        'You may cancel anytime; cancellation takes effect at the end of the current billing period',
        'No refunds for partial months except where required by law',
        'We reserve the right to change pricing with 30 days notice',
      ]} />

      <H2 c="5. Acceptable Use" />
      <P c="You agree not to use ChatOrAI to:" />
      <Ul items={[
        'Send spam, unsolicited messages, or violate anti-spam laws',
        'Harass, threaten, or harm any person',
        'Distribute malware, viruses, or malicious code',
        'Violate Meta\'s, WhatsApp\'s, or Instagram\'s platform policies',
        'Scrape, reverse engineer, or attempt to extract our source code',
        'Resell or sublicense access to the platform without written permission',
        'Use the platform for illegal activities of any kind',
      ]} />

      <H2 c="6. Meta Platform Compliance" />
      <P c="Use of WhatsApp, Instagram, and Messenger features through ChatOrAI is subject to Meta's Platform Terms and WhatsApp Business Policy. You are responsible for ensuring your use of these channels complies with Meta's policies, including message templates and opt-in requirements." />

      <H2 c="7. Data and Privacy" />
      <P c="You retain ownership of all data you upload or generate through the platform. By using ChatOrAI, you grant us a limited license to process your data solely to provide the services. See our Privacy Policy for full details." />

      <H2 c="8. Intellectual Property" />
      <P c="ChatOrAI and its original content, features, and functionality are owned by ChatOrAI and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, or distribute our platform or branding without written permission." />

      <H2 c="9. Limitation of Liability" />
      <P c="To the maximum extent permitted by law, ChatOrAI shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities, resulting from your use of the platform." />
      <P c="Our total liability to you for any claim arising from these terms shall not exceed the amount you paid us in the 3 months preceding the claim." />

      <H2 c="10. Warranty Disclaimer" />
      <P c="The platform is provided 'as is' and 'as available' without warranties of any kind. We do not warrant that the service will be uninterrupted, error-free, or meet your specific requirements." />

      <H2 c="11. Termination" />
      <P c="We may suspend or terminate your account at any time for violation of these terms, non-payment, or conduct that we reasonably believe harms the platform or other users. Upon termination, your right to use the platform ceases immediately." />

      <H2 c="12. Governing Law" />
      <P c="These Terms are governed by the laws of Egypt. Any disputes shall be resolved in the competent courts of Egypt, or through binding arbitration at our election." />

      <H2 c="13. Changes to Terms" />
      <P c="We may update these Terms at any time. We will notify you by email at least 14 days before material changes take effect. Continued use after the effective date constitutes acceptance." />

      <H2 c="14. Contact" />
      <P c="For questions about these Terms, email legal@chatorai.com." />

    </PageShell>
  );
}
