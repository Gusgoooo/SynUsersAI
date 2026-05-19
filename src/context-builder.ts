import { AgentPersona, UtteranceMessage } from './types.js'

interface PromptPair {
  system: string
  user: string
}

export function compileSingleHopPrompt(
  agent: AgentPersona,
  historyWindow: UtteranceMessage[],
  phaseDirective: string
): PromptPair {
  // System: Locked Raw Core Profile + Current Belief Summary
  const system = `You are ${agent.name}. ${agent.raw_profile_text}

Current belief: ${agent.current_belief_summary}

Respond in character. Keep responses under 80 words. Output JSON:
{"text": "your spoken response", "inner_thoughts": "brief private thought"}`

  // Sliding window: last 3 messages
  let window = historyWindow.slice(-3)

  // goldfish_attention: randomly drop 50% of window context
  if (agent.traits.conscientiousness < 40 && window.length > 1) {
    window = window.filter(() => Math.random() > 0.5)
    if (window.length === 0) window = historyWindow.slice(-1)
  }

  // low_detail_memory: substitute non-core keywords with placeholders
  const contextLines = window.map(msg => {
    let content = msg.text
    if (agent.traits.conscientiousness < 30) {
      const nonCoreWords = content.split(/\s+/).filter(
        w => !agent.keywords.some(kw => w.includes(kw)) && w.length > 4
      )
      for (const word of nonCoreWords.slice(0, 3)) {
        content = content.replace(word, '(...)')
      }
    }
    return `${msg.speakerName}: ${content}`
  })

  const user = `Recent conversation:
${contextLines.join('\n')}

${phaseDirective ? `Directive: ${phaseDirective}\n` : ''}Respond as ${agent.name}.`

  return { system, user }
}
