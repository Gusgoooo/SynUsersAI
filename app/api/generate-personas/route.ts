import { chatCompletionJSON, type ModelProvider } from '@/lib/engine/llm'
import { languageInstruction, normalizeLocale } from '@/lib/locale'
import { createRuntimePersonaState, normalizeBiases, normalizeOcean } from '@/lib/persona/defaults'
import { parseRequestProviderConfig } from '@/lib/llm/request-config'
import { generateTopicPreparation } from '@/lib/research/topic-preparation'
import type { AgentPersona, EngagementCurve } from '@/lib/engine/types'
import { buildFlowProgress, type FlowProgressEvent } from '@/lib/flow-progress'
import { normalizePersonaDisplayNames } from '@/lib/persona/names'
import { getPublicErrorMessage } from '@/lib/error-message'

export const runtime = 'nodejs'
export const maxDuration = 240

function normalizeEngagementCurve(value: unknown): EngagementCurve {
  if (value === 'steady' || value === 'fading' || value === 'warming' || value === 'burst' || value === 'erratic') {
    return value
  }
  return 'steady'
}

interface GeneratePersonasInput {
  topic: string
  topicContext?: string
  crowdDescription?: string
  agentCount?: number
  model?: string
  language?: string
  llmConfig?: unknown
}

type ProgressEmitter = (progress: FlowProgressEvent) => void | Promise<void>

async function buildGeneratedPersonas(input: GeneratePersonasInput, emit?: ProgressEmitter) {
  const { topic, topicContext = '', crowdDescription, agentCount = 4, model = 'gpt-5.5', language = 'zh', llmConfig } = input
  const locale = normalizeLocale(language)
  const providerConfig = parseRequestProviderConfig(llmConfig)
  const topicMaterial = String(topicContext || '').trim()

  async function emitStep(step: string, detail?: string) {
    await emit?.(buildFlowProgress(locale, 'generated', step, detail))
  }

  await emitStep('validate-input')

  const prompt = locale === 'en'
    ? `Generate ${agentCount} diverse virtual users for a group discussion about "${topic}".

${crowdDescription ? `Target audience: ${crowdDescription}.` : ''}
${topicMaterial ? `Topic material provided by the user:\n${topicMaterial.slice(0, 3000)}\n` : ''}

Language and cultural context:
${languageInstruction(locale)}

Each user must follow this JSON structure:
{
  "name": "English first name or realistic display name",
  "background": "1-2 concise English sentences about work/life background and relationship to the topic",
  "personality": "Short English phrase describing temperament and communication style",
  "stance": "One clear sentence stating this person's initial view",
  "speakingStyle": "Short structural language style: sentence length, directness, vocabulary density, jargon level, emotional temperature",
  "knowledgeDomains": ["domain 1","domain 2"],
  "triggerKeywords": ["keyword 1","keyword 2","keyword 3"],
  "frictionTopics": ["sensitive topic 1","sensitive topic 2"],
  "tags": ["tag 1","tag 2","tag 3"],
  "engagementCurve": "steady|fading|warming|burst|erratic",
  "ocean": {"openness":0-100,"conscientiousness":0-100,"extraversion":0-100,"agreeableness":0-100,"neuroticism":0-100},
  "biases": {"noveltyResistance":0-100,"authorityDeference":0-100,"lossAversion":0-100,"confirmationBias":0-100,"socialProof":0-100,"anchoring":0-100}
}

Requirements:
- Make the personas meaningfully different from one another.
- Include at least one combative participant (low agreeableness, high neuroticism).
- Include at least one quiet but thoughtful participant (low extraversion).
- Keep ocean/biases mostly between 15 and 95; do not make everyone average.
- Biases must match the person's background and decision style.
- Treat this profile as an execution contract for later chat: background, personality, stance, speakingStyle, knowledgeDomains, triggers, friction topics, OCEAN, and biases must be mutually consistent.
- speakingStyle must be concrete enough to control actual sentence rhythm, vocabulary, directness, and emotional temperature.
- speakingStyle is not a catchphrase list. Do not write "often says...", "likes to use...", repeated signature words, verbal tics, or slogans. It should describe latent register and rhythm.
- Use natural English names, tags, domains, triggers, and friction topics.

Return raw JSON only, no markdown: {"agents":[...]}`
    : `生成${agentCount}个讨论"${topic}"的多元角色。${crowdDescription ? `目标人群：${crowdDescription}。` : ''}
${topicMaterial ? `用户提供的话题资料：\n${topicMaterial.slice(0, 3000)}\n` : ''}

语言与文化语境：
${languageInstruction(locale)}

每个角色JSON结构：
{
  "name": "英文名",
  "background": "50-80字中文，职业背景与话题关系",
  "personality": "20-30字，性格与沟通风格",
  "stance": "一句话立场",
  "speakingStyle": "15-24字，结构性表达风格：句长、直接程度、词汇密度、术语密度、情绪温度",
  "knowledgeDomains": ["领域1","领域2"],
  "triggerKeywords": ["词1","词2","词3"],
  "frictionTopics": ["雷区1","雷区2"],
  "tags": ["标签1","标签2","标签3"],
  "engagementCurve": "steady|fading|warming|burst|erratic",
  "ocean": {"openness":0-100,"conscientiousness":0-100,"extraversion":0-100,"agreeableness":0-100,"neuroticism":0-100},
  "biases": {"noveltyResistance":0-100,"authorityDeference":0-100,"lossAversion":0-100,"confirmationBias":0-100,"socialProof":0-100,"anchoring":0-100}
}

要求：角色间性格差异大；至少1个攻击性强(低agreeableness高neuroticism)、1个沉默深刻(低extraversion)；ocean/biases值域15-95不要全50；偏见与背景一致。
画像是后续聊天的执行契约：background、personality、stance、speakingStyle、knowledgeDomains、triggerKeywords、frictionTopics、OCEAN 和 biases 必须互相一致。
speakingStyle 必须具体到能影响真实句长、词汇、直接程度和情绪温度，不能只是空泛标签。
speakingStyle 不是口头禅清单。不要写"常说..."、"喜欢用..."、固定口头禅、标志性词汇或宣传口号；它应该描述底层语域和节奏。

直接返回JSON，不要markdown包裹：{"agents":[...]}`

  await emitStep('compose-persona-prompt')
  await emitStep('generate-personas')
  const result = await chatCompletionJSON<{ agents: Array<{
    name: string
    background: string
    personality: string
    stance: string
    speakingStyle: string
    knowledgeDomains: string[]
    triggerKeywords: string[]
    frictionTopics: string[]
    tags: string[]
    engagementCurve: string
    ocean: { openness: number; conscientiousness: number; extraversion: number; agreeableness: number; neuroticism: number }
    biases: { noveltyResistance: number; authorityDeference: number; lossAversion: number; confirmationBias: number; socialProof: number; anchoring: number }
  }> }>(
    [{ role: 'user', content: prompt }],
    { temperature: 0.9, maxTokens: 4096, model: model as ModelProvider, providerConfig }
  )

  await emitStep('normalize-personas')
  const agents: AgentPersona[] = normalizePersonaDisplayNames(result.agents.map((agent) => ({
    id: crypto.randomUUID(),
    name: agent.name,
    background: agent.background || '',
    personality: agent.personality || '',
    stance: agent.stance || '',
    speakingStyle: agent.speakingStyle || '',
    knowledgeDomains: agent.knowledgeDomains || [],
    triggerKeywords: agent.triggerKeywords || [],
    frictionTopics: agent.frictionTopics || [],
    tags: agent.tags || [],
    engagementCurve: normalizeEngagementCurve(agent.engagementCurve),
    ocean: normalizeOcean(agent.ocean),
    biases: normalizeBiases(agent.biases),
    ...createRuntimePersonaState(),
  })))

  await emitStep('prepare-topic-relation')
  try {
    const topicPreparation = await generateTopicPreparation(
      topic,
      agents,
      model as ModelProvider,
      locale,
      providerConfig,
      topicMaterial
    )
    for (const agent of agents) {
      agent.topicRelation = topicPreparation.personaRelations[agent.id]
    }
  } catch (error) {
    console.warn('[GeneratePersonas] Topic relation preparation skipped:', error)
  }

  await emitStep('finalize-preview')
  return { agents }
}

function streamJsonResponse(input: GeneratePersonasInput) {
  const encoder = new TextEncoder()
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  async function send(event: string, data: unknown) {
    await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
  }

  ;(async () => {
    try {
      const result = await buildGeneratedPersonas(input, (progress) => send('progress', progress))
      await send('result', result)
      await send('done', {})
    } catch (err) {
      console.error('[generate-personas] Error:', err)
      await send('error', { message: getPublicErrorMessage(err, normalizeLocale(input.language)) })
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
  const input = await req.json() as GeneratePersonasInput
  if (req.headers.get('accept')?.includes('text/event-stream')) {
    return streamJsonResponse(input)
  }

  try {
    const result = await buildGeneratedPersonas(input)
    return Response.json(result)
  } catch (err) {
    console.error('[generate-personas] Error:', err)
    return Response.json({ error: getPublicErrorMessage(err, normalizeLocale(input.language)) }, { status: 500 })
  }
}
