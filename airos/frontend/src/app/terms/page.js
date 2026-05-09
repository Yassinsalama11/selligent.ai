'use client';

import Link from 'next/link';
import PublicPageShell from '@/components/PublicPageShell';

export default function TermsPage() {
  return (
    <PublicPageShell badge="Legal" title="Terms of Service" subtitle={`Last updated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}>
      <p>Please read these Terms of Service carefully before using ChatOrAI. By accessing or using our platform, you agree to be bound by these terms.</p>

      <h2>1. Acceptance of Terms</h2>
      <p>By creating an account or using any part of the ChatOrAI platform, you agree to these Terms of Service and our Privacy Policy. If you are using the platform on behalf of a business, you represent that you have authority to bind that business to these terms.</p>

      <h2>2. Description of Service</h2>
      <p>ChatOrAI provides an AI-powered revenue operating system for businesses, including a unified messaging inbox, AI intent detection, lead scoring, reply generation, CRM tools, and analytics. We reserve the right to modify, suspend, or discontinue any part of the service at any time with reasonable notice.</p>

      <h2>3. Account Registration</h2>
      <ul>
        <li>You must provide accurate, complete, and current information when registering</li>
        <li>You are responsible for maintaining the confidentiality of your account credentials</li>
        <li>You must be at least 18 years old to use the platform</li>
        <li>One person or entity may not maintain more than one free trial account</li>
        <li>You are responsible for all activity under your account</li>
      </ul>

      <h2>4. Subscriptions and Billing</h2>
      <p>ChatOrAI offers paid subscription plans billed monthly in EUR. By subscribing, you authorize us to charge your payment method on a recurring basis.</p>
      <ul>
        <li>Trial period: 7 days free, no credit card required</li>
        <li>After trial, your account locks until a paid plan is activated</li>
        <li>Subscriptions renew automatically at the end of each billing period</li>
        <li>You may cancel anytime; cancellation takes effect at the end of the current billing period</li>
        <li>No refunds for partial months except where required by law</li>
        <li>We reserve the right to change pricing with 30 days notice</li>
      </ul>

      <h2>5. Acceptable Use</h2>
      <p>You agree not to use ChatOrAI to:</p>
      <ul>
        <li>Send spam, unsolicited messages, or violate anti-spam laws</li>
        <li>Harass, threaten, or harm any person</li>
        <li>Distribute malware, viruses, or malicious code</li>
        <li>Violate Meta&apos;s, WhatsApp&apos;s, or Instagram&apos;s platform policies</li>
        <li>Scrape, reverse engineer, or attempt to extract our source code</li>
        <li>Resell or sublicense access to the platform without written permission</li>
        <li>Use the platform for illegal activities of any kind</li>
      </ul>

      <h2>6. Meta Platform Compliance</h2>
      <p>Use of WhatsApp, Instagram, and Messenger features through ChatOrAI is subject to Meta&apos;s Platform Terms and WhatsApp Business Policy. You are responsible for ensuring your use of these channels complies with Meta&apos;s policies, including message templates and opt-in requirements.</p>

      <h2>7. Data and Privacy</h2>
      <p>You retain ownership of all data you upload or generate through the platform. By using ChatOrAI, you grant us a limited license to process your data solely to provide the services. See our <Link href="/privacy">Privacy Policy</Link> for full details.</p>

      <h2>8. Intellectual Property</h2>
      <p>ChatOrAI and its original content, features, and functionality are owned by ChatOrAI and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, or distribute our platform or branding without written permission.</p>

      <h2>9. Limitation of Liability</h2>
      <p>To the maximum extent permitted by law, ChatOrAI shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities, resulting from your use of the platform.</p>
      <p>Our total liability to you for any claim arising from these terms shall not exceed the amount you paid us in the 3 months preceding the claim.</p>

      <h2>10. Warranty Disclaimer</h2>
      <p>The platform is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind. We do not warrant that the service will be uninterrupted, error-free, or meet your specific requirements.</p>

      <h2>11. Termination</h2>
      <p>We may suspend or terminate your account at any time for violation of these terms, non-payment, or conduct that we reasonably believe harms the platform or other users. Upon termination, your right to use the platform ceases immediately.</p>

      <h2>12. Governing Law</h2>
      <p>These Terms are governed by the laws of Egypt. Any disputes shall be resolved in the competent courts of Egypt, or through binding arbitration at our election.</p>

      <h2>13. Changes to Terms</h2>
      <p>We may update these Terms at any time. We will notify you by email at least 14 days before material changes take effect. Continued use after the effective date constitutes acceptance.</p>

      <h2>14. Contact</h2>
      <p>For questions about these Terms, email legal@chatorai.com.</p>
    </PublicPageShell>
  );
}
