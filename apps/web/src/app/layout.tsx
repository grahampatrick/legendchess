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

// Plausible's site-keyed snippet (2025+ onboarding): the queue shim below
// makes window.plausible callable before the script loads, so lib/analytics
// track() works unchanged. Env-gated — no key, no analytics, no requests.
const PLAUSIBLE_INIT =
  'window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const plausibleScriptId = process.env['NEXT_PUBLIC_PLAUSIBLE_SCRIPT_ID'];
  return (
    <html lang="en">
      <head>
        {plausibleScriptId && (
          <>
            <script async src={`https://plausible.io/js/${plausibleScriptId}.js`}></script>
            <script dangerouslySetInnerHTML={{ __html: PLAUSIBLE_INIT }} />
          </>
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
