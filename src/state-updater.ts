import { AgentPersona, UtteranceMessage } from './types.js'
import { getEmbedding, cosineSimilarity, chatCompletion } from './llm.js'

function shouldExtractEmbedding(text: string, personas: AgentPersona[], isHuman: boolean): boolean {
  if (isHuman) return true
  const lower = text.toLowerCase()
  for (const agent of personas) {
    if (agent.keywords.some(kw => lower.includes(kw.toLowerCase()))) return true
    if (agent.friction_topics.some(ft => lower.includes(ft.toLowerCase()))) return true
  }
  return false
}

async function refreshBelief(agent: AgentPersona, history: UtteranceMessage[]): Promise<void> {
  const recentContext = history.slice(-5).map(m => `${m.speakerName}: ${m.text}`).join('\n')

  const prompt = `You are ${agent.name}. Your profile: ${agent.raw_profile_text}
Your previous belief: "${agent.current_belief_summary}"

Recent conversation:
${recentContext}

Based on what you've heard, how has your belief evolved? Respond with a single sentence summarizing your CURRENT position. Be specific and concise.`

  const newBelief = await chatCompletion(
    [{ role: 'user', content: prompt }],
    { temperature: 0.6, maxTokens: 100 }
  )

  agent.current_belief_summary = newBelief.trim()
  agent.current_belief_vector = await getEmbedding(agent.current_belief_summary)

  console.log(`  [Belief Refresh] ${agent.name}: "${agent.current_belief_summary}"`)
}

export async function processTurnAndReflect(
  personas: AgentPersona[],
  lastUtterance: UtteranceMessage,
  history: UtteranceMessage[]
): Promise<void> {
  // Conditional Embedding Gate
  if (!lastUtterance.embedding) {
    const needsEmbed = shouldExtractEmbedding(
      lastUtterance.text,
      personas,
      lastUtterance.isHumanPerturbation ?? false
    )
    if (needsEmbed) {
      lastUtterance.embedding = await getEmbedding(lastUtterance.text)
    }
  }

  const reflectionPromises: Promise<void>[] = []

  for (const agent of personas) {
    if (agent.id === lastUtterance.speakerId) {
      agent.turns_since_last_speak = 0
      agent.energy = Math.max(0, agent.energy - 3)
      continue
    }

    // Listening agent updates
    agent.turns_since_last_speak++
    agent.energy = Math.max(0, agent.energy - 1)

    // Compute CD if embedding available
    let currentCD = 0
    if (lastUtterance.embedding && agent.current_belief_vector.length > 0) {
      const cos = cosineSimilarity(lastUtterance.embedding, agent.current_belief_vector)
      currentCD = 1.0 - Math.abs(cos)
    }

    agent.accumulated_dissonance += currentCD
    const dissonanceSpike = currentCD - agent.previous_dissonance
    agent.previous_dissonance = currentCD

    // Cognitive Shock: sudden spike in dissonance
    if (dissonanceSpike >= agent.cognitive_config.shock_threshold) {
      console.log(`  [Cognitive Shock] ${agent.name} spike=${dissonanceSpike.toFixed(3)}`)
      agent.accumulated_dissonance = 0
      reflectionPromises.push(refreshBelief(agent, history))
    }
    // Mental Overload: accumulated dissonance exceeds capacity
    else if (agent.accumulated_dissonance >= agent.cognitive_config.overload_threshold) {
      console.log(`  [Mental Overload] ${agent.name} accumulated=${agent.accumulated_dissonance.toFixed(3)}`)
      agent.accumulated_dissonance = 0
      reflectionPromises.push(refreshBelief(agent, history))
    }
  }

  await Promise.all(reflectionPromises)
}
