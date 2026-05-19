import { AgentPersona, UtteranceMessage } from './types.js'
import { chatCompletionJSON, getEmbedding } from './llm.js'

interface GeneratedPayload {
  topic: string
}

interface ManualPayload {
  personas: AgentPersona[]
  ignitionMessage?: UtteranceMessage
}

interface InitResult {
  personas: AgentPersona[]
  ignitionMessage: UtteranceMessage
}

interface GeneratedAgent {
  name: string
  raw_profile_text: string
  traits: { extroversion: number; initiative: number; agreeableness: number; conscientiousness: number }
  cognitive_config: { w2: number; w3: number; lambda: number; shock_threshold: number; overload_threshold: number }
  keywords: string[]
  domains: string[]
  friction_topics: string[]
  initial_belief: string
  curve: 'fading' | 'warming' | 'burst' | 'erratic'
}

interface GeneratedResult {
  agents: GeneratedAgent[]
  ignition_text: string
}

export async function initializeSimulationEnviron(
  mode: 'GENERATED' | 'MANUAL',
  payload: GeneratedPayload | ManualPayload
): Promise<InitResult> {
  if (mode === 'MANUAL') {
    const p = payload as ManualPayload
    const ignition = p.ignitionMessage ?? {
      id: crypto.randomUUID(),
      speakerId: 'system',
      speakerName: 'System',
      text: '讨论开始。',
      inner_thoughts: '',
    }
    return { personas: p.personas, ignitionMessage: ignition }
  }

  const { topic } = payload as GeneratedPayload

  const prompt = `You are a simulation architect. Given the topic "${topic}", generate 8 diverse debate agents and one high-impact ignition message to start the debate.

Each agent must have:
- name: 2-char Chinese name
- raw_profile_text: 50-word personality/background description
- traits: { extroversion (0-100), initiative (0-100), agreeableness (0-100), conscientiousness (0-100) }
- cognitive_config: { w2 (0.3-0.9), w3 (0.2-0.7), lambda (0.1-0.5), shock_threshold (0.3-0.7), overload_threshold (1.5-4.0) }
- keywords: 3-5 trigger keywords for this agent
- domains: 2-3 knowledge domains
- friction_topics: 2-3 topics that cause cognitive dissonance
- initial_belief: one sentence summarizing their starting position
- curve: one of "fading" | "warming" | "burst" | "erratic"

The 8 agents should span: strong supporter, strong opposer, rational neutral, emotional advocate, provocateur, silent observer, opinion leader, devil's advocate.

Also generate ignition_text: a provocative 1-2 sentence opening statement designed to maximally activate multiple agents.

Return JSON:
\`\`\`json
{
  "agents": [...],
  "ignition_text": "..."
}
\`\`\``

  const result = await chatCompletionJSON<GeneratedResult>(
    [{ role: 'user', content: prompt }],
    { temperature: 0.9, maxTokens: 4096 }
  )

  const personas: AgentPersona[] = await Promise.all(
    result.agents.map(async (agent) => {
      const beliefVector = await getEmbedding(agent.initial_belief)
      return {
        id: crypto.randomUUID(),
        name: agent.name,
        raw_profile_text: agent.raw_profile_text,
        traits: agent.traits,
        cognitive_config: agent.cognitive_config,
        keywords: agent.keywords,
        domains: agent.domains,
        friction_topics: agent.friction_topics,
        current_belief_summary: agent.initial_belief,
        current_belief_vector: beliefVector,
        turns_since_last_speak: 0,
        accumulated_dissonance: 0,
        previous_dissonance: 0,
        current_curve: agent.curve,
        energy: 100,
      }
    })
  )

  const ignitionEmbedding = await getEmbedding(result.ignition_text)
  const ignitionMessage: UtteranceMessage = {
    id: crypto.randomUUID(),
    speakerId: 'system',
    speakerName: 'Moderator',
    text: result.ignition_text,
    inner_thoughts: '',
    embedding: ignitionEmbedding,
    isHumanPerturbation: true,
  }

  return { personas, ignitionMessage }
}
