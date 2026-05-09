import './globals.css';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/components/theme-provider';
import FrontendErrorTracking from '@/components/FrontendErrorTracking';
import { GlobalSchema } from '@/components/seo/GlobalSchema';

export const metadata = {
  metadataBase: new URL('https://chatorai.com'),
  title: 'ChatorAI — AI Revenue Operating System',
  description: 'Turn every conversation into revenue. Unify WhatsApp, Instagram, Messenger & Live Chat with AI-powered sales automation.',
  keywords: 'AI sales, WhatsApp CRM, ecommerce chat, Arabic AI, lead scoring, ChatorAI',
  alternates: {
    canonical: 'https://chatorai.com',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <GlobalSchema />
          <FrontendErrorTracking />
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--card)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontSize: '13.5px',
                fontWeight: 500,
              },
              success: { iconTheme: { primary: '#ff5a1f', secondary: 'var(--card)' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: 'var(--card)' } },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
