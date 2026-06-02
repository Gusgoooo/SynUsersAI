import { parsePopulationFiles } from '@/lib/population/parse'
import { synthesizePersonasFromEvidence } from '@/lib/population/persona-synthesis'
import { normalizeLocale } from '@/lib/locale'
import type { ModelProvider } from '@/lib/engine/llm'
import { parseRequestProviderConfig } from '@/lib/llm/request-config'
import { generateTopicPreparation } from '@/lib/research/topic-preparation'
import type { AgentPersona } from '@/lib/engine/types'
import { buildFlowProgress, type FlowProgressEvent } from '@/lib/flow-progress'
import type { Locale } from '@/lib/locale'
import { normalizePersonaDisplayNames } from '@/lib/persona/names'
import { getPublicErrorMessage } from '@/lib/error-message'

export const runtime = 'nodejs'
export const maxDuration = 300

const MAX_FILES = 6
const MAX_FILE_SIZE = 8 * 1024 * 1024
const MAX_EVIDENCE_UNITS = 500

class ApiError extends Error {
  status: number

  constructor(message: string, status = 500) {
    super(message)
    this.status = status
  }
}

interface ImportPopulationInput {
  files: File[]
  topic: string
  topicContext: string
  agentCount: number
  model: ModelProvider
  locale: Locale
  providerConfig?: ReturnType<typeof parseRequestProviderConfig>
}

type ProgressEmitter = (progress: FlowProgressEvent) => void | Promise<void>

function parseImportInput(form: FormData): ImportPopulationInput {
  const files = form
    .getAll('files')
    .filter((item): item is File => item instanceof File && item.size > 0)

  if (files.length === 0) {
    throw new ApiError('No files uploaded', 400)
  }
  if (files.length > MAX_FILES) {
    throw new ApiError(`Upload at most ${MAX_FILES} files at once`, 400)
  }
  const oversized = files.find((file) => file.size > MAX_FILE_SIZE)
  if (oversized) {
    throw new ApiError(`${oversized.name} is larger than 8MB`, 400)
  }

  return {
    files,
    topic: String(form.get('topic') || ''),
    topicContext: String(form.get('topicContext') || ''),
    agentCount: Math.max(2, Math.min(12, Number(form.get('agentCount') || 4))),
    model: String(form.get('model') || 'gpt-5.5') as ModelProvider,
    locale: normalizeLocale(String(form.get('language') || 'zh')),
    providerConfig: parseRequestProviderConfig(form.get('llmConfig')),
  }
}

async function buildImportedPopulation(input: ImportPopulationInput, emit?: ProgressEmitter) {
  const { files, topic, topicContext, agentCount, model, locale, providerConfig } = input

  async function emitStep(step: string, detail?: string) {
    await emit?.(buildFlowProgress(locale, 'imported', step, detail))
  }

  await emitStep('prepare-source-data')
  const { sources, evidenceUnits } = await parsePopulationFiles(files)
  if (evidenceUnits.length === 0) {
    throw new ApiError('No usable text found in uploaded files', 400)
  }

  const trimmedEvidence = evidenceUnits.slice(0, MAX_EVIDENCE_UNITS)
  const { agents, summary } = await synthesizePersonasFromEvidence({
    topic,
    agentCount,
    evidenceUnits: trimmedEvidence,
    sources,
    model,
    providerConfig,
    locale,
    onProgress: emitStep,
  })

  if (agents.length === 0) {
    throw new ApiError('No personas generated from uploaded evidence', 500)
  }

  const typedAgents = normalizePersonaDisplayNames(agents as AgentPersona[])
  await emitStep('prepare-topic-relation')
  try {
    const topicPreparation = await generateTopicPreparation(
      topic,
      typedAgents,
      model,
      locale,
      providerConfig,
      topicContext
    )
    for (const agent of typedAgents) {
      agent.topicRelation = topicPreparation.personaRelations[agent.id]
    }
  } catch (error) {
    console.warn('[ImportPopulation] Topic relation preparation skipped:', error)
  }

  await emitStep('finalize-preview')
  return { agents: typedAgents, summary }
}

function streamImportResponse(input: ImportPopulationInput) {
  const encoder = new TextEncoder()
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  async function send(event: string, data: unknown) {
    await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
  }

  ;(async () => {
    try {
      const result = await buildImportedPopulation(input, (progress) => send('progress', progress))
      await send('result', result)
      await send('done', {})
    } catch (err) {
      console.error('[import-population] Error:', err)
      await send('error', {
        message: getPublicErrorMessage(err, input.locale),
        status: err instanceof ApiError ? err.status : 500,
      })
    } finally {
      await writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

export async function POST(req: Request) {
  let input: ImportPopulationInput
  try {
    input = parseImportInput(await req.formData())
  } catch (err) {
    console.error('[import-population] Error:', err)
    const status = err instanceof ApiError ? err.status : 500
    return Response.json({ error: String(err) }, { status })
  }

  if (req.headers.get('accept')?.includes('text/event-stream')) {
    return streamImportResponse(input)
  }

  try {
    const result = await buildImportedPopulation(input)
    return Response.json(result)
  } catch (err) {
    console.error('[import-population] Error:', err)
    const status = err instanceof ApiError ? err.status : 500
    const locale = input?.locale || 'zh'
    return Response.json({ error: getPublicErrorMessage(err, locale) }, { status })
  }
}
