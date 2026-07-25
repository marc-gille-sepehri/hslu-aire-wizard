// Client for the document→Markdown / Excel-analysis converter (proxied by the
// portal to hslu-aire-doc-service).
import { apiBaseUrl } from '../../config/configuration'
import { getStoredToken } from '../auth/AuthContext'

export interface ExcelSheetSerialized {
  name: string
  serialized: string
}
export interface ExcelColumn {
  name: string
  dtype: string
  nonNull: number
  nulls: number
  unique: number
  stats?: { min: number | null; max: number | null; mean: number | null; sum: number | null }
  top?: { value: string; count: number }[]
}
export interface ExcelAnalysisSheet {
  name: string
  rows: number
  columns: ExcelColumn[]
  sample: Record<string, unknown>[]
}
export interface ExcelResult {
  filename: string
  markdown: string
  serialized: ExcelSheetSerialized[]
  analysis: ExcelAnalysisSheet[]
}
export interface ConvertResult {
  kind: 'markdown' | 'excel'
  filename: string
  markdown?: string
  excel?: ExcelResult
}

export async function convertDocument(file: File): Promise<ConvertResult> {
  const token = getStoredToken()
  const res = await fetch(`${apiBaseUrl}/training/convert`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': file.type || 'application/octet-stream',
      'X-Filename': encodeURIComponent(file.name),
    },
    body: file,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((body as { error?: string }).error || `Konvertierung fehlgeschlagen (${res.status})`)
  return body as ConvertResult
}
