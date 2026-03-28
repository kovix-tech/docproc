const API_BASE =
  typeof window !== 'undefined' && window.location.port === '3004'
    ? 'http://localhost:3002'
    : '';

export interface ReviewField {
  key: string;
  value: string | null;
  corrected: boolean;
}

export interface ReviewData {
  status: string;
  fileUrl: string | null;
  fileType: 'image' | 'pdf';
  fields: ReviewField[];
}

function decodeToken(token: string): { documentId: string } | null {
  try {
    const [, payloadB64] = token.split('.');
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as { documentId: string };
  } catch {
    return null;
  }
}

export function getDocumentIdFromToken(token: string): string | null {
  return decodeToken(token)?.documentId ?? null;
}

export async function fetchReviewData(documentId: string, token: string): Promise<ReviewData> {
  const res = await fetch(
    `${API_BASE}/v1/documents/${documentId}/review-data?token=${encodeURIComponent(token)}`,
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<ReviewData>;
}

export async function patchFields(
  documentId: string,
  token: string,
  fields: Record<string, string>,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/v1/documents/${documentId}/review-fields?token=${encodeURIComponent(token)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function confirmDocument(documentId: string, token: string): Promise<void> {
  const res = await fetch(
    `${API_BASE}/v1/documents/${documentId}/review-confirm?token=${encodeURIComponent(token)}`,
    { method: 'POST' },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function rejectDocument(documentId: string, token: string): Promise<void> {
  const res = await fetch(
    `${API_BASE}/v1/documents/${documentId}/review-reject?token=${encodeURIComponent(token)}`,
    { method: 'POST' },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export function getFileUrl(fileUrl: string, token: string): string {
  return `${API_BASE}${fileUrl}?token=${encodeURIComponent(token)}`;
}
