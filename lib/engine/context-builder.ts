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
  locale: Locale = 'zh',
  topicBriefing?: string
): PromptPair {
  const normalizedTopic = topic || (locale === 'en' ? 'discussion' : '讨论')
  const system = buildAgentSystemPrompt(agent, normalizedTopic, locale, topicBriefing)
  const user = buildAgentUserPrompt(agent, historyWindow, sessionProgress ?? 0.3, locale, normalizedTopic, topicBriefing)
  return { system, user }
}
