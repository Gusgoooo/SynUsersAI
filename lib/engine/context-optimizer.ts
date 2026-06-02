import type { AgentPersona, UtteranceMessage } from './types'
import type { Locale } from '@/lib/locale'

export interface OptimizedTurnContext {
  recentConversation: string
  roomState: string
  speakerContinuity: string
  moderatorFocus: string
  includedTurnCount: number
  estimatedChars: number
}

interface OptimizeContextOptions {
  maxRecentTurns?: number
  maxAnchorTurns?: number
  maxRoomSpeakers?: number
}

const HIGH_SIGNAL_ZH = [
  '不同意',
  '反对',
  '问题',
  '风险',
  '条件',
  '如果',
  '为什么',
  '但是',
  '不过',
  '分歧',
  '结论',
  '改变',
]

const HIGH_SIGNAL_EN = [
  'disagree',
  'push back',
  'risk',
  'condition',
  'if ',
  'why',
  'but ',
  'however',
  'concern',
  'objection',
  'changed',
  'conclusion',
]

export function clipForPrompt(text: unknown, max = 420): string {
  const value = String(text || '').trim().replace(/\s+/g, ' ')
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}…`
}

export function formatPromptList(items: unknown[] | undefined, locale: Locale, maxItems = 4): string {
  const values = (items || [])
    .map((item) => clipForPrompt(item, 80))
    .filter(Boolean)
    .slice(0, maxItems)
  return values.join(locale === 'en' ? '; ' : '；')
}

function formatTurn(message: UtteranceMessage, locale: Locale, max = 220): string {
  return locale === 'en'
    ? `${message.speakerName}: ${clipForPrompt(message.text, max)}`
    : `${message.speakerName}：${clipForPrompt(message.text, max)}`
}

function hasHighSignal(text: string, locale: Locale): boolean {
  const normalized = text.toLowerCase()
  const terms = locale === 'en' ? HIGH_SIGNAL_EN : HIGH_SIGNAL_ZH
  return terms.some((term) => normalized.includes(term))
}

function pushUnique(target: UtteranceMessage[], seen: Set<string>, message: UtteranceMessage | undefined) {
  if (!message || seen.has(message.id)) return
  seen.add(message.id)
  target.push(message)
}

export function optimizeTurnContext(
  speaker: AgentPersona,
  history: UtteranceMessage[],
  locale: Locale,
  options: OptimizeContextOptions = {}
): OptimizedTurnContext {
  const maxRecentTurns = options.maxRecentTurns ?? 5
  const maxAnchorTurns = options.maxAnchorTurns ?? 2
  const maxRoomSpeakers = options.maxRoomSpeakers ?? 6
  const seen = new Set<string>()
  const selected: UtteranceMessage[] = []

  const moderatorFocusMessage = [...history].reverse().find((message) => message.speakerId === 'system')
  const ownRecent = history.filter((message) => message.speakerId === speaker.id).slice(-2)
  const recent = history.slice(-maxRecentTurns)
  const anchors = history
    .slice(-20)
    .filter((message) => message.speakerId !== 'system' && message.speakerId !== speaker.id && hasHighSignal(message.text, locale))
    .slice(-maxAnchorTurns)

  for (const message of ownRecent) pushUnique(selected, seen, message)
  for (const message of anchors) pushUnique(selected, seen, message)
  for (const message of recent) pushUnique(selected, seen, message)

  selected.sort((a, b) => history.indexOf(a) - history.indexOf(b))

  const latestBySpeaker = new Map<string, UtteranceMessage>()
  for (const message of history) {
    if (message.speakerId === 'system') continue
    latestBySpeaker.set(message.speakerId, message)
  }

  const roomMessages = Array.from(latestBySpeaker.values())
    .filter((message) => message.speakerId !== speaker.id)
    .slice(-maxRoomSpeakers)

  const recentConversation = selected.map((message) => formatTurn(message, locale)).join('\n')
  const roomState = roomMessages.map((message) => formatTurn(message, locale, 110)).join('\n')
  const speakerContinuity = ownRecent.map((message) => formatTurn(message, locale, 120)).join('\n')
  const moderatorFocus = moderatorFocusMessage ? formatTurn(moderatorFocusMessage, locale, 180) : ''
  const estimatedChars = [recentConversation, roomState, speakerContinuity, moderatorFocus].join('\n').length

  return {
    recentConversation,
    roomState,
    speakerContinuity,
    moderatorFocus,
    includedTurnCount: selected.length,
    estimatedChars,
  }
}
