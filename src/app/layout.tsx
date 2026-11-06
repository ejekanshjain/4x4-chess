import type { Metadata } from 'next'
import { Figtree, Unbounded } from 'next/font/google'

import { InlineScript } from '@/components/inline-script'
import { THEME_SCRIPT } from '@/lib/theme'

import './globals.css'

const display = Unbounded({ variable: '--font-unbounded', subsets: ['latin'] })
const body = Figtree({ variable: '--font-body', subsets: ['latin'] })

export const metadata: Metadata = {
  title: '4x4 Chess',
  description: 'Chess on sixteen squares. Invite a colleague and play in real time.'
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  )
}
