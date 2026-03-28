'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api, Tenant } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.tenants.list()
      .then(setTenants)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-muted-foreground">Cargando...</p>
  if (error) return <p className="text-destructive">{error}</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <Button asChild>
          <Link href="/tenants/new/">Nuevo Tenant</Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Webhook URL</TableHead>
            <TableHead>Creado</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.name}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{t.webhookUrl ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {new Date(t.createdAt).toLocaleDateString('es')}
              </TableCell>
              <TableCell>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/tenants/detail/?id=${t.id}`}>Ver</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {tenants.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                Sin tenants. Creá el primero.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
