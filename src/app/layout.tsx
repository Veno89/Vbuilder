import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'Vbuilder SaaS Starter',
  description: 'Production-grade SaaS starter platform foundation'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
