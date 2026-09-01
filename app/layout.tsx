import './globals.css';
import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata: Metadata = {
  title: 'IITRPR Prom Match',
  description: 'Find your perfect prom match at IIT Ropar. Secret crushes, mutual matches, and real-time chat.',
  openGraph: {
    title: 'IITRPR Prom Match',
    description: 'Find your perfect prom match at IIT Ropar.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} font-sans bg-background text-foreground antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
