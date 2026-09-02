import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { RegisterServiceWorker } from './register-sw';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://cacich.github.io/SudokuGame/'),
  title: '野牛格 — 牧場邏輯益智遊戲',
  description: '在每列、每欄與每個牧區安置一頭牛。適合 Android 手機的免費邏輯益智遊戲。',
  manifest: './manifest.webmanifest',
  icons: { icon: './icon.svg', apple: './icon.svg' },
  appleWebApp: { capable: true, title: '野牛格', statusBarStyle: 'default' },
  openGraph: { title: '野牛格 — 牧場邏輯益智遊戲', description: '一座牧場，一場安靜的推理。', images: ['./og.png'] },
  twitter: { card: 'summary_large_image', title: '野牛格 — 牧場邏輯益智遊戲', description: '一座牧場，一場安靜的推理。', images: ['./og.png'] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
