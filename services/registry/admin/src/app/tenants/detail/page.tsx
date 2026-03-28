'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { api, DocumentType, Tenant } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

function TenantDetailContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') ?? ''
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [docTypes, setDocTypes] = useState<DocumentType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([api.tenants.get(id), api.documentTypes.list(id)])
      .then(([t, dts]) => { setTenant(t); setDocTypes(dts) })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-muted-foreground">Cargando...</p>
  if (error) return <p className="text-destructive">{error}</p>
  if (!tenant) return null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/tenants/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Tenants
          </Link>
          <h1 className="text-2xl font-bold mt-1">{tenant.name}</h1>
          {tenant.webhookUrl && (
            <p className="text-sm text-muted-foreground mt-1">{tenant.webhookUrl}</p>
          )}
        </div>
        <Button asChild>
          <Link href={`/document-types/new/?tenantId=${id}`}>
            Nuevo Tipo de Documento
          </Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Modelo</TableHead>
            <TableHead>Campos</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {docTypes.map((dt) => (
            <TableRow key={dt.id}>
              <TableCell className="font-medium">{dt.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {dt.model.replace('claude-', '').replace(/-\d+$/, '')}
              </TableCell>
              <TableCell className="text-sm">{dt.fields?.length ?? '—'}</TableCell>
              <TableCell>
                <Badge variant={dt.active ? 'default' : 'secondary'}>
                  {dt.active ? 'Activo' : 'Inactivo'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/document-types/detail/?id=${dt.id}`}>Editar</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/document-types/test/?id=${dt.id}`}>Probar</Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {docTypes.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                Sin tipos de documento.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando...</p>}>
      <TenantDetailContent />
    </Suspense>
  )
}
