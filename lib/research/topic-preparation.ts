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

function getTimeoutMs(envName: string, fallback: number): number {
  const value = Number(process.env[envName])
  if (!Number.isFinite(value) || value <= 0) return fallback
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

function compactText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : fallback
}

function compactList(value: unknown, fallback: string[], limit = 4): string[] {
  if (!Array.isArray(value)) return fallback
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
  return normalized.length ? normalized : fallback
}

function clampScore(value: unknown, fallback: number): number {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return fallback
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

export function fallbackTopicBriefing(topic: string, locale: Locale, topicContext = ''): TopicBriefing {
  const contextSummary = topicContext.trim()
    ? locale === 'en'
      ? ` User-provided context says: ${trimLongText(topicContext, 220)}`
      : ` 用户提供的背景是：${trimLongText(topicContext, 220)}`
    : ''

  if (locale === 'en') {
    return {
      background: `This discussion is about "${topic}" as a real user-facing choice, not as an abstract slogan.${contextSummary}`,
      stakes: 'The useful question is how different people weigh value, cost, trust, effort, social pressure, and alternatives.',
      plainLanguageFrame: 'Treat it as a concrete decision: would someone understand it, care about it, trust it, pay for it, and keep using it?',
      focusQuestions: [
        'What practical situation would make this matter?',
        'What would make someone hesitate, reject it, or switch away?',
        'What condition would change the decision?',
      ],
      boundaries: [
        'Stay close to concrete user behavior and decision criteria.',
        'Do not drift into generic AI, pricing, or productivity talk unless it directly explains this topic.',
      ],
    }
  }

  return {
    background: `这场讨论不是泛泛评价概念，而是把「${topic}」放进真实用户会不会理解、会不会相信、会不会付费、会不会持续使用的情境里。${contextSummary}`,
    stakes: '有价值的部分在于看清不同人如何权衡收益、成本、信任、麻烦程度、圈层压力和替代方案。',
    plainLanguageFrame: '把它当成一次具体决策：这个东西对我有什么用，哪里让我犹豫，什么条件会改变我的判断。',
    focusQuestions: [
      '什么真实场景会让这个议题变得重要？',
      '用户会因为什么迟疑、拒绝或转向替代方案？',
      '哪些条件变化会让判断发生改变？',
    ],
    boundaries: [
      '始终回到具体使用行为和决策标准。',
      '不要泛泛聊 AI、价格或效率，除非能明确连接到这个议题。',
    ],
  }
}

function normalizeTopicBriefing(raw: Partial<TopicBriefing> | null | undefined, topic: string, locale: Locale, topicContext = ''): TopicBriefing {
  const fallback = fallbackTopicBriefing(topic, locale, topicContext)
  return {
    background: compactText(raw?.background, fallback.background),
    stakes: compactText(raw?.stakes, fallback.stakes),
    plainLanguageFrame: compactText(raw?.plainLanguageFrame, fallback.plainLanguageFrame),
    focusQuestions: compactList(raw?.focusQuestions, fallback.focusQuestions, 3),
    boundaries: compactList(raw?.boundaries, fallback.boundaries, 3),
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

export function buildOpeningText(topic: string, briefing: TopicBriefing, locale: Locale): string {
  const focus = briefing.focusQuestions.slice(0, 3)
  if (locale === 'en') {
    return [
      `Today's topic is "${topic}". Before we debate it, let me set the context: ${briefing.background}`,
      briefing.stakes,
      `Keep three questions in mind: ${focus.join(' / ')}`,
      'Let us start with quick introductions. Say who you are in relation to this topic, how familiar you are with it, what you instinctively care about, and one concern or expectation you bring into the discussion.',
    ].join('\n\n')
  }

  return [
    `今天的议题是「${topic}」。先把背景说清楚：${briefing.background}`,
    briefing.stakes,
    `接下来重点看三件事：${focus.join('；')}`,
    '先从简短自我介绍开始。每个人说清楚自己和这个议题的关系、熟悉程度、第一反应里最在意什么，以及带着什么担心或期待进入讨论。',
  ].join('\n\n')
}

function textOverlapScore(topic: string, topicContext: string, persona: AgentPersona): number {
  const source = [
    persona.background,
    persona.stance,
    persona.personality,
    persona.speakingStyle,
    persona.sourceSummary || '',
    ...persona.tags,
    ...persona.knowledgeDomains,
    ...persona.triggerKeywords,
    ...persona.frictionTopics,
    ...(persona.memoryProfile?.semanticMemory || []),
    ...(persona.memoryProfile?.consumptionHabits || []),
    persona.memoryProfile?.educationCognitiveStyle || '',
    persona.memoryProfile?.socialIdentity || '',
  ].join(' ').toLocaleLowerCase()

  const tokens = `${topic} ${topicContext}`
    .toLocaleLowerCase()
    .replace(/[^\w一-鿿]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2)

  if (tokens.length === 0) return 0
  const hits = tokens.filter((token) => source.includes(token)).length
  return Math.min(35, Math.round((hits / tokens.length) * 35))
}

function fallbackRelation(persona: AgentPersona, topic: string, topicContext: string, locale: Locale, grounding: TopicResearchGrounding): TopicRelationProfile {
  const overlap = textOverlapScore(topic, topicContext, persona)
  const hasDomains = persona.knowledgeDomains.length > 0 ? 10 : 0
  const hasSourceMemory = persona.memoryProfile || persona.sourceSummary ? 8 : 0
  const familiarity = Math.min(85, 25 + overlap + hasDomains + hasSourceMemory)
  const relevance = Math.min(90, 35 + overlap + Math.min(persona.triggerKeywords.length * 4, 16) + hasSourceMemory)
  const exposureLevel = exposureFromFamiliarity(familiarity)

  if (locale === 'en') {
    return {
      topic,
      familiarity,
      relevance,
      exposureLevel,
      relationSummary: `${persona.name} should approach this topic through their own background and constraints rather than as a generic expert.`,
      likelyKnownFacts: topicContext.trim()
        ? ['They can reason from their role, habits, adjacent experiences, and the user-provided topic material.']
        : ['They can reason from their role, habits, and adjacent experiences.'],
      likelyMisunderstandings: familiarity < 45 ? ['They may not know the exact terminology and should ask practical clarifying questions.'] : [],
      decisionAngles: ['Practical value', 'trust and risk', 'cost or effort', 'available alternatives'],
      visibleTraits: ['Calibrated confidence', 'personal-seeming constraints', 'non-generic judgment'],
      privateInstruction: familiarity < 45
        ? 'Do not pretend expertise. Speak from adjacent experience, ask concrete questions, and make uncertainty visible.'
        : 'Use your background to make the topic concrete and show what would change your judgment.',
      researchGrounding: grounding,
    }
  }

  return {
    topic,
    familiarity,
    relevance,
    exposureLevel,
    relationSummary: `${persona.name}应该从自己的背景、习惯和约束切入这个议题，而不是像泛泛的专家一样评价。`,
    likelyKnownFacts: topicContext.trim()
      ? ['可以基于自己的角色、消费习惯、工作或生活场景，以及用户提供的话题资料进行推理。']
      : ['可以基于自己的角色、消费习惯、工作或生活场景进行推理。'],
    likelyMisunderstandings: familiarity < 45 ? ['可能不熟悉精确术语，需要用具体问题确认到底在讨论什么。'] : [],
    decisionAngles: ['实际价值', '信任与风险', '成本或精力', '替代方案'],
    visibleTraits: ['自信度有校准', '会暴露真实约束', '判断不泛泛'],
    privateInstruction: familiarity < 45
      ? '不要假装懂。可以承认不熟，从相邻经验出发，提出具体疑问。'
      : '用自己的背景把话题具体化，并说清什么条件会改变判断。',
    researchGrounding: grounding,
  }
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
  topicContext: string,
  locale: Locale,
  grounding: TopicResearchGrounding
): TopicRelationProfile {
  const fallback = fallbackRelation(persona, topic, topicContext, locale, grounding)
  const familiarity = clampScore(raw?.familiarity, fallback.familiarity)
  const relevance = clampScore(raw?.relevance, fallback.relevance)

  return {
    topic,
    familiarity,
    relevance,
    exposureLevel: normalizeExposure(raw?.exposureLevel, familiarity),
    relationSummary: compactText(raw?.relationSummary, fallback.relationSummary),
    likelyKnownFacts: compactList(raw?.likelyKnownFacts, fallback.likelyKnownFacts, 4),
    likelyMisunderstandings: compactList(raw?.likelyMisunderstandings, fallback.likelyMisunderstandings, 4),
    decisionAngles: compactList(raw?.decisionAngles, fallback.decisionAngles, 4),
    visibleTraits: compactList(raw?.visibleTraits, fallback.visibleTraits, 4),
    privateInstruction: compactText(raw?.privateInstruction, fallback.privateInstruction),
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
  const fallbackBriefing = fallbackTopicBriefing(topic, locale, topicContext)

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
        topicContext,
        locale,
        grounding
      )
    }

    return {
      briefing: normalizeTopicBriefing(raw.briefing, topic, locale, topicContext),
      personaRelations,
      webContext,
    }
  } catch (e) {
    console.error('[TopicPreparation] LLM failed:', e)
    const personaRelations: Record<string, TopicRelationProfile> = {}
    for (const persona of personas) {
      personaRelations[persona.id] = fallbackRelation(persona, topic, topicContext, locale, grounding)
    }
    return {
      briefing: fallbackBriefing,
      personaRelations,
      webContext,
    }
  }
}
