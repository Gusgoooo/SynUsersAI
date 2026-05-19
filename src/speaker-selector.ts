import { AgentPersona, UtteranceMessage } from './types.js'
import { cosineSimilarity } from './llm.js'

export function calculateAgentImpulse(
  agent: AgentPersona,
  latestMessage: UtteranceMessage,
  contextSize: number
): number {
  const text = latestMessage.text.toLowerCase()

  // Heuristic Match Score (0.0 - 1.0)
  const keywordHits = agent.keywords.filter(kw => text.includes(kw.toLowerCase())).length / Math.max(1, agent.keywords.length)
  const domainHits = agent.domains.filter(d => text.includes(d.toLowerCase())).length / Math.max(1, agent.domains.length)
  const frictionHits = agent.friction_topics.filter(f => text.includes(f.toLowerCase())).length / Math.max(1, agent.friction_topics.length)
  const textMatchScore = Math.min(1.0, keywordHits * 0.5 + domainHits * 0.35 + frictionHits * 0.4)

  // Cognitive Dissonance (CD)
  let cd = 0
  if (latestMessage.embedding && agent.current_belief_vector.length > 0) {
    const cos = cosineSimilarity(latestMessage.embedding, agent.current_belief_vector)
    cd = 1.0 - Math.abs(cos)
  }

  // Refractory Inhibition (RI)
  const ri = Math.exp(-agent.cognitive_config.lambda * agent.turns_since_last_speak)

  // Core impulse from cognitive dynamics
  let impulse = (agent.cognitive_config.w2 * cd - agent.cognitive_config.w3 * ri) * 100

  // Text match contribution
  impulse += textMatchScore * 30

  // Extroversion modifier
  impulse += (agent.traits.extroversion - 50) * 0.5

  // @mention override
  if (text.includes(`@${agent.name.toLowerCase()}`)) {
    impulse += 120
  }

  // Long silence compensation
  impulse += agent.turns_since_last_speak * 8

  // Fatigue penalty
  impulse *= agent.energy / 100

  // Session curve alterations
  const progress = contextSize > 0 ? Math.min(1, contextSize / 100) : 0
  switch (agent.current_curve) {
    case 'fading':
      impulse *= Math.max(0.1, 1 - progress)
      break
    case 'warming':
      impulse *= Math.min(1.5, 0.2 + progress * 1.3)
      break
    case 'burst':
      impulse *= Math.abs(Math.sin(progress * Math.PI * 3))
      break
    case 'erratic':
      impulse *= 0.3 + Math.random() * 1.4
      break
  }

  // Random noise ±40
  impulse += (Math.random() - 0.5) * 80

  return Math.max(0, impulse)
}

export function selectNextSpeaker(
  personas: AgentPersona[],
  latestMessage: UtteranceMessage,
  contextSize: number
): AgentPersona | null {
  if (personas.length === 0) return null

  const scored = personas
    .filter(p => p.id !== latestMessage.speakerId)
    .map(p => ({
      persona: p,
      impulse: calculateAgentImpulse(p, latestMessage, contextSize),
    }))
    .sort((a, b) => b.impulse - a.impulse)

  if (scored.length === 0) return null

  console.log(
    '  [Impulse]',
    scored.slice(0, 4).map(s => `${s.persona.name}=${s.impulse.toFixed(1)}`).join(' | ')
  )

  return scored[0].persona
}
