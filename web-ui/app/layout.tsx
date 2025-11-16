import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Content Saver',
  description: 'A personal knowledge vault for notes and links',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

