import { AgentPersona, UtteranceMessage } from './types'
import { buildAgentSystemPrompt, buildAgentUserPrompt } from './prompts'

interface PromptPair {
  system: string
  user: string
}

export function compileSingleHopPrompt(
  agent: AgentPersona,
  historyWindow: UtteranceMessage[],
  _phaseDirective: string,
  topic?: string,
  sessionProgress?: number
): PromptPair {
  const system = buildAgentSystemPrompt(agent, topic || '讨论')
  const user = buildAgentUserPrompt(agent, historyWindow, sessionProgress ?? 0.3)
  return { system, user }
}
