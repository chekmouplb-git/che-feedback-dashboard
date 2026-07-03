import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CHE Feedback Hub',
  description: 'Feedback Dashboard — College of Human Ecology, UPLB',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>{children}</body>
    </html>
  );
}
