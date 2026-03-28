import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'docproc Admin',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-background font-sans antialiased">
        <nav className="border-b px-6 py-3 flex items-center gap-6">
          <span className="font-semibold text-lg">docproc admin</span>
          <Link href="/tenants/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Tenants
          </Link>
        </nav>
        <main className="container mx-auto py-6 px-6">{children}</main>
      </body>
    </html>
  )
}
