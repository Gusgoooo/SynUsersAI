import { AgentPersona, SimulationSnapshot, UtteranceMessage } from './types'
import { chatCompletion, cosineSimilarity, type ModelProvider } from './llm'
import type { LLMProviderConfigInput } from '@/lib/llm/provider-config'
import type { Locale } from '@/lib/locale'

interface FlashpointEntry {
  concept: string
  totalCD: number
  agentsAffected: number
}

interface ConsensusBreaker {
  utteranceId: string
  speakerId: string
  speakerName: string
  text: string
  maxSpike: number
  affectedAgent: string
}

interface MarkdownReportOptions {
  topic?: string
  topicBriefing?: string
  durationLabel?: string
  model?: ModelProvider
  providerConfig?: LLMProviderConfigInput
}

interface SourceAnchor {
  evidenceId: string
  sourceName: string
  locator: string
  quote: string
  reason: string
}

interface PersonaReportSignal {
  name: string
  profileTitle: string
  initialStance: string
  lastExpressedView: string
  turnCount: number
  shiftMagnitude: number
  peakDissonance: number
  sourceEvidenceIds: string[]
}

export async function generateMarkdownReport(
  snapshot: SimulationSnapshot,
  personas: AgentPersona[],
  locale: Locale = 'zh',
  options: MarkdownReportOptions = {}
): Promise<string> {
  const promptInput = buildReportInput(snapshot, personas, locale, options)

  const markdown = await chatCompletion(
    [
      { role: 'system', content: buildReportSystemPrompt(locale) },
      { role: 'user', content: promptInput },
    ],
    {
      temperature: 0.35,
      maxTokens: 2600,
      model: options.model || 'gpt-5.5',
      providerConfig: options.providerConfig,
    }
  )
  return normalizeMarkdown(markdown)
}

function buildReportSystemPrompt(locale: Locale): string {
  if (locale === 'en') {
    return `You are a senior user-research analyst turning a synthetic-user roundtable into a Markdown preview report.

Do not use a fixed template. Choose the report structure from the topic and the actual conversation.

Quality bar:
- concise, sharp, and non-repetitive
- lead with the decision signal, not process narration
- quantify opinions, disagreement, argument strength, and residual uncertainty when the input supports it
- explain each persona's stance or viewpoint change using the conversation and dissonance signals
- cite source anchors as [E...] when available; never invent source IDs
- if a claim comes only from simulated dialogue, say so plainly
- include enough source/context detail to make the report credible
- output Markdown only, no code fence`
  }

  return `你是资深用户研究分析师，要把一场合成用户圆桌整理成 Markdown preview 报告。

不要套固定模板。报告结构必须根据议题和真实对话内容来定。

质量要求：
- 简洁、有力、不重复
- 先给决策信号，不要先讲流程
- 能量化就量化：意见分布、分歧强度、论据强弱、剩余不确定性
- 解释每个人设的立场或观点变化，并用对话和张力信号支撑
- 有来源锚点时用 [E...] 引用；绝不编造来源 ID
- 如果某个判断只来自模拟对话，要说清楚
- 展示足够来源/上下文来增加可信度
- 只输出 Markdown，不要代码块`
}

function buildReportInput(
  snapshot: SimulationSnapshot,
  personas: AgentPersona[],
  locale: Locale,
  options: MarkdownReportOptions
): string {
  const anchors = collectSourceAnchors(snapshot, personas)
  const personaSignals = buildPersonaSignals(snapshot, personas)
  const flashpoints = computeFlashpoints(snapshot, personas).slice(0, 6)
  const breaker = findConsensusBreaker(snapshot, personas)
  const convergence = computeFinalConvergence(snapshot, personas)
  const transcript = formatTranscript(snapshot.history, locale)

  if (locale === 'en') {
    return `Topic: ${options.topic || 'Unknown'}
Duration mode: ${options.durationLabel || 'Not specified'}
Generated at: ${new Date(snapshot.timestamp).toISOString()}

Topic briefing:
${options.topicBriefing || 'No separate topic briefing.'}

Quantitative signals:
- Total utterances: ${snapshot.history.length}
- Participant turns: ${snapshot.history.filter((message) => message.speakerId !== 'system').length}
- Final opinion similarity median: ${convergence.median.toFixed(3)}
- Final disagreement spread: ${convergence.spread.toFixed(3)}
- Estimated final camps: ${convergence.clusters}
- Top friction concepts: ${flashpoints.map((item) => `${item.concept} (${item.totalCD.toFixed(2)}, ${item.agentsAffected} affected)`).join('; ') || 'none'}
- Sharpest tension spike: ${breaker ? `${breaker.speakerName} -> ${breaker.affectedAgent}, ${breaker.maxSpike.toFixed(3)}: ${truncate(breaker.text, 120)}` : 'none'}

Persona stance signals:
${personaSignals.map(formatPersonaSignal).join('\n')}

Source anchors:
${formatSourceAnchors(anchors, locale)}

Conversation transcript:
${transcript}

Write the Markdown report now. Keep it concise, but include persona stance changes, quantified disagreement, and citations where available.`
  }

  return `议题：${options.topic || '未知'}
时长档位：${options.durationLabel || '未指定'}
生成时间：${new Date(snapshot.timestamp).toISOString()}

议题背景：
${options.topicBriefing || '无单独议题背景。'}

量化信号：
- 总发言数：${snapshot.history.length}
- 参与者发言数：${snapshot.history.filter((message) => message.speakerId !== 'system').length}
- 最终观点相似度中位数：${convergence.median.toFixed(3)}
- 最终分歧跨度：${convergence.spread.toFixed(3)}
- 估计最终阵营数：${convergence.clusters}
- 主要摩擦概念：${flashpoints.map((item) => `${item.concept}（张力 ${item.totalCD.toFixed(2)}，影响 ${item.agentsAffected} 人）`).join('；') || '无'}
- 最大张力跳点：${breaker ? `${breaker.speakerName} -> ${breaker.affectedAgent}，${breaker.maxSpike.toFixed(3)}：${truncate(breaker.text, 120)}` : '无'}

人设立场信号：
${personaSignals.map(formatPersonaSignal).join('\n')}

来源锚点：
${formatSourceAnchors(anchors, locale)}

完整对话转写：
${transcript}

现在生成 Markdown 报告。保持简洁，但必须体现人设立场变化、量化分歧和可用来源引用。`
}

function formatPersonaSignal(signal: PersonaReportSignal): string {
  return `- ${signal.name}${signal.profileTitle ? ` (${signal.profileTitle})` : ''}: initial="${truncate(signal.initialStance, 110)}"; final="${truncate(signal.lastExpressedView, 150)}"; turns=${signal.turnCount}; shift=${signal.shiftMagnitude.toFixed(3)}; peak=${signal.peakDissonance.toFixed(3)}; sources=${signal.sourceEvidenceIds.join(', ') || 'none'}`
}

function collectSourceAnchors(snapshot: SimulationSnapshot, personas: AgentPersona[]): SourceAnchor[] {
  const map = new Map<string, SourceAnchor>()

  for (const persona of personas) {
    for (const item of persona.evidence || []) {
      map.set(item.evidenceId, item)
    }
  }

  for (const message of snapshot.history) {
    for (const item of message.evidence || []) {
      map.set(item.evidenceId, item)
    }
  }

  return [...map.values()].slice(0, 30)
}

function formatSourceAnchors(anchors: SourceAnchor[], locale: Locale): string {
  if (anchors.length === 0) {
    return locale === 'en'
      ? 'No external/source anchors were attached. Treat claims as simulated-dialogue evidence.'
      : '没有附加外部来源锚点。报告中的判断应视为模拟对话证据。'
  }

  return anchors
    .map((item) => `- [${item.evidenceId}] ${item.sourceName} · ${item.locator}: ${truncate(item.quote, 160)}${item.reason ? ` (${truncate(item.reason, 80)})` : ''}`)
    .join('\n')
}

function buildPersonaSignals(snapshot: SimulationSnapshot, personas: AgentPersona[]): PersonaReportSignal[] {
  return personas.map((persona) => {
    const messages = snapshot.history.filter((message) => message.speakerId === persona.id)
    const cdLog = snapshot.trackedDissonanceLog[persona.id] ?? []
    const sourceEvidenceIds = new Set<string>()

    for (const message of messages) {
      for (const id of message.usedEvidenceIds || []) sourceEvidenceIds.add(id)
      for (const item of message.evidence || []) sourceEvidenceIds.add(item.evidenceId)
    }

    return {
      name: persona.name,
      profileTitle: persona.profileTitle || '',
      initialStance: persona.stance,
      lastExpressedView: messages.slice(-2).map((message) => message.text).join(' / ') || persona.stance,
      turnCount: messages.length,
      shiftMagnitude: cdLog.reduce((sum, value) => sum + value, 0),
      peakDissonance: cdLog.length ? Math.max(...cdLog) : 0,
      sourceEvidenceIds: [...sourceEvidenceIds].slice(0, 8),
    }
  })
}

function formatTranscript(history: UtteranceMessage[], locale: Locale): string {
  return history
    .map((message, index) => {
      const evidence = message.usedEvidenceIds?.length ? ` [${message.usedEvidenceIds.join(', ')}]` : ''
      return locale === 'en'
        ? `${index + 1}. ${message.speakerName}: ${truncate(message.text, 360)}${evidence}`
        : `${index + 1}. ${message.speakerName}：${truncate(message.text, 360)}${evidence}`
    })
    .join('\n')
}

function computeFinalConvergence(
  snapshot: SimulationSnapshot,
  personas: AgentPersona[]
): { median: number; spread: number; clusters: number } {
  const finalEmbeddings: number[][] = []
  for (const persona of personas) {
    const message = [...snapshot.history].reverse().find((item) => item.speakerId === persona.id && item.embedding)
    if (message?.embedding) finalEmbeddings.push(message.embedding)
  }

  if (finalEmbeddings.length < 2) return { median: 0, spread: 0, clusters: 1 }

  const similarities: number[] = []
  for (let i = 0; i < finalEmbeddings.length; i++) {
    for (let j = i + 1; j < finalEmbeddings.length; j++) {
      similarities.push(cosineSimilarity(finalEmbeddings[i], finalEmbeddings[j]))
    }
  }

  similarities.sort((a, b) => a - b)
  const median = similarities[Math.floor(similarities.length / 2)]
  const spread = similarities[similarities.length - 1] - similarities[0]
  const threshold = median
  const visited = new Set<number>()
  let clusters = 0

  for (let i = 0; i < finalEmbeddings.length; i++) {
    if (visited.has(i)) continue
    visited.add(i)
    clusters++
    for (let j = i + 1; j < finalEmbeddings.length; j++) {
      if (!visited.has(j) && cosineSimilarity(finalEmbeddings[i], finalEmbeddings[j]) > threshold) {
        visited.add(j)
      }
    }
  }

  return { median, spread, clusters }
}

function computeFlashpoints(snapshot: SimulationSnapshot, personas: AgentPersona[]): FlashpointEntry[] {
  const conceptScores = new Map<string, { totalCD: number; agents: Set<string> }>()

  for (const msg of snapshot.history) {
    if (!msg.embedding) continue

    const words = extractConcepts(msg.text)
    for (const persona of personas) {
      if (persona.id === msg.speakerId) continue
      if (persona.current_belief_vector.length === 0) continue

      const cos = cosineSimilarity(msg.embedding, persona.current_belief_vector)
      const cd = 1.0 - Math.abs(cos)

      if (cd > 0.1) {
        for (const word of words) {
          const entry = conceptScores.get(word) ?? { totalCD: 0, agents: new Set() }
          entry.totalCD += cd
          entry.agents.add(persona.id)
          conceptScores.set(word, entry)
        }
      }
    }
  }

  return [...conceptScores.entries()]
    .map(([concept, { totalCD, agents }]) => ({ concept, totalCD, agentsAffected: agents.size }))
    .sort((a, b) => b.totalCD - a.totalCD)
    .slice(0, 10)
}

function findConsensusBreaker(snapshot: SimulationSnapshot, personas: AgentPersona[]): ConsensusBreaker | null {
  let maxSpike = 0
  let breaker: ConsensusBreaker | null = null

  for (const agentId of Object.keys(snapshot.trackedDissonanceLog)) {
    const log = snapshot.trackedDissonanceLog[agentId]
    for (let i = 1; i < log.length; i++) {
      const spike = log[i] - log[i - 1]
      if (spike > maxSpike && i < snapshot.history.length) {
        maxSpike = spike
        const msg = snapshot.history[i]
        const agent = personas.find(p => p.id === agentId)
        breaker = {
          utteranceId: msg.id,
          speakerId: msg.speakerId,
          speakerName: msg.speakerName,
          text: msg.text,
          maxSpike: spike,
          affectedAgent: agent?.name ?? agentId,
        }
      }
    }
  }

  return breaker
}

function extractConcepts(text: string): string[] {
  return text
    .replace(/[^一-鿿\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2)
    .slice(0, 5)
}

function normalizeMarkdown(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:markdown|md)?\s*/i, '')
    .replace(/```$/i, '')
    .trim()
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}
