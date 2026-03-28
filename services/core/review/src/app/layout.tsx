import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Revisar Documento',
  description: 'Revisión y confirmación de documentos extraídos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-background">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
