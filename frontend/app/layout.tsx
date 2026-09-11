import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Apex-Quant | C++20 HFT Order Matching Engine & Monte Carlo Risk Platform',
  description: 'Microsecond-level retail and institutional market data matching engine, Monte Carlo VaR risk analytics, and 15ms live WebSocket trading terminal.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-accentBlue selection:text-white">
        {children}
      </body>
    </html>
  );
}
