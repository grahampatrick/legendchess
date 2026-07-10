import type { Metadata, Viewport } from 'next';

import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';
import './globals.css';

import AuthSessionSync from '../components/AuthSessionSync';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';

export const metadata: Metadata = {
  title: 'LegendChess',
  description:
    'Step into the shoes of a chess legend and find the moves they actually played. A daily chess game.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const plausibleDomain = process.env['NEXT_PUBLIC_PLAUSIBLE_DOMAIN'];
  return (
    <html lang="en">
      <head>
        {plausibleDomain && (
          <script
            defer
            data-domain={plausibleDomain}
            src="https://plausible.io/js/script.js"
          ></script>
        )}
      </head>
      <body>
        <AuthSessionSync />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
