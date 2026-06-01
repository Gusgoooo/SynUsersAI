import type { ActivatedMemory, AgentPersona, PersonaEvidence, UtteranceMessage } from '@/lib/engine/types'
import { cosineSimilarity, getEmbedding } from '@/lib/engine/llm'

export interface RetrievedEvidence extends PersonaEvidence {
  relevance: number
}

function evidenceText(evidence: PersonaEvidence): string {
  return [
    evidence.quote,
    evidence.reason,
    evidence.sourceName,
    evidence.locator,
  ].filter(Boolean).join('\n')
}

export async function retrieveEvidenceForTurn(
  agent: AgentPersona,
  topic: string,
  history: UtteranceMessage[],
  limit = 4
): Promise<RetrievedEvidence[]> {
  if (!agent.evidence?.length) return []

  const recentConversation = history
    .slice(-6)
    .map((message) => `${message.speakerName}: ${message.text}`)
    .join('\n')

  const query = [
    topic,
    agent.stance,
    agent.sourceSummary,
    recentConversation,
  ].filter(Boolean).join('\n')

  const queryEmbedding = await getEmbedding(query)
  const ranked = await Promise.all(agent.evidence.map(async (evidence) => {
    const embedding = await getEmbedding(evidenceText(evidence))
    const relevance = cosineSimilarity(queryEmbedding, embedding)
    return { ...evidence, relevance }
  }))

  return ranked
    .sort((a, b) => {
      const relevanceDelta = b.relevance - a.relevance
      if (Math.abs(relevanceDelta) > 0.001) return relevanceDelta
      return b.weight - a.weight
    })
    .slice(0, limit)
}

export function filterUsedEvidence(
  available: RetrievedEvidence[],
  usedEvidenceIds?: string[]
): RetrievedEvidence[] {
  if (!usedEvidenceIds?.length) return []
  const allowed = new Set(available.map((item) => item.evidenceId))
  const used = new Set(usedEvidenceIds.filter((id) => allowed.has(id)))
  return available.filter((item) => used.has(item.evidenceId))
}

export function evidenceFromActivatedMemories(
  available: RetrievedEvidence[],
  activatedMemories?: ActivatedMemory[]
): RetrievedEvidence[] {
  const ids = activatedMemories
    ?.flatMap((memory) => memory.sourceEvidenceIds || [])
    .filter(Boolean)
  return filterUsedEvidence(available, ids)
}

export function normalizeActivatedMemories(
  raw: ActivatedMemory[] | undefined,
  available: RetrievedEvidence[]
): ActivatedMemory[] {
  if (!Array.isArray(raw)) return []
  const allowedIds = new Set(available.map((item) => item.evidenceId))

  const normalized: ActivatedMemory[] = []

  for (const memory of raw) {
      const label = String(memory?.label || '').trim()
      const influence = String(memory?.influence || '').trim()
      if (!label || !influence) continue
      const intensityValue = Number(memory.intensity)
      const intensity = Number.isFinite(intensityValue)
        ? Math.max(0, Math.min(100, Math.round(intensityValue)))
        : 60
      const sourceEvidenceIds = (memory.sourceEvidenceIds || [])
        .map((id) => String(id))
        .filter((id) => allowedIds.has(id))

      normalized.push({ label, influence, intensity, sourceEvidenceIds })
      if (normalized.length >= 3) break
  }

  return normalized
}

export function fallbackActivatedMemories(
  agent: AgentPersona,
  available: RetrievedEvidence[],
  locale: 'zh' | 'en'
): ActivatedMemory[] {
  const memory = agent.memoryProfile
  const firstEvidence = available[0]

  if (memory?.consumptionHabits.length) {
    return [{
      label: locale === 'en' ? 'Consumption habit' : '消费习惯',
      influence: memory.consumptionHabits[0],
      intensity: Math.max(45, Math.min(85, firstEvidence?.weight || 60)),
      sourceEvidenceIds: firstEvidence ? [firstEvidence.evidenceId] : [],
    }]
  }

  if (memory?.decisionHeuristics.length) {
    return [{
      label: locale === 'en' ? 'Decision rule' : '决策捷径',
      influence: memory.decisionHeuristics[0],
      intensity: Math.max(45, Math.min(85, firstEvidence?.weight || 60)),
      sourceEvidenceIds: firstEvidence ? [firstEvidence.evidenceId] : [],
    }]
  }

  if (firstEvidence) {
    return [{
      label: locale === 'en' ? 'Source-shaped memory' : '来源塑造的记忆',
      influence: firstEvidence.reason || firstEvidence.quote,
      intensity: Math.max(40, Math.min(80, firstEvidence.weight)),
      sourceEvidenceIds: [firstEvidence.evidenceId],
    }]
  }

  return []
}
