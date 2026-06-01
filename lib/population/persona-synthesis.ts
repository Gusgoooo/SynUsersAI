import { chatCompletionJSON, cosineSimilarity, getEmbedding, type ModelProvider } from '@/lib/engine/llm'
import type { LLMProviderConfigInput } from '@/lib/llm/provider-config'
import { createRuntimePersonaState, normalizeBiases, normalizeOcean, normalizeScore } from '@/lib/persona/defaults'
import type { EngagementCurve, MemoryProfile } from '@/lib/persona/types'
import type { Locale } from '@/lib/locale'
import { languageInstruction } from '@/lib/locale'
import type { EvidenceTheme, EvidenceUnit, PersonaEvidence, PopulationImportSummary, PopulationSource } from './types'

const MAX_EVIDENCE_FOR_PROMPT = 36
const MAX_EVIDENCE_QUOTE_CHARS = 520

interface RawGeneratedPersona {
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
  sourceSummary?: string
  dataGroundingScore?: number
  memoryProfile?: Partial<MemoryProfile>
  evidence?: Array<{
    evidenceId: string
    quote?: string
    reason?: string
    weight?: number
  }>
  ocean: {
    openness: number
    conscientiousness: number
    extraversion: number
    agreeableness: number
    neuroticism: number
  }
  biases: {
    noveltyResistance: number
    authorityDeference: number
    lossAversion: number
    confirmationBias: number
    socialProof: number
    anchoring: number
  }
}

interface RawSynthesisResult {
  methodNotes?: string
  themes?: EvidenceTheme[]
  agents: RawGeneratedPersona[]
}

function truncate(text: string, max = MAX_EVIDENCE_QUOTE_CHARS): string {
  return text.length > max ? `${text.slice(0, max)}...` : text
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 8)
}

function normalizeEngagementCurve(value: unknown): EngagementCurve {
  if (value === 'steady' || value === 'fading' || value === 'warming' || value === 'burst' || value === 'erratic') {
    return value
  }
  return 'steady'
}

function normalizeMemoryProfile(raw: Partial<MemoryProfile> | undefined, locale: Locale): MemoryProfile {
  return {
    semanticMemory: normalizeStringArray(raw?.semanticMemory),
    episodicCompositeMemory: normalizeStringArray(raw?.episodicCompositeMemory),
    consumptionHabits: normalizeStringArray(raw?.consumptionHabits),
    educationCognitiveStyle: String(raw?.educationCognitiveStyle || (locale === 'en' ? 'Practical, context-sensitive reasoning style inferred from the source material.' : '从来源材料推断出的务实、语境化判断方式。')),
    socialIdentity: String(raw?.socialIdentity || (locale === 'en' ? 'Audience segment identity inferred from source patterns.' : '从来源模式中推断出的人群身份。')),
    emotionalTriggers: normalizeStringArray(raw?.emotionalTriggers),
    languageRegister: String(raw?.languageRegister || (locale === 'en' ? 'Natural conversational language matching the source audience.' : '贴近来源人群的自然口语表达。')),
    decisionHeuristics: normalizeStringArray(raw?.decisionHeuristics),
  }
}

async function rankEvidenceByTopic(evidenceUnits: EvidenceUnit[], topic: string): Promise<EvidenceUnit[]> {
  const queryEmbedding = await getEmbedding(topic || evidenceUnits.slice(0, 5).map((e) => e.text).join('\n'))

  const embedded = await Promise.all(evidenceUnits.map(async (unit) => {
    const embedding = await getEmbedding(unit.text)
    return {
      ...unit,
      embedding,
      score: cosineSimilarity(queryEmbedding, embedding),
    }
  }))

  const bySource = new Map<string, EvidenceUnit[]>()
  embedded
    .sort((a, b) => b.score - a.score)
    .forEach((unit) => {
      const bucket = bySource.get(unit.sourceId) || []
      if (bucket.length < 8) bucket.push(unit)
      bySource.set(unit.sourceId, bucket)
    })

  const balanced: EvidenceUnit[] = []
  const buckets = Array.from(bySource.values())
  for (let i = 0; balanced.length < MAX_EVIDENCE_FOR_PROMPT; i++) {
    let added = false
    for (const bucket of buckets) {
      const item = bucket[i]
      if (item) {
        balanced.push(item)
        added = true
        if (balanced.length >= MAX_EVIDENCE_FOR_PROMPT) break
      }
    }
    if (!added) break
  }

  return balanced
}

function formatEvidenceDigest(evidenceUnits: EvidenceUnit[], locale: Locale): string {
  return evidenceUnits.map((unit, index) => {
    const title = locale === 'en'
      ? `[${unit.id}] Source: ${unit.sourceName}; Location: ${unit.locator}`
      : `[${unit.id}] 来源：${unit.sourceName}；位置：${unit.locator}`
    return `${index + 1}. ${title}\n${truncate(unit.text)}`
  }).join('\n\n')
}

function createPrompt(
  topic: string,
  agentCount: number,
  evidenceUnits: EvidenceUnit[],
  sources: PopulationSource[],
  locale: Locale
): string {
  const evidenceDigest = formatEvidenceDigest(evidenceUnits, locale)
  const sourceDigest = sources.map((s) => `${s.name} (${s.type}, ${s.unitCount} evidence units)`).join('\n')

  if (locale === 'en') {
    return `You are building data-grounded synthetic user personas for SynUsersAI.

Goal:
Create ${agentCount} distinct personas for a social simulation about "${topic}".

Scientific method to follow:
- Use source-backed memory distillation: do not invent traits that are not supported by the uploaded material.
- Apply qualitative thematic analysis: identify repeated goals, pains, decision criteria, emotions, vocabulary, and contradictions.
- Use constant comparison: compare evidence units against each other before deciding a segment.
- Treat personas as data-driven representations of audience segments, not fictional characters.
- Each persona must turn source material into an internal memory system: beliefs, composite experiences, consumption habits, education/cognitive style, social identity, emotional triggers, language register, and decision heuristics.
- Keep 2-4 source anchors for traceability, but those anchors are not meant to be spoken aloud by the persona.

Language:
${languageInstruction(locale)}

Sources:
${sourceDigest}

Evidence units:
${evidenceDigest}

Return raw JSON only:
{
  "methodNotes": "short explanation of how the source data was transformed into personas",
  "themes": [
    {"theme":"theme name","description":"what it means","evidenceIds":["E..."],"prevalence":"low|medium|high"}
  ],
  "agents": [
    {
      "name": "natural display name",
      "background": "1-2 sentences grounded in the evidence",
      "personality": "short temperament and interaction style",
      "stance": "initial view toward the topic",
      "speakingStyle": "structural language style inferred from the data: sentence length, directness, vocabulary density, jargon level, emotional temperature",
      "knowledgeDomains": ["domain"],
      "triggerKeywords": ["keyword"],
      "frictionTopics": ["topic"],
      "tags": ["segment tag"],
      "engagementCurve": "steady|fading|warming|burst|erratic",
      "sourceSummary": "what source pattern this persona represents",
      "dataGroundingScore": 0-100,
      "memoryProfile": {
        "semanticMemory": ["stable beliefs or knowledge this segment carries"],
        "episodicCompositeMemory": ["composite situations distilled from multiple source units, not fake personal memories"],
        "consumptionHabits": ["buying, subscription, price sensitivity, usage frequency, replacement behavior"],
        "educationCognitiveStyle": "education level and reasoning style reflected in vocabulary and abstraction level",
        "socialIdentity": "work/life role, peer group, class/circle, team/family responsibility",
        "emotionalTriggers": ["what makes this segment excited, defensive, bored, skeptical, or annoyed"],
        "languageRegister": "how this persona naturally speaks at a structural level: vocabulary density, sentence length, directness, jargon level, emotional temperature",
        "decisionHeuristics": ["rules of thumb this segment uses when judging products or ideas"]
      },
      "evidence": [
        {"evidenceId":"E...","quote":"short quote or compressed observation from that evidence","reason":"why this supports the persona","weight":0-100}
      ],
      "ocean": {"openness":0-100,"conscientiousness":0-100,"extraversion":0-100,"agreeableness":0-100,"neuroticism":0-100},
      "biases": {"noveltyResistance":0-100,"authorityDeference":0-100,"lossAversion":0-100,"confirmationBias":0-100,"socialProof":0-100,"anchoring":0-100}
    }
  ]
}

Quality rules:
- The personas must cover meaningful differences in the data, not cosmetic demographics.
- If the evidence is thin, say so through a lower dataGroundingScore instead of pretending certainty.
- Make the persona speak from the memory system, not by citing evidence IDs.
- Use source vocabulary to shape language register, but do not make the persona sound like a report.
- Do not turn language style into catchphrases. Avoid "often says...", "likes to use...", repeated signature words, verbal tics, or slogans. Language style should remain a subtle register and rhythm constraint.
- Do not include source anchor IDs that are not listed above.`
  }

  return `你正在为 SynUsersAI 构建基于真实来源数据的 AI 人设。

目标：
围绕「${topic}」创建 ${agentCount} 个差异明显、可追溯的人设。

必须遵循的方法：
- 来源支撑的记忆蒸馏：不能凭空编造上传材料里没有支撑的特征。
- 主题分析：从材料里归纳反复出现的目标、痛点、决策标准、情绪、用词和矛盾。
- 持续比较：先比较不同证据单元，再决定如何分群。
- 把 persona 当成数据驱动的人群代表，不是虚构角色。
- 每个 persona 必须把来源材料转化成内在记忆系统：信念、复合经历、消费习惯、教育/认知方式、社会身份、情绪触发、语言风格、决策捷径。
- 保留 2-4 个来源锚点用于追溯，但这些锚点不是让 persona 在聊天时说出口的。

语言：
${languageInstruction(locale)}

来源文件：
${sourceDigest}

证据单元：
${evidenceDigest}

只返回原始 JSON：
{
  "methodNotes": "简短说明如何从来源数据转成人设",
  "themes": [
    {"theme":"主题名","description":"含义","evidenceIds":["E..."],"prevalence":"low|medium|high"}
  ],
  "agents": [
    {
      "name": "自然的显示名",
      "background": "1-2句，必须受证据支撑",
      "personality": "简短性格和互动方式",
      "stance": "对话题的初始立场",
      "speakingStyle": "从数据里推断出的结构性表达方式：句长、直接程度、词汇密度、术语密度、情绪温度",
      "knowledgeDomains": ["领域"],
      "triggerKeywords": ["触发词"],
      "frictionTopics": ["雷区"],
      "tags": ["人群标签"],
      "engagementCurve": "steady|fading|warming|burst|erratic",
      "sourceSummary": "这个人设代表的来源数据模式",
      "dataGroundingScore": 0-100,
      "memoryProfile": {
        "semanticMemory": ["这个人群稳定持有的知识、信念或判断"],
        "episodicCompositeMemory": ["由多条来源材料蒸馏出的复合场景，不要伪装成某个真人的私人记忆"],
        "consumptionHabits": ["购买习惯、订阅习惯、价格敏感、使用频率、替换行为"],
        "educationCognitiveStyle": "教育程度和认知风格，体现在词汇、抽象能力和推理方式里",
        "socialIdentity": "职业/生活角色、圈层、阶层、团队或家庭责任",
        "emotionalTriggers": ["什么会让这个群体兴奋、防御、厌烦、怀疑或焦虑"],
        "languageRegister": "结构性的自然说话方式：词汇密度、句长、直接程度、行业术语密度、情绪温度",
        "decisionHeuristics": ["判断产品或观点时常用的经验法则"]
      },
      "evidence": [
        {"evidenceId":"E...","quote":"来自该证据的短引用或压缩观察","reason":"为什么它支撑这个人设","weight":0-100}
      ],
      "ocean": {"openness":0-100,"conscientiousness":0-100,"extraversion":0-100,"agreeableness":0-100,"neuroticism":0-100},
      "biases": {"noveltyResistance":0-100,"authorityDeference":0-100,"lossAversion":0-100,"confirmationBias":0-100,"socialProof":0-100,"anchoring":0-100}
    }
  ]
}

质量要求：
- 人设差异必须来自数据里的真实差异，而不是换几个年龄职业。
- 证据不足时，通过较低 dataGroundingScore 表示不确定，不要装作很确定。
- 让 persona 从记忆系统里自然说话，不要在聊天中引用 evidenceId。
- 可以吸收来源材料里的词汇和语气来塑造语言风格，但不要像报告。
- 不要把语言风格做成口头禅。避免"常说..."、"喜欢用..."、反复出现的标志性词、固定语癖或宣传口号；语言风格应该是底层语域和节奏约束。
- 不要引用上面不存在的 evidenceId。`
}

function normalizeEvidence(rawEvidence: RawGeneratedPersona['evidence'], evidenceMap: Map<string, EvidenceUnit>): PersonaEvidence[] {
  return (rawEvidence || [])
    .map((item) => {
      const unit = evidenceMap.get(item.evidenceId)
      if (!unit) return null
      return {
        evidenceId: unit.id,
        sourceName: unit.sourceName,
        locator: unit.locator,
        quote: truncate(item.quote || unit.text, 260),
        reason: item.reason || '',
        weight: normalizeScore(item.weight, 70),
      }
    })
    .filter((item): item is PersonaEvidence => Boolean(item))
}

export async function synthesizePersonasFromEvidence({
  topic,
  agentCount,
  evidenceUnits,
  sources,
  model,
  providerConfig,
  locale,
  onProgress,
}: {
  topic: string
  agentCount: number
  evidenceUnits: EvidenceUnit[]
  sources: PopulationSource[]
  model: ModelProvider
  providerConfig?: LLMProviderConfigInput
  locale: Locale
  onProgress?: (step: 'rank-evidence' | 'distill-memory-personas') => void | Promise<void>
}) {
  await onProgress?.('rank-evidence')
  const selectedEvidence = await rankEvidenceByTopic(evidenceUnits, topic)
  const prompt = createPrompt(topic, agentCount, selectedEvidence, sources, locale)
  await onProgress?.('distill-memory-personas')
  const result = await chatCompletionJSON<RawSynthesisResult>(
    [{ role: 'user', content: prompt }],
    { temperature: 0.35, maxTokens: 7000, model, providerConfig }
  )

  const evidenceMap = new Map(selectedEvidence.map((unit) => [unit.id, unit]))
  const agents = (result.agents || []).map((agent) => ({
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
    sourceSummary: agent.sourceSummary || '',
    dataGroundingScore: normalizeScore(agent.dataGroundingScore, 65),
    evidence: normalizeEvidence(agent.evidence, evidenceMap),
    memoryProfile: normalizeMemoryProfile(agent.memoryProfile, locale),
    ocean: normalizeOcean(agent.ocean),
    biases: normalizeBiases(agent.biases),
    ...createRuntimePersonaState(),
  }))

  const summary: PopulationImportSummary = {
    sources,
    evidenceCount: evidenceUnits.length,
    selectedEvidenceCount: selectedEvidence.length,
    themes: result.themes || [],
    methodNotes: result.methodNotes || '',
  }

  return { agents, summary }
}
