import type { Metadata, Viewport } from 'next';

import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Play the Legend',
  description:
    'Step into the shoes of a chess legend and find the moves they actually played. A daily chess game.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
