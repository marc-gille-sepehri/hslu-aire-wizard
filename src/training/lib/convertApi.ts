// Client for the document→Markdown / Excel-analysis converter (proxied by the
// portal to hslu-aire-doc-service).
import { apiBaseUrl } from '../../config/configuration'
import { getStoredToken } from '../auth/AuthContext'

export interface CellsSheet {
  name: string
  text: string
  rows: number
  cells: number
}
/**
 * Cell-addressed serialization. `applicable` is false for inputs without table
 * structure (PDF, DOCX, .xls) — the conversion still succeeds, only this pane
 * carries an explanation instead of content.
 */
export interface CellsResult {
  applicable: boolean
  message?: string
  text?: string
  sheets?: CellsSheet[]
  formulaMode?: FormulaMode
  requestedFormulaMode?: FormulaMode
  truncated?: boolean
  warnings?: string[]
}
export type OutputFormat = 'markdown' | 'cells' | 'both'
export type FormulaMode = 'silent' | 'error' | 'formula'
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
  analysis: ExcelAnalysisSheet[]
  cells?: CellsResult
}
export interface ConvertResult {
  kind: 'markdown' | 'excel'
  filename: string
  markdown?: string
  excel?: ExcelResult
  /** Present on non-spreadsheet responses when cells were requested. */
  cells?: CellsResult
}

export async function convertDocument(
  file: File,
  opts: { outputFormat?: OutputFormat; formulaMode?: FormulaMode } = {},
): Promise<ConvertResult> {
  const token = getStoredToken()
  const query = new URLSearchParams()
  if (opts.outputFormat) query.set('outputFormat', opts.outputFormat)
  if (opts.formulaMode) query.set('formulaMode', opts.formulaMode)
  const qs = query.toString()
  const res = await fetch(`${apiBaseUrl}/training/convert${qs ? `?${qs}` : ''}`, {
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
