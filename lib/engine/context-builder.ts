import { AgentPersona, UtteranceMessage } from './types'
import { buildAgentSystemPrompt, buildAgentUserPrompt } from './prompts'
import type { Locale } from '@/lib/locale'

interface PromptPair {
  system: string
  user: string
}

export function compileSingleHopPrompt(
  agent: AgentPersona,
  historyWindow: UtteranceMessage[],
  _phaseDirective: string,
  topic?: string,
  sessionProgress?: number,
  locale: Locale = 'zh'
): PromptPair {
  const system = buildAgentSystemPrompt(agent, topic || (locale === 'en' ? 'discussion' : '讨论'), locale)
  const user = buildAgentUserPrompt(agent, historyWindow, sessionProgress ?? 0.3, locale)
  return { system, user }
}
