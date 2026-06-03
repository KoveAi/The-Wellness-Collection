import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { Providers } from './providers'
import { Analytics } from '@vercel/analytics/react'
import Nav from '@/app/components/Nav'
import FloatingHelp from '@/app/components/FloatingHelp'
import DirectionManager from '@/app/components/DirectionManager'
import ScrollReveal from '@/app/components/ScrollReveal'
import DrmGuard from '@/app/components/DrmGuard'
export const metadata: Metadata = {
  title: 'The Wellness Collection',
  description: 'Online courses designed to help you understand yourself, heal your patterns, and move forward with clarity and intention.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/favicon-180x180.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
       <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0 }} suppressHydrationWarning>
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '1287542176224400');
          fbq('track', 'PageView');
        `}</Script>
        <noscript>
          <img height="1" width="1" style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1287542176224400&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <Providers>
          <DrmGuard />
          <DirectionManager />
          <Nav />
          {children}
          <FloatingHelp />
          <ScrollReveal />
          <Analytics />
        </Providers>
      </body>
    </html>
  )}
