import { parsePopulationFiles } from '@/lib/population/parse'
import { getPublicErrorMessage } from '@/lib/error-message'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_FILES = 6
const MAX_FILE_SIZE = 8 * 1024 * 1024
const MAX_CONTEXT_CHARS = 14000

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const files = form
      .getAll('files')
      .filter((item): item is File => item instanceof File && item.size > 0)

    if (files.length === 0) {
      return Response.json({ error: 'No files uploaded' }, { status: 400 })
    }
    if (files.length > MAX_FILES) {
      return Response.json({ error: `Upload at most ${MAX_FILES} files at once` }, { status: 400 })
    }
    const oversized = files.find((file) => file.size > MAX_FILE_SIZE)
    if (oversized) {
      return Response.json({ error: `${oversized.name} is larger than 8MB` }, { status: 400 })
    }

    const { sources, evidenceUnits } = await parsePopulationFiles(files)
    if (evidenceUnits.length === 0) {
      return Response.json({ error: 'No usable text found in uploaded files' }, { status: 400 })
    }

    const parts: string[] = []
    for (const unit of evidenceUnits) {
      const next = `[${unit.sourceName} · ${unit.locator}]\n${unit.text}`
      const candidate = [...parts, next].join('\n\n')
      if (candidate.length > MAX_CONTEXT_CHARS) break
      parts.push(next)
    }

    const text = parts.join('\n\n')
    return Response.json({
      text,
      sources,
      evidenceCount: evidenceUnits.length,
      truncated: evidenceUnits.length > parts.length,
    })
  } catch (err) {
    console.error('[import-topic-context] Error:', err)
    return Response.json({ error: getPublicErrorMessage(err) }, { status: 500 })
  }
}
