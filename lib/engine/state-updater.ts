import { AgentPersona, UtteranceMessage } from './types'
import { getEmbedding, cosineSimilarity } from './llm'
import { computeEmotionChain } from './emotion-chain'

export async function processTurnAndReflect(
  personas: AgentPersona[],
  lastUtterance: UtteranceMessage,
  _history: UtteranceMessage[]
): Promise<void> {
  if (!lastUtterance.embedding) {
    lastUtterance.embedding = await getEmbedding(lastUtterance.text)
  }

  for (const agent of personas) {
    if (agent.id === lastUtterance.speakerId) {
      agent.turns_since_last_speak = 0
      agent.energy = Math.max(0, agent.energy - 3)
      continue
    }

    agent.turns_since_last_speak++
    agent.energy = Math.max(0, agent.energy - 1)

    let currentCD = 0
    if (lastUtterance.embedding && agent.current_belief_vector.length > 0) {
      const cos = cosineSimilarity(lastUtterance.embedding, agent.current_belief_vector)
      currentCD = 1.0 - Math.abs(cos)
    }

    agent.accumulated_dissonance += currentCD
    agent.previous_dissonance = currentCD

    const isAddressed = lastUtterance.text.includes(agent.name)
    const { emotion, intensity } = computeEmotionChain(agent, currentCD, isAddressed)
    agent.currentEmotion = emotion
    agent.emotionIntensity = intensity
  }
}
