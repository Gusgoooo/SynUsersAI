import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import type { EvidenceUnit, PopulationSource, PopulationSourceType } from './types'

const MAX_CELL_CHARS = 500
const MAX_UNIT_CHARS = 1100
const DOC_CHUNK_CHARS = 900
const DOC_CHUNK_OVERLAP = 120

function extensionOf(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

export function detectSourceType(filename: string, mime = ''): PopulationSourceType {
  const ext = extensionOf(filename)
  if (ext === 'csv' || mime.includes('csv')) return 'csv'
  if (['xlsx', 'xls'].includes(ext) || mime.includes('spreadsheet') || mime.includes('excel')) return 'excel'
  if (ext === 'docx' || mime.includes('wordprocessingml')) return 'docx'
  if (['txt', 'md'].includes(ext) || mime.startsWith('text/')) return 'text'
  return 'unknown'
}

function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function compactCell(value: unknown): string {
  const text = cleanText(value)
  return text.length > MAX_CELL_CHARS ? `${text.slice(0, MAX_CELL_CHARS)}...` : text
}

function createSource(file: File, type: PopulationSourceType): PopulationSource {
  return {
    id: crypto.randomUUID(),
    name: file.name,
    type,
    size: file.size,
    unitCount: 0,
  }
}

function createEvidenceUnit(
  source: PopulationSource,
  locator: string,
  text: string,
  fields?: Record<string, string>
): EvidenceUnit | null {
  const cleaned = cleanText(text)
  if (cleaned.length < 8) return null
  return {
    id: `E${crypto.randomUUID().slice(0, 8)}`,
    sourceId: source.id,
    sourceName: source.name,
    sourceType: source.type,
    locator,
    text: cleaned.length > MAX_UNIT_CHARS ? `${cleaned.slice(0, MAX_UNIT_CHARS)}...` : cleaned,
    fields,
  }
}

function rowToEvidenceText(row: Record<string, unknown>): { text: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {}
  const parts: string[] = []

  for (const [key, value] of Object.entries(row)) {
    const label = cleanText(key)
    const cell = compactCell(value)
    if (!label || !cell) continue
    fields[label] = cell
    parts.push(`${label}: ${cell}`)
  }

  return { text: parts.join('\n'), fields }
}

async function parseWorkbook(file: File, source: PopulationSource): Promise<EvidenceUnit[]> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const units: EvidenceUnit[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    })

    rows.forEach((row, index) => {
      const { text, fields } = rowToEvidenceText(row)
      const unit = createEvidenceUnit(source, `${sheetName} row ${index + 2}`, text, fields)
      if (unit) units.push(unit)
    })
  }

  return units
}

function chunkPlainText(text: string): string[] {
  const paragraphs = cleanText(text)
    .split(/\n{2,}|\r\n{2,}/)
    .map((p) => cleanText(p))
    .filter(Boolean)

  const chunks: string[] = []
  let current = ''

  for (const paragraph of paragraphs) {
    if ((current + '\n\n' + paragraph).trim().length <= DOC_CHUNK_CHARS) {
      current = current ? `${current}\n\n${paragraph}` : paragraph
      continue
    }

    if (current) chunks.push(current)
    if (paragraph.length <= DOC_CHUNK_CHARS) {
      current = paragraph
      continue
    }

    for (let start = 0; start < paragraph.length; start += DOC_CHUNK_CHARS - DOC_CHUNK_OVERLAP) {
      chunks.push(paragraph.slice(start, start + DOC_CHUNK_CHARS).trim())
    }
    current = ''
  }

  if (current) chunks.push(current)
  return chunks
}

async function parseDocx(file: File, source: PopulationSource): Promise<EvidenceUnit[]> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const result = await mammoth.extractRawText({ buffer })
  return chunkPlainText(result.value)
    .map((chunk, index) => createEvidenceUnit(source, `chunk ${index + 1}`, chunk))
    .filter((unit): unit is EvidenceUnit => Boolean(unit))
}

async function parseText(file: File, source: PopulationSource): Promise<EvidenceUnit[]> {
  const text = await file.text()
  return chunkPlainText(text)
    .map((chunk, index) => createEvidenceUnit(source, `chunk ${index + 1}`, chunk))
    .filter((unit): unit is EvidenceUnit => Boolean(unit))
}

export async function parsePopulationFiles(files: File[]): Promise<{
  sources: PopulationSource[]
  evidenceUnits: EvidenceUnit[]
}> {
  const sources: PopulationSource[] = []
  const evidenceUnits: EvidenceUnit[] = []

  for (const file of files) {
    const type = detectSourceType(file.name, file.type)
    const source = createSource(file, type)
    let units: EvidenceUnit[]

    if (type === 'csv' || type === 'excel') {
      units = await parseWorkbook(file, source)
    } else if (type === 'docx') {
      units = await parseDocx(file, source)
    } else if (type === 'text') {
      units = await parseText(file, source)
    } else {
      throw new Error(`Unsupported file type: ${file.name}`)
    }

    source.unitCount = units.length
    sources.push(source)
    evidenceUnits.push(...units)
  }

  return { sources, evidenceUnits }
}
