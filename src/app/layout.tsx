import type { Metadata } from 'next';
import { IBM_Plex_Sans_Thai } from 'next/font/google';
import { getSettings } from '@/lib/db/settings';
import './globals.css';

/* UI เป็นภาษาไทยทั้งหมด — Geist ที่ scaffold ให้มาไม่มี glyph ไทย */
const thai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-thai',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const { storeName, tagline } = await getSettings();
  return {
    title: { default: storeName, template: `%s · ${storeName}` },
    description: tagline,
  };
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="th" className={`${thai.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
