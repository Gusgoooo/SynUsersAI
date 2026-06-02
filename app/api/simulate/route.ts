import { calculateAgentImpulse } from '@/lib/engine/speaker-selector'
import { processTurnAndReflect } from '@/lib/engine/state-updater'
import { compileSingleHopPrompt } from '@/lib/engine/context-builder'
import { generateMarkdownReport } from '@/lib/engine/reporter'
import { chatCompletion, chatCompletionJSON, cosineSimilarity, getEmbedding, type ModelProvider } from '@/lib/engine/llm'
import { buildModeratorSystemPrompt, getModeratorDirective } from '@/lib/engine/prompts'
import type { ActivatedMemory, AgentPersona, PersonaEvidence, UtteranceMessage, SimulationSnapshot } from '@/lib/engine/types'
import { languageInstruction, moderatorName, normalizeLocale, type Locale } from '@/lib/locale'
import { evidenceFromActivatedMemories, normalizeActivatedMemories, retrieveEvidenceForTurn, type RetrievedEvidence } from '@/lib/population/retrieval'
import { createRuntimePersonaState, normalizeBiases, normalizeOcean } from '@/lib/persona/defaults'
import { parseRequestProviderConfig } from '@/lib/llm/request-config'
import type { LLMProviderConfigInput } from '@/lib/llm/provider-config'
import { formatTopicBriefing, generateTopicPreparation, type TopicPreparation } from '@/lib/research/topic-preparation'
import { normalizePersonaDisplayNames } from '@/lib/persona/names'
import { getPublicErrorMessage } from '@/lib/error-message'
import { getRoundtableDurationPreset, normalizeRoundtableDurationTier, type RoundtableDurationPreset } from '@/lib/roundtable-duration'

export const runtime = 'nodejs'
export const maxDuration = 7200

function computeConvergence(
  personas: AgentPersona[],
  history: UtteranceMessage[]
): { min: number; max: number; median: number; clusters: number } {
  // Get each agent's most recent message embedding
  const agentLastEmbeddings: number[][] = []
  for (const p of personas) {
    const lastMsg = [...history].reverse().find(m => m.speakerId === p.id && m.embedding)
    if (lastMsg?.embedding) agentLastEmbeddings.push(lastMsg.embedding)
  }

  if (agentLastEmbeddings.length < 2) return { min: 0, max: 0, median: 0, clusters: 1 }

  const dim = agentLastEmbeddings[0].length

  function cosine(a: number[], b: number[]): number {
    let dot = 0, nA = 0, nB = 0
    for (let k = 0; k < dim; k++) {
      dot += a[k] * b[k]
      nA += a[k] * a[k]
      nB += b[k] * b[k]
    }
    const denom = Math.sqrt(nA) * Math.sqrt(nB)
    return denom > 0 ? dot / denom : 0
  }

  // Pairwise cosine similarities
  const sims: number[] = []
  for (let i = 0; i < agentLastEmbeddings.length; i++) {
    for (let j = i + 1; j < agentLastEmbeddings.length; j++) {
      sims.push(cosine(agentLastEmbeddings[i], agentLastEmbeddings[j]))
    }
  }
  sims.sort((a, b) => a - b)

  const minSim = sims[0]
  const maxSim = sims[sims.length - 1]
  const medianSim = sims[Math.floor(sims.length / 2)]

  // Cluster count
  const threshold = medianSim
  const visited = new Set<number>()
  let clusters = 0
  for (let i = 0; i < agentLastEmbeddings.length; i++) {
    if (visited.has(i)) continue
    visited.add(i)
    clusters++
    for (let j = i + 1; j < agentLastEmbeddings.length; j++) {
      if (visited.has(j)) continue
      if (cosine(agentLastEmbeddings[i], agentLastEmbeddings[j]) > threshold) visited.add(j)
    }
  }

  return { min: minSim, max: maxSim, median: medianSim, clusters }
}

type DiscussionStage = 'explore' | 'narrow' | 'summarize'

interface DiscussionMetrics {
  speakerTurns: number
  coverageCount: number
  totalAgents: number
  coverageRate: number
  medianSimilarity: number
  disagreementSpread: number
  clusters: number
  recentNovelty: number
  stage: DiscussionStage
}

function averageRecent(values: number[], window: number): number {
  if (values.length === 0) return 1
  const recent = values.slice(-window)
  return recent.reduce((sum, value) => sum + value, 0) / recent.length
}

function getDiscussionStage(
  speakerTurns: number,
  preset: RoundtableDurationPreset,
  coverageRate: number,
  noveltyLog: number[]
): DiscussionStage {
  const recentNovelty = averageRecent(noveltyLog, preset.stagnationWindow)
  const canStartSummary = speakerTurns >= preset.lowerBoundTurns && coverageRate >= 0.6 && recentNovelty <= preset.lowNoveltyThreshold

  if (speakerTurns >= preset.summarizeAfterTurns || canStartSummary) return 'summarize'
  if (speakerTurns >= preset.narrowAfterTurns) return 'narrow'
  return 'explore'
}

function getModeratorInterval(stage: DiscussionStage): number {
  if (stage === 'summarize') return 2
  if (stage === 'narrow') return 3
  return 5
}

function computeEmbeddingNovelty(embedding: number[], history: UtteranceMessage[]): number {
  const previous = history
    .filter((message) => message.speakerId !== 'system' && message.embedding && message.embedding.length === embedding.length)
    .slice(-24)

  if (previous.length === 0) return 1

  const maxSimilarity = Math.max(
    ...previous.map((message) => Math.max(0, cosineSimilarity(embedding, message.embedding!)))
  )
  return Math.max(0, Math.min(1, 1 - maxSimilarity))
}

function buildDiscussionMetrics(
  personas: AgentPersona[],
  history: UtteranceMessage[],
  speakerTurns: number,
  discussionSpeakers: Set<string>,
  noveltyLog: number[],
  preset: RoundtableDurationPreset
): DiscussionMetrics {
  const convergence = computeConvergence(personas, history)
  const coverageCount = discussionSpeakers.size
  const totalAgents = Math.max(1, personas.length)
  const coverageRate = coverageCount / totalAgents
  const stage = getDiscussionStage(speakerTurns, preset, coverageRate, noveltyLog)

  return {
    speakerTurns,
    coverageCount,
    totalAgents,
    coverageRate,
    medianSimilarity: convergence.median,
    disagreementSpread: convergence.max - convergence.min,
    clusters: convergence.clusters,
    recentNovelty: averageRecent(noveltyLog, preset.stagnationWindow),
    stage,
  }
}

function computeSessionProgress(metrics: DiscussionMetrics, preset: RoundtableDurationPreset): number {
  if (metrics.stage === 'summarize') return 0.9
  const progressByTurns = metrics.speakerTurns / Math.max(1, preset.summarizeAfterTurns)
  return Math.max(0.05, Math.min(0.82, progressByTurns))
}

function shouldEndNaturally(metrics: DiscussionMetrics, preset: RoundtableDurationPreset, noveltyLog: number[]): boolean {
  if (metrics.speakerTurns < preset.lowerBoundTurns) return false
  if (metrics.coverageRate < 0.7) return false
  if (metrics.stage !== 'summarize') return false
  if (noveltyLog.length < preset.stagnationWindow) return false

  const noNewArguments = metrics.recentNovelty <= preset.lowNoveltyThreshold
  const fairlySettled = metrics.medianSimilarity >= 0.58 || metrics.clusters <= 2 || metrics.disagreementSpread <= 0.35
  const enoughSummaryTime = metrics.speakerTurns >= preset.summarizeAfterTurns

  return noNewArguments && (fairlySettled || enoughSummaryTime)
}

function shouldSafetyClose(metrics: DiscussionMetrics, preset: RoundtableDurationPreset, startTime: number): boolean {
  const runtimeExceeded = Date.now() - startTime >= preset.maxRuntimeMinutes * 60 * 1000
  return runtimeExceeded || metrics.speakerTurns >= preset.safetyMaxTurns
}

function formatModeratorMetrics(locale: Locale, metrics: DiscussionMetrics): string {
  if (locale === 'en') {
    return [
      `Stage: ${metrics.stage}`,
      `Participant turns: ${metrics.speakerTurns}`,
      `Main-discussion speaker coverage: ${metrics.coverageCount}/${metrics.totalAgents}`,
      `Opinion similarity median: ${metrics.medianSimilarity.toFixed(2)}`,
      `Disagreement spread: ${metrics.disagreementSpread.toFixed(2)}`,
      `Estimated camps: ${metrics.clusters}`,
      `Recent new-argument density: ${metrics.recentNovelty.toFixed(2)}`,
    ].join('; ')
  }

  return [
    `阶段：${metrics.stage}`,
    `主讨论发言轮次：${metrics.speakerTurns}`,
    `发言覆盖：${metrics.coverageCount}/${metrics.totalAgents}`,
    `观点相似度中位数：${metrics.medianSimilarity.toFixed(2)}`,
    `分歧跨度：${metrics.disagreementSpread.toFixed(2)}`,
    `估计阵营：${metrics.clusters}`,
    `近期新论点密度：${metrics.recentNovelty.toFixed(2)}`,
  ].join('；')
}

async function generateModeratorIntervention(
  topic: string,
  topicBriefing: string,
  history: UtteranceMessage[],
  agents: AgentPersona[],
  sessionProgress: number,
  stage: DiscussionStage,
  metricsText: string,
  model: ModelProvider,
  locale: Locale,
  providerConfig?: LLMProviderConfigInput
): Promise<string> {
  const agentNames = agents.map(a => a.name)
  const { directive } = getModeratorDirective(history, agents, sessionProgress, locale)
  const recentContext = history.slice(-8).map(m => locale === 'en' ? `${m.speakerName}: ${m.text}` : `${m.speakerName}：${m.text}`).join('\n')
  const systemPrompt = buildModeratorSystemPrompt(topic, agentNames, locale)

  const userPrompt = locale === 'en'
    ? `Core topic reminder: "${topic}"

Shared topic briefing:
${topicBriefing}

Recent conversation:
${recentContext}

Current roundtable state:
${metricsText}

Current stage: ${stage}. If the stage is "narrow", compress the discussion toward the decisive disagreement. If the stage is "summarize", ask for final objections, changed minds, or a conclusion the room can stand behind.

(Your intention: ${directive}.)
Use one natural English follow-up question or challenge. When useful, include one rough quantitative phrase from the state snapshot. Do not list names, do not restate the topic, and do not say "back to the topic". Output one sentence only.`
    : `核心议题提醒：「${topic}」

共同议题背景：
${topicBriefing}

最近对话：
${recentContext}

当前圆桌状态：
${metricsText}

当前阶段：${stage}。如果是 narrow，把讨论压到决定性分歧；如果是 summarize，追问最终异议、立场变化或大家能承认的结论。

（你的意图：${directive}。）
用一句自然的追问或质疑来实现意图。必要时带一个来自状态快照的粗略量化表达。不要列名字、不要念题目、不要说"回到话题"。直接输出一句话。`

  return await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.8, maxTokens: 150, model, providerConfig }
  )
}

async function generateModeratorOpening(
  topic: string,
  topicBriefing: string,
  agents: AgentPersona[],
  model: ModelProvider,
  locale: Locale,
  providerConfig?: LLMProviderConfigInput
): Promise<string> {
  const agentSignals = agents
    .map((agent) => {
      const relation = agent.topicRelation
      return locale === 'en'
        ? `- ${agent.name}: ${agent.profileTitle || agent.background}; stance=${agent.stance}; topicFit=${relation ? `${relation.familiarity}/${relation.relevance}` : 'unknown'}`
        : `- ${agent.name}：${agent.profileTitle || agent.background}；立场=${agent.stance}；话题关系=${relation ? `${relation.familiarity}/${relation.relevance}` : '未知'}`
    })
    .join('\n')
  const system = locale === 'en'
    ? `You are the live moderator of a synthetic-user research roundtable. Every visible sentence must be newly written by you for this exact topic and group. Do not use stock introductions, reusable meeting openings, Markdown, bullets, or headings. ${languageInstruction(locale)}`
    : `你是合成用户研究圆桌的现场主持人。所有可见句子都必须为当前议题和当前这组人实时生成。不要套用会议开场白，不要 Markdown、列表、编号或标题。`
  const user = locale === 'en'
    ? `Topic: ${topic}

Private topic context:
${topicBriefing || 'No separate topic briefing. Use the topic and participant signals only.'}

Participants:
${agentSignals}

Open the discussion in 2-4 natural sentences. Make the topic concrete, set a useful direction, and invite participants to enter the discussion in their own way. Do not ask everyone to follow the same introduction format.`
    : `议题：${topic}

后台议题语境：
${topicBriefing || '没有单独议题背景，请只使用议题和参与者信号。'}

参与者：
${agentSignals}

用2-4句自然中文开启讨论。把议题说具体，给出有用的讨论方向，然后邀请大家用各自舒服的方式进入讨论。不要要求所有人按同一种自我介绍格式发言。`

  return (await chatCompletion(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.78, maxTokens: 320, model, providerConfig }
  )).trim()
}

async function generateModeratorClosing(
  topic: string,
  topicBriefing: string,
  history: UtteranceMessage[],
  metricsText: string,
  model: ModelProvider,
  locale: Locale,
  providerConfig?: LLMProviderConfigInput
): Promise<string> {
  const recentContext = history.slice(-14).map(m => locale === 'en' ? `${m.speakerName}: ${m.text}` : `${m.speakerName}：${m.text}`).join('\n')
  const system = locale === 'en'
    ? `You are closing a research roundtable naturally. Be concise and decisive. Do not use Markdown, bullets, numbering, or headings.`
    : `你正在自然结束一场研究圆桌。表达要简洁、有判断力。不要 Markdown、列表、编号或标题。`

  const user = locale === 'en'
    ? `Topic: ${topic}

Shared topic briefing:
${topicBriefing}

Recent conversation:
${recentContext}

Quantitative state:
${metricsText}

Close the meeting in 2-4 natural sentences. Include: the conclusion tendency, the rough split or camp count, the strongest argument, and the remaining condition or objection. Do not pretend full consensus if there is not one.`
    : `议题：${topic}

共同议题背景：
${topicBriefing}

最近对话：
${recentContext}

量化状态：
${metricsText}

用2-4句自然中文结束会议。必须包含：结论倾向、粗略分歧比例或阵营数量、最强论点、仍未解决的条件或异议。没有完全共识就不要假装达成共识。`

  return (await chatCompletion(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.55, maxTokens: 280, model, providerConfig }
  )).trim()
}

type AgentTurnResponse = {
  text: string
  inner_thoughts: string
}

type AgentTurnMetadata = {
  inner_thoughts: string
  activatedMemories?: ActivatedMemory[]
}

function splitIntoSegments(text: string): string[] {
  // First split by explicit newlines
  const rawSegments = text.split(/\n+/).map(s => s.trim()).filter(s => s.length > 0)

  const result: string[] = []
  for (const seg of rawSegments) {
    if (seg.length <= 140) {
      result.push(seg)
    } else {
      // Force split long segments at sentence boundaries
      const sentences = seg.split(/(?<=[。！？；…」.!?;])/).filter(s => s.trim())
      let buffer = ''
      for (const sentence of sentences) {
        if (buffer.length + sentence.length > 140 && buffer.length > 0) {
          result.push(buffer.trim())
          buffer = sentence
        } else {
          buffer += sentence
        }
      }
      if (buffer.trim()) result.push(buffer.trim())
    }
  }
  return result.length > 0 ? result : [text]
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeForRepeatCheck(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s"'“”‘’`.,，。!?！？:：;；、()\[\]{}<>《》]+/g, '')
    .trim()
}

function repeatTokens(text: string): string[] {
  return text.match(/[\p{Script=Han}]|[a-z0-9]+/gu) || []
}

function overlapRatio(a: string, b: string): number {
  const aTokens = new Set(repeatTokens(a))
  const bTokens = new Set(repeatTokens(b))
  const smaller = Math.min(aTokens.size, bTokens.size)
  if (smaller === 0) return 0

  let overlap = 0
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap++
  }
  return overlap / smaller
}

function isTooSimilarToRecentUtterance(text: string, history: UtteranceMessage[]): boolean {
  const candidate = normalizeForRepeatCheck(text)
  if (candidate.length < 16) return false

  return history
    .filter((message) => message.speakerId !== 'system')
    .slice(-24)
    .some((message) => {
      const previous = normalizeForRepeatCheck(message.text)
      if (previous.length < 16) return false
      if (candidate === previous) return true
      if (candidate.length > 28 && (candidate.includes(previous) || previous.includes(candidate))) return true
      return overlapRatio(candidate, previous) >= 0.88 && Math.abs(candidate.length - previous.length) <= Math.max(16, Math.min(candidate.length, previous.length) * 0.25)
    })
}

function buildNoRepeatInstruction(history: UtteranceMessage[], locale: Locale, rejectedText?: string): string {
  const recent = history
    .filter((message) => message.speakerId !== 'system')
    .slice(-8)
    .map((message) => locale === 'en' ? `${message.speakerName}: ${message.text}` : `${message.speakerName}：${message.text}`)
    .join('\n')

  if (locale === 'en') {
    return `No-repeat requirement:
- Do not reuse the same sentence, opening, structure, or generic criterion from any recent participant.
- If your point is already covered, add a sharper objection, a concrete condition, or a different consequence from your own profile.
${recent ? `Recent participant utterances:\n${recent}` : ''}
${rejectedText ? `Rejected because it was too similar: "${rejectedText}"` : ''}`
  }

  return `禁止复读要求：
- 不要复用近期任何参与者已经说过的句子、开头、结构或泛泛判断标准。
- 如果你的点已经被说过，就换成更尖锐的反对、具体条件，或从你自己画像出发的不同后果。
${recent ? `近期参与者发言：\n${recent}` : ''}
${rejectedText ? `刚才这个候选因为太像已有发言被拒绝：“${rejectedText}”` : ''}`
}

function normalizePlainAgentText(raw: string, speaker: AgentPersona): string {
  let text = raw.trim()
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (codeBlock) text = codeBlock[1].trim()

  const jsonObjMatch = text.match(/\{[\s\S]*\}/)
  if (jsonObjMatch) {
    try {
      const parsed = JSON.parse(jsonObjMatch[0])
      if (typeof parsed?.text === 'string') text = parsed.text.trim()
    } catch {}
  }

  text = text
    .replace(/^["“”]+|["“”]+$/g, '')
    .replace(/^(发言|回答|message|reply)\s*[:：]\s*/i, '')
    .trim()

  for (const label of [speaker.name, speaker.profileTitle].filter((item): item is string => Boolean(item))) {
    text = text.replace(new RegExp(`^${escapeRegex(label)}\\s*[:：]\\s*`, 'i'), '').trim()
  }

  return text
}

function formatEvidencePrompt(evidence: PersonaEvidence[], locale: Locale): string {
  if (evidence.length === 0) return locale === 'en' ? 'No source anchors for this turn.' : '本轮没有可用来源锚点。'
  return evidence
    .slice(0, 8)
    .map((item) => {
      const text = item.quote.length > 180 ? `${item.quote.slice(0, 180)}...` : item.quote
      return `- ${item.evidenceId} · ${item.sourceName} · ${item.locator}: ${text}`
    })
    .join('\n')
}

async function generateAgentTurnText(
  speaker: AgentPersona,
  system: string,
  user: string,
  history: UtteranceMessage[],
  model: ModelProvider,
  locale: Locale,
  providerConfig?: LLMProviderConfigInput
): Promise<AgentTurnResponse> {
  let lastError: unknown
  let rejectedText = ''

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const plainSystem = locale === 'en'
        ? `${system}

This foreground turn is optimized for speed. Output only the spoken message text. No JSON, no Markdown, no speaker name prefix. Do not cite evidence IDs or source files. ${languageInstruction(locale)}`
        : `${system}

本轮前台优先生成自然发言。只输出这个人会直接说出口的话。不要 JSON，不要 Markdown，不要加名字前缀，不要引用证据编号或来源文件。`
      const noRepeatInstruction = buildNoRepeatInstruction(history, locale, rejectedText || undefined)
      const plainUser = locale === 'en'
        ? `${user}

${noRepeatInstruction}

Now answer as ${speaker.name}. Return only what this person would say aloud in the group.`
        : `${user}

${noRepeatInstruction}

现在以${speaker.name}的身份接话。只输出这个人在群聊里会直接说出口的话。`

      const text = normalizePlainAgentText(
        await chatCompletion(
          [
            { role: 'system', content: plainSystem },
            { role: 'user', content: plainUser },
          ],
          { temperature: Math.min(1, 0.82 + attempt * 0.08), maxTokens: 320, model, providerConfig }
        ),
        speaker
      )

      if (text.length < 2) {
        lastError = new Error('LLM returned an empty spoken turn.')
        continue
      }

      if (isTooSimilarToRecentUtterance(text, history)) {
        rejectedText = text
        lastError = new Error('LLM returned a spoken turn that was too similar to recent conversation.')
        continue
      }

      return { text, inner_thoughts: '' }
    } catch (plainError) {
      lastError = plainError
      console.error(`[${speaker.name}] Plain speech generation attempt ${attempt + 1} failed:`, plainError)
    }
  }

  throw new Error(`Failed to generate a non-template spoken turn for ${speaker.name}: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
}

async function generateAgentTurnMetadata(
  speaker: AgentPersona,
  utteranceText: string,
  availableEvidence: RetrievedEvidence[],
  topic: string,
  locale: Locale,
  model: ModelProvider,
  providerConfig?: LLMProviderConfigInput
): Promise<AgentTurnMetadata> {
  const system = locale === 'en'
    ? `You are a research logger. The foreground chat message is already visible to the user. Your job is to explain, privately and traceably, which internal memories shaped it. Output raw JSON only. Do not rewrite the message.`
    : `你是研究记录整理器。前台自然发言已经展示给用户了。你的任务是补充后台可追溯解释：这句话由哪些内在记忆塑造。只输出 JSON，不要改写发言。`

  const user = locale === 'en'
    ? `Topic: ${topic}
Speaker: ${speaker.name}
Profile: ${speaker.profileTitle || speaker.background}
Stance: ${speaker.stance}
Memory profile: ${speaker.memoryProfile ? JSON.stringify(speaker.memoryProfile) : 'none'}
Topic relation: ${speaker.topicRelation ? JSON.stringify(speaker.topicRelation) : 'none'}
Available source anchors:
${formatEvidencePrompt(availableEvidence, locale)}

Visible utterance:
${utteranceText}

Return JSON only:
{"inner_thoughts":"one short private thought","activatedMemories":[{"label":"memory name","influence":"how it shaped this exact utterance","intensity":0-100,"sourceEvidenceIds":["E..."]}]}

Rules: return 1-3 activated memories; sourceEvidenceIds may be empty; use only IDs from available anchors.`
    : `议题：${topic}
发言者：${speaker.name}
画像：${speaker.profileTitle || speaker.background}
立场：${speaker.stance}
内在记忆：${speaker.memoryProfile ? JSON.stringify(speaker.memoryProfile) : '无'}
话题关系：${speaker.topicRelation ? JSON.stringify(speaker.topicRelation) : '无'}
可用来源锚点：
${formatEvidencePrompt(availableEvidence, locale)}

前台已经展示的发言：
${utteranceText}

只返回 JSON：
{"inner_thoughts":"一句话内心想法","activatedMemories":[{"label":"记忆名称","influence":"它如何影响这句具体发言","intensity":0-100,"sourceEvidenceIds":["E..."]}]}

规则：返回1-3条激活记忆；sourceEvidenceIds 可以为空；如果填写，只能使用上面的来源ID。`

  try {
    return await chatCompletionJSON<AgentTurnMetadata>(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { temperature: 0.3, maxTokens: 360, model, providerConfig }
    )
  } catch (error) {
    console.error(`[${speaker.name}] Memory enrichment failed:`, error)
    return {
      inner_thoughts: '',
      activatedMemories: [],
    }
  }
}

const SIMULATION_PROGRESS_COPY = {
  zh: {
    'normalize-personas': {
      label: '正在标准化 AI 用户画像',
      detail: '补齐能量、情绪、OCEAN 和偏差参数，保证画像能驱动后续发言。',
    },
    'embed-beliefs': {
      label: '正在嵌入初始立场',
      detail: '把每个虚拟用户的立场转成向量，用于判断观点差异和发言冲动。',
    },
    'prepare-topic': {
      label: '正在解析人设与话题关系',
      detail: '生成熟悉度、相关度、可能误解和这个话题下会显露的个人特点。',
    },
    opening: {
      label: '主持人正在组织开场',
      detail: '由模型根据当前议题和参与者生成现场开场。',
    },
    introductions: {
      label: 'AI 用户正在自然入场',
      detail: '每个人根据自己的画像和前文生成初始发言，不使用统一自我介绍格式。',
    },
    'speaker-selection': {
      label: '正在计算下一位发言者',
      detail: '综合观点差异、沉默时间、能量和最近消息，选择最有发言冲动的人。',
    },
    'memory-retrieval': {
      label: '正在激活相关记忆',
      detail: '从人设记忆、来源锚点和话题关系中挑选本轮最可能影响判断的线索。',
    },
    'response-generation': {
      label: '正在生成自然发言',
      detail: '让画像决定句长、词汇、语气、犹豫程度和判断标准。',
    },
    'state-update': {
      label: '正在更新群体状态',
      detail: '记录观点收敛、认知冲突、情绪变化和下一轮发言倾向。',
    },
    report: {
      label: '正在整理模拟报告',
      detail: '汇总对话历史、分歧、收敛和可行动洞察。',
    },
    complete: {
      label: '模拟已完成',
      detail: '报告已生成，正在收尾。',
    },
  },
  en: {
    'normalize-personas': {
      label: 'Normalizing AI user profiles',
      detail: 'Completing energy, emotion, OCEAN, and bias fields so the profiles can drive conversation.',
    },
    'embed-beliefs': {
      label: 'Embedding initial stances',
      detail: 'Turning each virtual user stance into a vector for disagreement and speaking impulse.',
    },
    'prepare-topic': {
      label: 'Mapping persona-topic relationships',
      detail: 'Generating familiarity, relevance, likely misunderstandings, and topic-specific visible traits.',
    },
    opening: {
      label: 'Moderator is preparing the opening',
      detail: 'Generating the live opening from the topic and participant set.',
    },
    introductions: {
      label: 'AI users are entering the discussion',
      detail: 'Each user generates an initial turn from profile and live context, without a shared introduction format.',
    },
    'speaker-selection': {
      label: 'Calculating the next speaker',
      detail: 'Combining disagreement, silence time, energy, and the latest message to select speaking impulse.',
    },
    'memory-retrieval': {
      label: 'Activating relevant memory',
      detail: 'Selecting the persona memories, source anchors, and topic-fit cues most likely to shape this turn.',
    },
    'response-generation': {
      label: 'Generating natural speech',
      detail: 'Letting the profile control sentence length, vocabulary, tone, hesitation, and decision criteria.',
    },
    'state-update': {
      label: 'Updating group state',
      detail: 'Tracking convergence, cognitive conflict, emotional changes, and next-turn tendencies.',
    },
    report: {
      label: 'Preparing the simulation report',
      detail: 'Summarizing the conversation, disagreements, convergence, and actionable insights.',
    },
    complete: {
      label: 'Simulation complete',
      detail: 'The report is ready and the stream is closing.',
    },
  },
} as const

type SimulationProgressStep = keyof typeof SIMULATION_PROGRESS_COPY.zh

function buildSimulationProgress(locale: Locale, step: SimulationProgressStep, detail?: string) {
  const item = SIMULATION_PROGRESS_COPY[locale]?.[step] || SIMULATION_PROGRESS_COPY.zh[step]
  return {
    step,
    label: item.label,
    detail: detail || item.detail,
    timestamp: Date.now(),
  }
}

export async function POST(req: Request) {
  const { topic, topicContext = '', duration, durationTier, personas: inputPersonas, model = 'gpt-5.5', language = 'zh', llmConfig } = await req.json()
  const locale = normalizeLocale(language)
  const providerConfig = parseRequestProviderConfig(llmConfig)
  const durationPreset = getRoundtableDurationPreset(normalizeRoundtableDurationTier(durationTier, duration))
  const hostName = moderatorName(locale)

  const encoder = new TextEncoder()
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const enrichmentTasks: Promise<void>[] = []
  let sendChain = Promise.resolve()

  async function send(event: string, data: unknown) {
    const payload = encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    sendChain = sendChain.catch(() => {}).then(() => writer.write(payload))
    await sendChain
  }

  async function sendProgress(step: SimulationProgressStep, detail?: string) {
    await send('progress', buildSimulationProgress(locale, step, detail))
  }

  // Stream text character by character
  async function streamText(
    id: string,
    speakerId: string,
    speakerName: string,
    text: string,
    evidence?: PersonaEvidence[],
    usedEvidenceIds?: string[],
    activatedMemories?: ActivatedMemory[]
  ) {
    await send('stream-start', { id, speakerId, speakerName, evidence, usedEvidenceIds, activatedMemories })
    const chunkSize = speakerId === 'system' ? 3 : 2
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize)
      await send('stream-chunk', { id, chunk })
      await new Promise(r => setTimeout(r, 70 + Math.random() * 50))
    }
    await send('stream-end', { id, speakerId, speakerName, text, evidence, usedEvidenceIds, activatedMemories })
  }

  ;(async () => {
    try {
      await sendProgress('normalize-personas')
      const personas: AgentPersona[] = normalizePersonaDisplayNames(inputPersonas.map((p: Record<string, unknown>) => ({
        ...p,
        ...createRuntimePersonaState({
          currentEmotion: p.currentEmotion,
          emotionIntensity: p.emotionIntensity,
        }),
        energy: Number(p.energy) || 100,
        turns_since_last_speak: Number(p.turns_since_last_speak) || 0,
        accumulated_dissonance: Number(p.accumulated_dissonance) || 0,
        ocean: normalizeOcean(p.ocean),
        biases: normalizeBiases(p.biases),
      })))

      await sendProgress('embed-beliefs')
      for (const p of personas) {
        p.current_belief_vector = await getEmbedding(p.stance as string)
      }

      const hasExistingTopicRelations = personas.every((persona) => persona.topicRelation?.topic === topic)
      let topicPreparation: TopicPreparation | null = null
      let topicBriefingText = String(topicContext || '').trim()
      await sendProgress('prepare-topic')
      try {
        topicPreparation = await generateTopicPreparation(topic, personas, model as ModelProvider, locale, providerConfig, String(topicContext || ''))
        topicBriefingText = formatTopicBriefing(topicPreparation.briefing, locale)
        if (!hasExistingTopicRelations) {
          for (const persona of personas) {
            persona.topicRelation = topicPreparation.personaRelations[persona.id]
          }
        }
      } catch (error) {
        console.warn('[TopicPreparation] Continuing without generated topic preparation:', error)
      }

      // Opening: moderator sets context. The visible text is generated by the model.
      await sendProgress('opening')
      const ignitionText = await generateModeratorOpening(
        topic,
        topicBriefingText,
        personas,
        model as ModelProvider,
        locale,
        providerConfig
      )
      const ignitionId = crypto.randomUUID()
      await streamText(ignitionId, 'system', hostName, ignitionText)

      const ignitionMessage: UtteranceMessage = {
        id: ignitionId,
        speakerId: 'system',
        speakerName: hostName,
        text: ignitionText,
        inner_thoughts: '',
        embedding: await getEmbedding(ignitionText),
        isHumanPerturbation: true,
      }

      const history: UtteranceMessage[] = [ignitionMessage]
      const dissonanceLog: Record<string, number[]> = {}
      for (const p of personas) dissonanceLog[p.id] = []

      await send('state-update', {
        agents: personas.map((p) => ({
          id: p.id,
          name: p.name,
          profileTitle: p.profileTitle,
          energy: p.energy,
          accumulated_dissonance: p.accumulated_dissonance,
          stance: p.stance,
          turns_since_last_speak: p.turns_since_last_speak,
          currentEmotion: p.currentEmotion,
          emotionIntensity: p.emotionIntensity,
          topicRelation: p.topicRelation,
        })),
      })

      // Initial participant pass. Each visible line is generated from the current history.
      await sendProgress('introductions')
      for (let index = 0; index < personas.length; index++) {
        const persona = personas[index]
        await sendProgress(
          'introductions',
          locale === 'en'
            ? `${persona.name} is entering the discussion from their own profile and the live context.`
            : `${persona.name} 正在根据自己的画像和现场上下文自然入场。`
        )
        const availableEvidence = await retrieveEvidenceForTurn(persona, topic, history)
        const speakerForTurn = { ...persona, evidence: availableEvidence }
        const initialProgress = Math.min(0.28, 0.16 + index * 0.03)
        const { system, user } = compileSingleHopPrompt(speakerForTurn, history, '', topic, initialProgress, locale, topicBriefingText)
        const response = await generateAgentTurnText(persona, system, user, history, model as ModelProvider, locale, providerConfig)
        const segments = splitIntoSegments(response.text)

        for (const segment of segments) {
          const introId = crypto.randomUUID()
          await streamText(introId, persona.id, persona.name, segment)

          const introMsg: UtteranceMessage = {
            id: introId,
            speakerId: persona.id,
            speakerName: persona.name,
            text: segment,
            inner_thoughts: '',
            embedding: await getEmbedding(segment),
          }
          history.push(introMsg)
        }
      }

      // Main discussion loop — naturally ended, with duration tier as pacing guidance.
      const startTime = Date.now()
      let lastMessage = history[history.length - 1]
      let selectionRound = 0
      let speakerTurnCount = personas.length
      let turnsSinceModerator = 0
      const discussionSpeakers = new Set<string>(personas.map((persona) => persona.id))
      const noveltyLog: number[] = []

      while (true) {
        const metrics = buildDiscussionMetrics(personas, history, speakerTurnCount, discussionSpeakers, noveltyLog, durationPreset)
        if (shouldEndNaturally(metrics, durationPreset, noveltyLog)) break
        if (shouldSafetyClose(metrics, durationPreset, startTime)) break

        // Moderator intervention only after enough successful participant turns.
        if (speakerTurnCount > 0 && turnsSinceModerator >= getModeratorInterval(metrics.stage) && lastMessage.speakerId !== 'system') {
          try {
            const sessionProgress = computeSessionProgress(metrics, durationPreset)
            const modText = await generateModeratorIntervention(
              topic,
              topicBriefingText,
              history,
              personas,
              sessionProgress,
              metrics.stage,
              formatModeratorMetrics(locale, metrics),
              model as ModelProvider,
              locale,
              providerConfig
            )
            const modId = crypto.randomUUID()
            await streamText(modId, 'system', hostName, modText.trim())

            const modMessage: UtteranceMessage = {
              id: modId,
              speakerId: 'system',
              speakerName: hostName,
              text: modText.trim(),
              inner_thoughts: '',
              embedding: await getEmbedding(modText),
              isHumanPerturbation: true,
            }
            history.push(modMessage)
            lastMessage = modMessage
            turnsSinceModerator = 0
          } catch (e) {
            console.error('[Moderator] LLM failed:', e)
          }
        }

        // Select 1-2 speakers per turn
        selectionRound++
        const latestMetrics = buildDiscussionMetrics(personas, history, speakerTurnCount, discussionSpeakers, noveltyLog, durationPreset)
        await sendProgress(
          'speaker-selection',
          locale === 'en'
            ? `Round ${selectionRound}: ${latestMetrics.stage} stage, calculating speaking impulse from disagreement, silence, and energy.`
            : `第 ${selectionRound} 轮：当前为${latestMetrics.stage}阶段，根据观点差异、沉默时间和能量计算发言冲动。`
        )
        const impulseScores = personas
          .filter((p) => p.id !== lastMessage.speakerId)
          .map((p) => ({
            id: p.id,
            name: p.name,
            impulse: calculateAgentImpulse(p, lastMessage, history.length),
            cd: lastMessage.embedding && p.current_belief_vector.length > 0
              ? 1.0 - Math.abs(
                  p.current_belief_vector.reduce((sum, v, i) => sum + v * (lastMessage.embedding![i] ?? 0), 0) /
                  (Math.sqrt(p.current_belief_vector.reduce((s, v) => s + v * v, 0)) *
                    Math.sqrt((lastMessage.embedding ?? []).reduce((s, v) => s + v * v, 0)) || 1)
                )
              : 0,
            ri: Math.exp(-0.3 * p.turns_since_last_speak),
          }))
          .sort((a, b) => b.impulse - a.impulse)

        await send('impulse-scores', { scores: impulseScores })

        // Pick 1-2 speakers
        const speakerCount = Math.random() < 0.3 ? 2 : 1
        const selectedSpeakers: AgentPersona[] = []
        for (let s = 0; s < speakerCount && s < impulseScores.length; s++) {
          const p = personas.find(a => a.id === impulseScores[s].id)
          if (p && p.energy > 0) selectedSpeakers.push(p)
        }

        if (selectedSpeakers.length === 0) break

        // Generate responses — start next generation while streaming current
        for (let si = 0; si < selectedSpeakers.length; si++) {
          const beforeTurnMetrics = buildDiscussionMetrics(personas, history, speakerTurnCount, discussionSpeakers, noveltyLog, durationPreset)
          if (shouldEndNaturally(beforeTurnMetrics, durationPreset, noveltyLog) || shouldSafetyClose(beforeTurnMetrics, durationPreset, startTime)) break

          const speaker = selectedSpeakers[si]
          const progress = computeSessionProgress(beforeTurnMetrics, durationPreset)
          await sendProgress(
            'memory-retrieval',
            locale === 'en'
              ? `Activating memories and source cues for ${speaker.name}.`
              : `正在为 ${speaker.name} 激活相关记忆和来源线索。`
          )
          const availableEvidence = await retrieveEvidenceForTurn(speaker, topic, history)
          const speakerForTurn = { ...speaker, evidence: availableEvidence }
          const { system, user } = compileSingleHopPrompt(speakerForTurn, history, '', topic, progress, locale, topicBriefingText)

          await sendProgress(
            'response-generation',
            locale === 'en'
              ? `${speaker.name} is generating a reply shaped by profile, memory, and topic fit.`
              : `${speaker.name} 正在根据画像、记忆和话题关系生成自然发言。`
          )
          const response = await generateAgentTurnText(speaker, system, user, history, model as ModelProvider, locale, providerConfig)

          const responseEmbedding = await getEmbedding(response.text)
          noveltyLog.push(computeEmbeddingNovelty(responseEmbedding, history))
          if (noveltyLog.length > 30) noveltyLog.shift()

          const segments = splitIntoSegments(response.text)
          const utteranceIds: string[] = []

          for (const segment of segments) {
            const utteranceId = crypto.randomUUID()
            utteranceIds.push(utteranceId)
            await streamText(utteranceId, speaker.id, speaker.name, segment)

            const utterance: UtteranceMessage = {
              id: utteranceId,
              speakerId: speaker.id,
              speakerName: speaker.name,
              text: segment,
              inner_thoughts: '',
              embedding: await getEmbedding(segment),
            }
            history.push(utterance)
            lastMessage = utterance
          }

          speakerTurnCount++
          discussionSpeakers.add(speaker.id)

          const metadataTargetId = utteranceIds[0]
          if (metadataTargetId) {
            const enrichmentTask = generateAgentTurnMetadata(
              speaker,
              response.text,
              availableEvidence,
              topic,
              locale,
              model as ModelProvider,
              providerConfig
            )
              .then(async (metadata) => {
                const normalizedMemories = normalizeActivatedMemories(metadata.activatedMemories, availableEvidence)
                const activatedMemories = normalizedMemories
                const usedEvidence = evidenceFromActivatedMemories(availableEvidence, activatedMemories)
                const usedEvidenceIds = usedEvidence.map((item) => item.evidenceId)
                const targetMessage = history.find((message) => message.id === metadataTargetId)
                if (targetMessage) {
                  targetMessage.inner_thoughts = metadata.inner_thoughts || ''
                  targetMessage.activatedMemories = activatedMemories
                  targetMessage.evidence = usedEvidence
                  targetMessage.usedEvidenceIds = usedEvidenceIds
                }
                await send('message-metadata', {
                  id: metadataTargetId,
                  inner_thoughts: metadata.inner_thoughts || '',
                  activatedMemories,
                  evidence: usedEvidence,
                  usedEvidenceIds,
                })
              })
              .catch((error) => {
                console.error(`[${speaker.name}] Async memory enrichment failed:`, error)
              })
            enrichmentTasks.push(enrichmentTask)
          }
          turnsSinceModerator++

          // State update after each speaker
          const preStates = new Map(personas.map((p) => [p.id, { acc: p.accumulated_dissonance, prev: p.previous_dissonance }]))

          try {
            await sendProgress('state-update')
            await processTurnAndReflect(personas, lastMessage, history)
          } catch (e) {
            console.error('[State Update] Error:', e)
          }

          for (const p of personas) {
            const pre = preStates.get(p.id)!
            const spike = p.previous_dissonance - pre.prev
            if (spike >= 0.5) {
              await send('cognitive-event', { type: 'shock', agentName: p.name, value: spike, round: speakerTurnCount })
            } else if (p.accumulated_dissonance >= 3.0) {
              await send('cognitive-event', { type: 'overload', agentName: p.name, value: p.accumulated_dissonance, round: speakerTurnCount })
              p.accumulated_dissonance = 0
            }
            dissonanceLog[p.id].push(p.previous_dissonance)
          }

          await send('state-update', {
            agents: personas.map((p) => ({
              id: p.id,
              name: p.name,
              profileTitle: p.profileTitle,
              energy: p.energy,
              accumulated_dissonance: p.accumulated_dissonance,
              stance: p.stance,
              turns_since_last_speak: p.turns_since_last_speak,
              currentEmotion: p.currentEmotion,
              emotionIntensity: p.emotionIntensity,
            })),
          })

          // Emit opinion convergence metrics (based on latest utterance similarity)
          const conv = computeConvergence(personas, history)
          await send('convergence', { turn: speakerTurnCount, min: conv.min, max: conv.max, median: conv.median, clusters: conv.clusters })
        }
      }

      const closingMetrics = buildDiscussionMetrics(personas, history, speakerTurnCount, discussionSpeakers, noveltyLog, durationPreset)
      const closingText = await generateModeratorClosing(
        topic,
        topicBriefingText,
        history,
        formatModeratorMetrics(locale, closingMetrics),
        model as ModelProvider,
        locale,
        providerConfig
      )
      const closingId = crypto.randomUUID()
      await streamText(closingId, 'system', hostName, closingText)
      history.push({
        id: closingId,
        speakerId: 'system',
        speakerName: hostName,
        text: closingText,
        inner_thoughts: '',
        embedding: await getEmbedding(closingText),
        isHumanPerturbation: true,
      })

      // Generate report
      await Promise.allSettled(enrichmentTasks)
      await sendProgress('report')
      const snapshot: SimulationSnapshot = {
        timestamp: Date.now(),
        history,
        trackedDissonanceLog: dissonanceLog,
      }

      const report = await generateMarkdownReport(snapshot, personas, locale, {
        topic,
        topicBriefing: topicBriefingText,
        durationLabel: `${durationPreset.label[locale]} · ${durationPreset.rangeLabel[locale]}`,
        model: model as ModelProvider,
        providerConfig,
      })
      await send('report', { markdown: report })
      await sendProgress('complete')
      await send('done', {})
    } catch (err) {
      await send('error', { message: getPublicErrorMessage(err, locale) })
    } finally {
      await Promise.allSettled(enrichmentTasks)
      await sendChain.catch(() => {})
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
