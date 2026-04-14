'use client';
import Link from 'next/link';
import Image from 'next/image';

function PageShell({ title, subtitle, children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--t1)' }}>
      <nav style={{ borderBottom: '1px solid var(--border)', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 8, padding: '4px 10px', display: 'inline-flex' }}>
            <Image src="/chatorai-logo.svg" alt="ChatOrAI" width={130} height={32} style={{ height: 32, width: 'auto', objectFit: 'contain' }} priority />
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
        <div style={{ fontSize: 15, color: 'var(--t2)', lineHeight: 1.85 }}>
          {children}
        </div>
      </div>
      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 32px', textAlign: 'center', fontSize: 13, color: 'var(--t4)' }}>
        © {new Date().getFullYear()} ChatOrAI — All rights reserved.
        <span style={{ margin: '0 12px' }}>·</span>
        <Link href="/terms" style={{ color: 'var(--t4)' }}>Terms</Link>
        <span style={{ margin: '0 12px' }}>·</span>
        <Link href="/privacy" style={{ color: 'var(--t4)' }}>Privacy</Link>
        <span style={{ margin: '0 12px' }}>·</span>
        <Link href="/cookies" style={{ color: 'var(--t4)' }}>Cookies</Link>
      </footer>
    </div>
  );
}

function H2({ children }) {
  return <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', marginTop: 40, marginBottom: 12 }}>{children}</h2>;
}
function P({ children }) {
  return <p style={{ marginBottom: 16 }}>{children}</p>;
}
function Ul({ items }) {
  return (
    <ul style={{ marginBottom: 16, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => <li key={i} style={{ listStyle: 'disc' }}>{item}</li>)}
    </ul>
  );
}

export default function PrivacyPage() {
  return (
    <PageShell title="Privacy Policy" subtitle={`Last updated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}>

      <P>ChatOrAI ("we", "us", or "our") operates the ChatOrAI platform — an AI-powered revenue operating system for eCommerce businesses. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform, website, and services.</P>
      <P>By using ChatOrAI, you agree to the collection and use of information in accordance with this policy. If you do not agree, please do not use our services.</P>

      <H2>1. Information We Collect</H2>
      <P><strong>Account information:</strong> When you register, we collect your name, email address, company name, phone number, and password.</P>
      <P><strong>Business data:</strong> Information you provide about your business, including website URL, social media profiles, products, and brand settings.</P>
      <P><strong>Conversation data:</strong> Messages sent through connected channels (WhatsApp, Instagram, Messenger, Live Chat) are processed to deliver our services, including AI intent detection and reply generation.</P>
      <P><strong>Usage data:</strong> We collect information on how you interact with the platform — pages visited, features used, and actions taken — to improve our product.</P>
      <P><strong>Payment data:</strong> Payment processing is handled by Stripe. We do not store your full card details. We retain transaction records for invoicing and compliance.</P>
      <P><strong>Technical data:</strong> IP address, browser type, device information, and cookies (see our Cookie Policy).</P>

      <H2>2. How We Use Your Information</H2>
      <Ul items={[
        'To provide, maintain, and improve our platform and services',
        'To process payments and send invoices',
        'To power AI features (intent detection, lead scoring, reply generation)',
        'To send transactional emails (account setup, trial reminders, invoices)',
        'To respond to support requests and inquiries',
        'To detect and prevent fraud, abuse, or security threats',
        'To comply with legal obligations',
      ]} />

      <H2>3. Data Sharing and Disclosure</H2>
      <P>We do not sell, rent, or trade your personal data. We share data only in the following circumstances:</P>
      <Ul items={[
        'Service providers: Stripe (payments), OpenAI (AI features), Railway (hosting), Cloudflare (CDN and security)',
        'Meta platforms: When you connect WhatsApp, Instagram, or Messenger, conversation data passes through Meta\'s APIs under their terms',
        'Legal requirements: When required by law, court order, or governmental authority',
        'Business transfers: In the event of a merger, acquisition, or sale of assets, your data may transfer to the new entity',
      ]} />

      <H2>4. Data Retention</H2>
      <P>We retain your account data for as long as your account is active. Conversation data is retained for 12 months by default, after which it is archived. You may request deletion at any time by contacting us at privacy@chatorai.com.</P>
      <P>After account deletion, we retain billing records for 7 years as required by tax law.</P>

      <H2>5. Your Rights (GDPR)</H2>
      <P>If you are located in the European Economic Area, you have the following rights:</P>
      <Ul items={[
        'Right to access: Request a copy of the data we hold about you',
        'Right to rectification: Correct inaccurate or incomplete data',
        'Right to erasure: Request deletion of your personal data',
        'Right to restriction: Request that we limit processing of your data',
        'Right to portability: Receive your data in a structured, machine-readable format',
        'Right to object: Object to processing based on legitimate interests',
        'Right to withdraw consent at any time',
      ]} />
      <P>To exercise any of these rights, email us at privacy@chatorai.com. We will respond within 30 days.</P>

      <H2>6. Data Security</H2>
      <P>We implement industry-standard security measures including TLS/HTTPS encryption in transit, AES-256 encryption at rest, JWT-based authentication, and regular security audits. However, no method of transmission over the internet is 100% secure.</P>

      <H2>7. Cookies</H2>
      <P>We use cookies and similar tracking technologies. For full details, see our <Link href="/cookies" style={{ color: '#818cf8' }}>Cookie Policy</Link>.</P>

      <H2>8. Third-Party Services</H2>
      <P>Our platform integrates with third-party services including Meta (WhatsApp, Instagram, Messenger), OpenAI, Stripe, Shopify, and WooCommerce. Each has its own privacy policy and data practices. We encourage you to review them.</P>

      <H2>9. Children's Privacy</H2>
      <P>ChatOrAI is not directed to children under 16. We do not knowingly collect personal data from children. If we become aware that a child has provided us with personal data, we will delete it immediately.</P>

      <H2>10. Changes to This Policy</H2>
      <P>We may update this Privacy Policy from time to time. We will notify registered users by email and update the "Last updated" date at the top of this page. Continued use of the platform after changes constitutes acceptance.</P>

      <H2>11. Contact Us</H2>
      <P>For privacy-related questions or requests:</P>
      <Ul items={[
        'Email: privacy@chatorai.com',
        'Address: ChatOrAI, Egypt',
        'Response time: within 30 business days',
      ]} />

    </PageShell>
  );
}
