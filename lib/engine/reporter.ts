import { AgentPersona, SimulationSnapshot, UtteranceMessage } from './types'
import { cosineSimilarity } from './llm'

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

export function generateMarkdownReport(
  snapshot: SimulationSnapshot,
  personas: AgentPersona[]
): string {
  const lines: string[] = []

  lines.push('# Cognitive Dynamics Simulation Report')
  lines.push('')
  lines.push(`**Generated:** ${new Date(snapshot.timestamp).toISOString()}`)
  lines.push(`**Total Utterances:** ${snapshot.history.length}`)
  lines.push(`**Agents:** ${personas.map(p => p.name).join(', ')}`)
  lines.push('')

  // === Friction Flashpoints Matrix ===
  lines.push('## Friction Flashpoints Matrix')
  lines.push('')
  lines.push('Top concepts generating maximum cumulative cognitive dissonance across all agents.')
  lines.push('')

  const flashpoints = computeFlashpoints(snapshot, personas)
  lines.push('| Rank | Concept | Cumulative CD | Agents Affected |')
  lines.push('|------|---------|---------------|-----------------|')
  for (let i = 0; i < Math.min(3, flashpoints.length); i++) {
    const fp = flashpoints[i]
    lines.push(`| ${i + 1} | ${fp.concept} | ${fp.totalCD.toFixed(3)} | ${fp.agentsAffected} |`)
  }
  lines.push('')

  // === The Consensus Breaker ===
  lines.push('## The Consensus Breaker')
  lines.push('')

  const breaker = findConsensusBreaker(snapshot, personas)
  if (breaker) {
    lines.push(`The single utterance causing the sharpest dissonance spike:`)
    lines.push('')
    lines.push(`- **Speaker:** ${breaker.speakerName} (\`${breaker.speakerId}\`)`)
    lines.push(`- **Text:** "${breaker.text}"`)
    lines.push(`- **Max Spike:** ${breaker.maxSpike.toFixed(4)}`)
    lines.push(`- **Most Affected:** ${breaker.affectedAgent}`)
  } else {
    lines.push('No significant dissonance spikes detected.')
  }
  lines.push('')

  // === Mental Shifting Matrix ===
  lines.push('## Mental Shifting Matrix')
  lines.push('')
  lines.push('Comparison of initial vs. post-debate belief states for all agents.')
  lines.push('')
  lines.push('| Agent | Initial Belief | Final Belief | Shift Magnitude |')
  lines.push('|-------|---------------|--------------|-----------------|')

  for (const persona of personas) {
    const cdLog = snapshot.trackedDissonanceLog[persona.id] ?? []
    const totalShift = cdLog.reduce((sum, v) => sum + v, 0)
    const initialBelief = getInitialBelief(persona, snapshot)
    lines.push(
      `| ${persona.name} | ${truncate(initialBelief, 40)} | ${truncate(persona.stance, 40)} | ${totalShift.toFixed(3)} |`
    )
  }
  lines.push('')

  // === Dissonance Timeline ===
  lines.push('## Dissonance Accumulation Log')
  lines.push('')
  for (const persona of personas) {
    const cdLog = snapshot.trackedDissonanceLog[persona.id] ?? []
    if (cdLog.length === 0) continue
    const sparkline = cdLog.map(v => v > 0.5 ? '█' : v > 0.3 ? '▓' : v > 0.1 ? '▒' : '░').join('')
    lines.push(`**${persona.name}:** \`${sparkline}\` (peak: ${Math.max(...cdLog).toFixed(3)})`)
  }
  lines.push('')

  return lines.join('\n')
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

function getInitialBelief(persona: AgentPersona, snapshot: SimulationSnapshot): string {
  const cdLog = snapshot.trackedDissonanceLog[persona.id] ?? []
  if (cdLog.length === 0) return persona.stance
  return persona.stance
}

function extractConcepts(text: string): string[] {
  return text
    .replace(/[^一-鿿\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2)
    .slice(0, 5)
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}
