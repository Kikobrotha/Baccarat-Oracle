import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Baccarat Oracle',
  description: 'Vercel-ready baccarat predictor with windsurf simulation mode.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
