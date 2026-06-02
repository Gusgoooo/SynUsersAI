import { chatCompletionJSON, type ModelProvider } from '@/lib/engine/llm'
import type { AgentPersona } from '@/lib/engine/types'
import type { Locale } from '@/lib/locale'
import type { LLMProviderConfigInput } from '@/lib/llm/provider-config'
import type { TopicExposureLevel, TopicRelationProfile, TopicResearchGrounding } from '@/lib/persona/types'
import { searchTopicWeb, type TopicWebContext, type WebSearchResult } from '@/lib/research/web-search'

export interface TopicBriefing {
  background: string
  stakes: string
  plainLanguageFrame: string
  focusQuestions: string[]
  boundaries: string[]
}

export interface TopicPreparation {
  briefing: TopicBriefing
  personaRelations: Record<string, TopicRelationProfile>
  webContext: TopicWebContext
}

interface RawTopicPreparation {
  briefing?: Partial<TopicBriefing>
  personaRelations?: Array<Partial<TopicRelationProfile> & { personaId?: string; name?: string }>
}

function getTimeoutMs(envName: string, defaultValue: number): number {
  const value = Number(process.env[envName])
  if (!Number.isFinite(value) || value <= 0) return defaultValue
  return Math.max(3000, Math.min(value, 120000))
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout)
  })
}

function compactText(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

function requiredText(value: unknown, field: string): string {
  const text = compactText(value)
  if (!text) throw new Error(`Topic preparation missing required field: ${field}`)
  return text
}

function compactList(value: unknown, limit = 4): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const item of value) {
    const text = compactText(item)
    if (!text) continue
    const key = text.toLocaleLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push(text)
    if (normalized.length >= limit) break
  }
  return normalized
}

function requiredList(value: unknown, field: string, limit = 4): string[] {
  const list = compactList(value, limit)
  if (list.length === 0) throw new Error(`Topic preparation missing required list: ${field}`)
  return list
}

function requiredScore(value: unknown, field: string): number {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) throw new Error(`Topic preparation missing required score: ${field}`)
  return Math.max(0, Math.min(100, Math.round(numberValue)))
}

function exposureFromFamiliarity(familiarity: number): TopicExposureLevel {
  if (familiarity >= 78) return 'expert'
  if (familiarity >= 55) return 'informed'
  if (familiarity >= 28) return 'aware'
  return 'unaware'
}

function normalizeExposure(value: unknown, familiarity: number): TopicExposureLevel {
  if (value === 'unaware' || value === 'aware' || value === 'informed' || value === 'expert') return value
  return exposureFromFamiliarity(familiarity)
}

function trimLongText(value: string, limit: number): string {
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (normalized.length <= limit) return normalized
  return `${normalized.slice(0, limit).trim()}...`
}

function normalizeTopicBriefing(raw: Partial<TopicBriefing> | null | undefined): TopicBriefing {
  return {
    background: requiredText(raw?.background, 'briefing.background'),
    stakes: requiredText(raw?.stakes, 'briefing.stakes'),
    plainLanguageFrame: requiredText(raw?.plainLanguageFrame, 'briefing.plainLanguageFrame'),
    focusQuestions: requiredList(raw?.focusQuestions, 'briefing.focusQuestions', 3),
    boundaries: requiredList(raw?.boundaries, 'briefing.boundaries', 3),
  }
}

export function formatTopicBriefing(briefing: TopicBriefing, locale: Locale): string {
  const focus = briefing.focusQuestions.join(locale === 'en' ? ' / ' : '；')
  const boundaries = briefing.boundaries.join(locale === 'en' ? ' / ' : '；')
  return locale === 'en'
    ? `Background: ${briefing.background}
Why it matters: ${briefing.stakes}
Plain-language frame: ${briefing.plainLanguageFrame}
Focus questions: ${focus}
Discussion boundaries: ${boundaries}`
    : `背景：${briefing.background}
为什么值得讨论：${briefing.stakes}
人话解释：${briefing.plainLanguageFrame}
重点问题：${focus}
讨论边界：${boundaries}`
}

function normalizeGrounding(hasWebResults: boolean, hasUserContext: boolean): TopicResearchGrounding {
  if (hasWebResults && hasUserContext) return 'mixed'
  if (hasWebResults) return 'web'
  if (hasUserContext) return 'user'
  return 'inferred'
}

function normalizeRelation(
  raw: Partial<TopicRelationProfile> | undefined,
  persona: AgentPersona,
  topic: string,
  grounding: TopicResearchGrounding
): TopicRelationProfile {
  if (!raw) throw new Error(`Topic preparation missing relation for persona: ${persona.name}`)
  const familiarity = requiredScore(raw.familiarity, `${persona.name}.familiarity`)
  const relevance = requiredScore(raw.relevance, `${persona.name}.relevance`)

  return {
    topic,
    familiarity,
    relevance,
    exposureLevel: normalizeExposure(raw?.exposureLevel, familiarity),
    relationSummary: requiredText(raw.relationSummary, `${persona.name}.relationSummary`),
    likelyKnownFacts: requiredList(raw.likelyKnownFacts, `${persona.name}.likelyKnownFacts`, 4),
    likelyMisunderstandings: compactList(raw.likelyMisunderstandings, 4),
    decisionAngles: requiredList(raw.decisionAngles, `${persona.name}.decisionAngles`, 4),
    visibleTraits: requiredList(raw.visibleTraits, `${persona.name}.visibleTraits`, 4),
    privateInstruction: requiredText(raw.privateInstruction, `${persona.name}.privateInstruction`),
    researchGrounding: grounding,
  }
}

function formatPersonaSignals(personas: AgentPersona[], locale: Locale): string {
  return personas
    .map((p) => {
      const memorySignals = p.memoryProfile
        ? [
            ...p.memoryProfile.semanticMemory.slice(0, 2),
            ...p.memoryProfile.consumptionHabits.slice(0, 1),
            p.memoryProfile.educationCognitiveStyle,
            p.memoryProfile.socialIdentity,
          ].filter(Boolean).join('; ')
        : ''
      return locale === 'en'
        ? `${p.id} | ${p.name}: ${p.background}; stance: ${p.stance}; domains: ${p.knowledgeDomains.join(', ')}; memory signals: ${memorySignals || p.sourceSummary || 'none'}`
        : `${p.id} | ${p.name}：${p.background}；立场：${p.stance}；领域：${p.knowledgeDomains.join('、')}；记忆线索：${memorySignals || p.sourceSummary || '无'}`
    })
    .join('\n')
}

function formatWebSignals(results: WebSearchResult[], locale: Locale): string {
  if (results.length === 0) {
    return locale === 'en'
      ? 'No live web results are available. Infer cautiously from persona data and the topic text.'
      : '没有可用的实时联网结果。请谨慎基于人设数据和议题文本推断。'
  }

  return results.slice(0, 10).map((item, index) => {
    const prefix = `${index + 1}. ${item.title}`
    return `${prefix}
URL: ${item.url}
Snippet: ${item.snippet}`
  }).join('\n\n')
}

function formatUserTopicContext(topicContext: string, locale: Locale): string {
  const normalized = topicContext.trim()
  if (!normalized) {
    return locale === 'en'
      ? 'No user-provided topic material. Build the topic frame cautiously from the topic text and persona memory.'
      : '没有用户提供的话题资料。请谨慎基于话题文本和人设记忆建立讨论框架。'
  }

  return trimLongText(normalized, 3500)
}

function findRawRelation(
  rawRelations: RawTopicPreparation['personaRelations'],
  persona: AgentPersona
): Partial<TopicRelationProfile> | undefined {
  return rawRelations?.find((item) => item.personaId === persona.id || item.name === persona.name)
}

export async function generateTopicPreparation(
  topic: string,
  personas: AgentPersona[],
  model: ModelProvider,
  locale: Locale,
  providerConfig?: LLMProviderConfigInput,
  topicContext = ''
): Promise<TopicPreparation> {
  let webContext: TopicWebContext
  try {
    webContext = await withTimeout(
      searchTopicWeb(topic, personas, locale),
      getTimeoutMs('WEB_SEARCH_TIMEOUT_MS', 10000),
      'Topic web research'
    )
  } catch (e) {
    console.warn('[TopicPreparation] Web research skipped:', e)
    webContext = {
      enabled: false,
      queries: [],
      results: [],
      error: e instanceof Error ? e.message : String(e),
    }
  }

  const hasUserContext = topicContext.trim().length > 0
  const grounding = normalizeGrounding(webContext.results.length > 0, hasUserContext)
  const systemPrompt = locale === 'en'
    ? `You are a senior user-research moderator and persona analyst.

Your task is to prepare a synthetic-user roundtable. User-provided topic material is the highest-priority context. Use live web snippets when available, but do not turn the agents into search-result quoters.

You must produce:
1. A neutral topic briefing that makes the topic understandable.
2. A topic relation profile for every persona.

Important:
- Do not make every persona equally knowledgeable.
- Some personas should be unfamiliar, skeptical, confused, or only indirectly affected if their background supports that.
- Calibrate familiarity and relevance separately.
- If user-provided material exists, use it to define what the topic means in this product or research setting.
- If neither user material nor web results are available, infer a discussion frame but make uncertainty explicit in persona relations.
- The context is private research material. Later chat should sound human, not cited.`
    : `你是资深用户研究主持人和人设分析师。

你的任务是为一场虚拟用户圆桌做准备。用户提供的话题资料是最高优先级语境。可以使用联网摘要，但不要把 agent 变成搜索结果复读机。

你必须产出：
1. 一段中立的议题 briefing，让不了解话题的人也知道在聊什么。
2. 每个 persona 与议题的关系画像。

重要：
- 不要让所有人都同样懂这个话题。
- 如果背景支持，有些人应该表现为不熟、怀疑、误解或只是间接受影响。
- 熟悉度和相关度要分开判断。
- 如果用户提供了资料，用它定义这个议题在当前产品或研究场景中的真实含义。
- 如果既没有用户资料也没有联网结果，可以做讨论框架推断，但要在每个人设关系里体现不确定性。
- 所有上下文都是后台研究材料。后续聊天要像真人内化后的表达，不要引用网页或资料。`

  const userPrompt = locale === 'en'
    ? `Research topic: "${topic}"

User-provided topic material:
${formatUserTopicContext(topicContext, locale)}

Live web/context signals:
${formatWebSignals(webContext.results, locale)}

Personas:
${formatPersonaSignals(personas, locale)}

Return raw JSON only:
{
  "briefing": {
    "background": "2-3 plain sentences explaining the topic in real user terms",
    "stakes": "1 sentence explaining why this is worth discussing",
    "plainLanguageFrame": "1 sentence translating the topic into a concrete user decision",
    "focusQuestions": ["question 1", "question 2", "question 3"],
    "boundaries": ["discussion boundary 1", "discussion boundary 2"]
  },
  "personaRelations": [
    {
      "personaId": "must match the persona id above",
      "familiarity": 0,
      "relevance": 0,
      "exposureLevel": "unaware | aware | informed | expert",
      "relationSummary": "how this persona intersects with the topic",
      "likelyKnownFacts": ["what they probably know from their background or the provided material"],
      "likelyMisunderstandings": ["what they may misunderstand, overgeneralize, or not know"],
      "decisionAngles": ["what criteria they will use to judge the topic"],
      "visibleTraits": ["what traits should show up in this topic discussion"],
      "privateInstruction": "how to calibrate their confidence and behavior in chat"
    }
  ]
}`
    : `调研议题：「${topic}」

用户提供的话题资料：
${formatUserTopicContext(topicContext, locale)}

联网/上下文线索：
${formatWebSignals(webContext.results, locale)}

虚拟用户：
${formatPersonaSignals(personas, locale)}

只输出 JSON：
{
  "briefing": {
    "background": "用2-3句人话解释这个议题在真实用户语境里是什么意思",
    "stakes": "用1句话说明为什么这个议题值得讨论",
    "plainLanguageFrame": "用1句话把议题翻译成一个具体用户决策",
    "focusQuestions": ["问题1", "问题2", "问题3"],
    "boundaries": ["讨论边界1", "讨论边界2"]
  },
  "personaRelations": [
    {
      "personaId": "必须匹配上面的 persona id",
      "familiarity": 0,
      "relevance": 0,
      "exposureLevel": "unaware | aware | informed | expert",
      "relationSummary": "这个 persona 和议题有什么交叉",
      "likelyKnownFacts": ["他基于自身背景或用户资料大概率知道什么"],
      "likelyMisunderstandings": ["他可能误解、过度泛化或不知道什么"],
      "decisionAngles": ["他会用什么标准判断这个议题"],
      "visibleTraits": ["在这个话题中应该展现出什么特点"],
      "privateInstruction": "聊天时如何校准他的自信度和行为"
    }
  ]
}`

  try {
    const raw = await withTimeout(
      chatCompletionJSON<RawTopicPreparation>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.55, maxTokens: 2200, model, providerConfig }
      ),
      getTimeoutMs('TOPIC_PREPARATION_TIMEOUT_MS', 45000),
      'Topic preparation'
    )

    const personaRelations: Record<string, TopicRelationProfile> = {}
    for (const persona of personas) {
      personaRelations[persona.id] = normalizeRelation(
        findRawRelation(raw.personaRelations, persona),
        persona,
        topic,
        grounding
      )
    }

    return {
      briefing: normalizeTopicBriefing(raw.briefing),
      personaRelations,
      webContext,
    }
  } catch (e) {
    console.error('[TopicPreparation] LLM failed:', e)
    throw new Error(locale === 'en' ? 'Topic preparation failed. No substitute topic profile was generated.' : '话题关系准备失败。系统不会生成替代话题画像。')
  }
}
