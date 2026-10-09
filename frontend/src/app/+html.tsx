import type { PropsWithChildren } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

/** Root HTML of the web build: what makes it installable as a PWA (iPhone: Share > Add to Home Screen). */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#381636" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Meu Líder" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
