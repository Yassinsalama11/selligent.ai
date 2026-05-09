'use client';

import Link from 'next/link';
import PublicPageShell from '@/components/PublicPageShell';

export default function PrivacyPage() {
  return (
    <PublicPageShell badge="Legal" title="Privacy Policy" subtitle={`Last updated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}>
      <p>ChatOrAI (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates the ChatOrAI platform — an AI-powered revenue operating system for businesses. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform, website, and services.</p>
      <p>By using ChatOrAI, you agree to the collection and use of information in accordance with this policy. If you do not agree, please do not use our services.</p>

      <h2>1. Information We Collect</h2>
      <p><strong>Account information:</strong> When you register, we collect your name, email address, company name, phone number, and password.</p>
      <p><strong>Business data:</strong> Information you provide about your business, including website URL, social media profiles, products, and brand settings.</p>
      <p><strong>Conversation data:</strong> Messages sent through connected channels (WhatsApp, Instagram, Messenger, Live Chat) are processed to deliver our services, including AI intent detection and reply generation.</p>
      <p><strong>Usage data:</strong> We collect information on how you interact with the platform — pages visited, features used, and actions taken — to improve our product.</p>
      <p><strong>Payment data:</strong> Payment processing is handled by Stripe. We do not store your full card details. We retain transaction records for invoicing and compliance.</p>
      <p><strong>Technical data:</strong> IP address, browser type, device information, and cookies (see our Cookie Policy).</p>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To provide, maintain, and improve our platform and services</li>
        <li>To process payments and send invoices</li>
        <li>To power AI features (intent detection, lead scoring, reply generation)</li>
        <li>To send transactional emails (account setup, trial reminders, invoices)</li>
        <li>To respond to support requests and inquiries</li>
        <li>To detect and prevent fraud, abuse, or security threats</li>
        <li>To comply with legal obligations</li>
      </ul>

      <h2>3. Data Sharing and Disclosure</h2>
      <p>We do not sell, rent, or trade your personal data. We share data only in the following circumstances:</p>
      <ul>
        <li>Service providers: Stripe (payments), OpenAI (AI features), Railway (hosting), Cloudflare (CDN and security)</li>
        <li>Meta platforms: When you connect WhatsApp, Instagram, or Messenger, conversation data passes through Meta&apos;s APIs under their terms</li>
        <li>Legal requirements: When required by law, court order, or governmental authority</li>
        <li>Business transfers: In the event of a merger, acquisition, or sale of assets, your data may transfer to the new entity</li>
      </ul>

      <h2>4. Data Retention</h2>
      <p>We retain your account data for as long as your account is active. Conversation data is retained for 12 months by default, after which it is archived. You may request deletion at any time by contacting us at privacy@chatorai.com.</p>
      <p>After account deletion, we retain billing records for 7 years as required by tax law.</p>

      <h2>5. Your Rights (GDPR)</h2>
      <p>If you are located in the European Economic Area, you have the following rights:</p>
      <ul>
        <li>Right to access: Request a copy of the data we hold about you</li>
        <li>Right to rectification: Correct inaccurate or incomplete data</li>
        <li>Right to erasure: Request deletion of your personal data</li>
        <li>Right to restriction: Request that we limit processing of your data</li>
        <li>Right to portability: Receive your data in a structured, machine-readable format</li>
        <li>Right to object: Object to processing based on legitimate interests</li>
        <li>Right to withdraw consent at any time</li>
      </ul>
      <p>To exercise any of these rights, email us at privacy@chatorai.com. We will respond within 30 days.</p>

      <h2>6. Data Security</h2>
      <p>We implement industry-standard security measures including TLS/HTTPS encryption in transit, AES-256 encryption at rest, JWT-based authentication, and regular security audits. However, no method of transmission over the internet is 100% secure.</p>

      <h2>7. Cookies</h2>
      <p>We use cookies and similar tracking technologies. For full details, see our <Link href="/cookies">Cookie Policy</Link>.</p>

      <h2>8. Third-Party Services</h2>
      <p>Our platform integrates with third-party services including Meta (WhatsApp, Instagram, Messenger), OpenAI, Stripe, Shopify, and WooCommerce. Each has its own privacy policy and data practices. We encourage you to review them.</p>

      <h2>9. Children&apos;s Privacy</h2>
      <p>ChatOrAI is not directed to children under 16. We do not knowingly collect personal data from children. If we become aware that a child has provided us with personal data, we will delete it immediately.</p>

      <h2>10. Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. We will notify registered users by email and update the &ldquo;Last updated&rdquo; date at the top of this page. Continued use of the platform after changes constitutes acceptance.</p>

      <h2>11. Contact Us</h2>
      <p>For privacy-related questions or requests:</p>
      <ul>
        <li>Email: privacy@chatorai.com</li>
        <li>Address: ChatOrAI, Egypt</li>
        <li>Response time: within 30 business days</li>
      </ul>
    </PublicPageShell>
  );
}
