import { parsePopulationFiles } from '@/lib/population/parse'
import { synthesizePersonasFromEvidence } from '@/lib/population/persona-synthesis'
import { normalizeLocale } from '@/lib/locale'
import type { ModelProvider } from '@/lib/engine/llm'

export const runtime = 'nodejs'
export const maxDuration = 180

const MAX_FILES = 6
const MAX_FILE_SIZE = 8 * 1024 * 1024
const MAX_EVIDENCE_UNITS = 500

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

    const topic = String(form.get('topic') || '')
    const agentCount = Math.max(2, Math.min(12, Number(form.get('agentCount') || 4)))
    const model = String(form.get('model') || 'gpt-5.4') as ModelProvider
    const locale = normalizeLocale(String(form.get('language') || 'zh'))

    const { sources, evidenceUnits } = await parsePopulationFiles(files)
    if (evidenceUnits.length === 0) {
      return Response.json({ error: 'No usable text found in uploaded files' }, { status: 400 })
    }

    const trimmedEvidence = evidenceUnits.slice(0, MAX_EVIDENCE_UNITS)
    const { agents, summary } = await synthesizePersonasFromEvidence({
      topic,
      agentCount,
      evidenceUnits: trimmedEvidence,
      sources,
      model,
      locale,
    })

    if (agents.length === 0) {
      return Response.json({ error: 'No personas generated from uploaded evidence' }, { status: 500 })
    }

    return Response.json({ agents, summary })
  } catch (err) {
    console.error('[import-population] Error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
