import './globals.css';
import { Toaster } from 'react-hot-toast';
import FrontendErrorTracking from '@/components/FrontendErrorTracking';

export const metadata = {
  title: 'ChatOrAI — AI Revenue Operating System',
  description: 'Turn every conversation into revenue. Unify WhatsApp, Instagram, Messenger & Live Chat with AI-powered sales automation.',
  keywords: 'AI sales, WhatsApp CRM, ecommerce chat, Arabic AI, lead scoring, ChatOrAI',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <FrontendErrorTracking />
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--bg4)',
              color: 'var(--t1)',
              border: '1px solid var(--b2)',
              borderRadius: '10px',
              fontSize: '13.5px',
              fontWeight: 500,
            },
            success: { iconTheme: { primary: '#34d399', secondary: '#1e2535' } },
            error:   { iconTheme: { primary: '#fca5a5', secondary: '#1e2535' } },
          }}
        />
      </body>
    </html>
  );
}
