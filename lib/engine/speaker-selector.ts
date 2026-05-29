import { AgentPersona, UtteranceMessage } from './types'
import { cosineSimilarity } from './llm'

export function calculateAgentImpulse(
  agent: AgentPersona,
  latestMessage: UtteranceMessage,
  contextSize: number
): number {
  const text = latestMessage.text.toLowerCase()

  const keywordHits = agent.triggerKeywords.filter(kw => text.includes(kw.toLowerCase())).length / Math.max(1, agent.triggerKeywords.length)
  const domainHits = agent.knowledgeDomains.filter(d => text.includes(d.toLowerCase())).length / Math.max(1, agent.knowledgeDomains.length)
  const frictionHits = agent.frictionTopics.filter(f => text.includes(f.toLowerCase())).length / Math.max(1, agent.frictionTopics.length)
  const textMatchScore = Math.min(1.0, keywordHits * 0.5 + domainHits * 0.35 + frictionHits * 0.4)

  let cd = 0
  if (latestMessage.embedding && agent.current_belief_vector.length > 0) {
    const cos = cosineSimilarity(latestMessage.embedding, agent.current_belief_vector)
    cd = 1.0 - Math.abs(cos)
  }

  const lambda = 0.3
  const ri = Math.exp(-lambda * agent.turns_since_last_speak)

  let impulse = (0.6 * cd - 0.4 * ri) * 100

  impulse += textMatchScore * 40

  if (text.includes(`@${agent.name.toLowerCase()}`)) {
    impulse += 120
  }

  impulse += agent.turns_since_last_speak * 8

  impulse *= agent.energy / 100

  // OCEAN influence on impulse
  if (agent.ocean) {
    impulse *= 0.7 + (agent.ocean.extraversion / 100) * 0.6 // extraverts speak more
    if (frictionHits > 0 && agent.ocean.neuroticism > 50) {
      impulse *= 1 + (agent.ocean.neuroticism - 50) / 100 // high-N amplifies friction
    }
  }

  // Emotion amplifies desire to speak
  if (agent.emotionIntensity > 0.3) {
    const emotionBoost = agent.currentEmotion === 'irritated' || agent.currentEmotion === 'excited' ? 1.3 : 1.1
    impulse *= emotionBoost
  }

  const progress = contextSize > 0 ? Math.min(1, contextSize / 100) : 0
  switch (agent.engagementCurve) {
    case 'fading': impulse *= Math.max(0.1, 1 - progress); break
    case 'warming': impulse *= Math.min(1.5, 0.2 + progress * 1.3); break
    case 'burst': impulse *= Math.abs(Math.sin(progress * Math.PI * 3)); break
    case 'erratic': impulse *= 0.3 + Math.random() * 1.4; break
  }

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
