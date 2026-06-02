import { AgentPersona, UtteranceMessage } from './types'
import { clipForPrompt, formatPromptList, optimizeTurnContext } from './context-optimizer'
import type { Locale } from '@/lib/locale'

interface PromptPair {
  system: string
  user: string
}

function compactMemory(agent: AgentPersona, locale: Locale): string {
  const memory = agent.memoryProfile
  const parts: string[] = []

  if (agent.sourceSummary) {
    parts.push(locale === 'en' ? `segment pattern: ${clipForPrompt(agent.sourceSummary, 180)}` : `人群模式：${clipForPrompt(agent.sourceSummary, 180)}`)
  }
  if (memory) {
    const semantic = formatPromptList(memory.semanticMemory, locale, 3)
    const episodes = formatPromptList(memory.episodicCompositeMemory, locale, 2)
    const habits = formatPromptList(memory.consumptionHabits, locale, 2)
    const triggers = formatPromptList(memory.emotionalTriggers, locale, 2)
    const heuristics = formatPromptList(memory.decisionHeuristics, locale, 3)
    if (semantic) parts.push(locale === 'en' ? `beliefs: ${semantic}` : `稳定信念：${semantic}`)
    if (episodes) parts.push(locale === 'en' ? `composite experiences: ${episodes}` : `复合经验：${episodes}`)
    if (habits) parts.push(locale === 'en' ? `habits: ${habits}` : `习惯：${habits}`)
    if (memory.educationCognitiveStyle) parts.push(locale === 'en' ? `cognitive style: ${clipForPrompt(memory.educationCognitiveStyle, 120)}` : `认知方式：${clipForPrompt(memory.educationCognitiveStyle, 120)}`)
    if (memory.socialIdentity) parts.push(locale === 'en' ? `social identity: ${clipForPrompt(memory.socialIdentity, 120)}` : `社会身份：${clipForPrompt(memory.socialIdentity, 120)}`)
    if (triggers) parts.push(locale === 'en' ? `emotional triggers: ${triggers}` : `情绪触发：${triggers}`)
    if (memory.languageRegister) parts.push(locale === 'en' ? `register: ${clipForPrompt(memory.languageRegister, 120)}` : `语域：${clipForPrompt(memory.languageRegister, 120)}`)
    if (heuristics) parts.push(locale === 'en' ? `decision shortcuts: ${heuristics}` : `决策捷径：${heuristics}`)
  }

  const evidence = agent.evidence
    ?.slice(0, 3)
    .map((item) => clipForPrompt(item.reason || item.quote, 150))
    .filter(Boolean)

  if (evidence?.length) {
    parts.push(locale === 'en' ? `source-shaped cues: ${evidence.join('; ')}` : `来源塑造的线索：${evidence.join('；')}`)
  }

  return parts.join('\n')
}

function compactTopicRelation(agent: AgentPersona, locale: Locale): string {
  const relation = agent.topicRelation
  if (!relation) return ''

  const known = formatPromptList(relation.likelyKnownFacts, locale, 3)
  const misunderstood = formatPromptList(relation.likelyMisunderstandings, locale, 2)
  const angles = formatPromptList(relation.decisionAngles, locale, 3)
  const traits = formatPromptList(relation.visibleTraits, locale, 3)

  if (locale === 'en') {
    return [
      `familiarity ${relation.familiarity}/100, relevance ${relation.relevance}/100, exposure ${relation.exposureLevel}`,
      relation.relationSummary ? `topic fit: ${clipForPrompt(relation.relationSummary, 160)}` : '',
      known ? `likely knows: ${known}` : '',
      misunderstood ? `may misunderstand: ${misunderstood}` : '',
      angles ? `decision angles: ${angles}` : '',
      traits ? `visible traits: ${traits}` : '',
      relation.privateInstruction ? `private calibration: ${clipForPrompt(relation.privateInstruction, 160)}` : '',
    ].filter(Boolean).join('\n')
  }

  return [
    `熟悉度 ${relation.familiarity}/100，相关度 ${relation.relevance}/100，接触层级 ${relation.exposureLevel}`,
    relation.relationSummary ? `话题交叉点：${clipForPrompt(relation.relationSummary, 160)}` : '',
    known ? `大概率知道：${known}` : '',
    misunderstood ? `可能误解：${misunderstood}` : '',
    angles ? `判断入口：${angles}` : '',
    traits ? `本话题可见特点：${traits}` : '',
    relation.privateInstruction ? `私有校准：${clipForPrompt(relation.privateInstruction, 160)}` : '',
  ].filter(Boolean).join('\n')
}

function compactStage(progress: number, locale: Locale): string {
  if (locale === 'en') {
    if (progress >= 0.82) return 'late: narrow the room toward final objections, changed minds, and a conclusion the group can stand behind.'
    if (progress >= 0.5) return 'middle: respond to the strongest live tension; add a concrete condition, objection, or consequence.'
    if (progress >= 0.22) return 'early-middle: develop or challenge a live argument without restarting the topic.'
    return 'early: enter naturally from your own angle; no roll-call introduction.'
  }

  if (progress >= 0.82) return '后段：收窄到最终异议、立场变化，以及大家能承认的结论。'
  if (progress >= 0.5) return '中段：回应现场最强张力，补一个具体条件、反对或后果。'
  if (progress >= 0.22) return '前中段：推进或质疑一个正在发生的论点，不要重开话题。'
  return '开场：从自己的角度自然入场，不做点名式自我介绍。'
}

export function compileNaturalSpeechPrompt(
  agent: AgentPersona,
  historyWindow: UtteranceMessage[],
  topic?: string,
  sessionProgress = 0.3,
  locale: Locale = 'zh',
  topicBriefing?: string
): PromptPair {
  const normalizedTopic = topic || (locale === 'en' ? 'discussion' : '讨论')
  const context = optimizeTurnContext(agent, historyWindow, locale)

  const profileLines = locale === 'en'
    ? [
        `name: ${agent.name}`,
        agent.profileTitle ? `persona summary: ${clipForPrompt(agent.profileTitle, 160)}` : '',
        `background: ${clipForPrompt(agent.background, 240)}`,
        `personality: ${clipForPrompt(agent.personality, 190)}`,
        `stance: ${clipForPrompt(agent.stance, 190)}`,
        `speaking style: ${clipForPrompt(agent.speakingStyle, 180)}`,
        `knowledge: ${formatPromptList(agent.knowledgeDomains, locale, 4)}`,
        `frictions: ${formatPromptList(agent.frictionTopics, locale, 3)}`,
      ].filter(Boolean).join('\n')
    : [
        `昵称：${agent.name}`,
        agent.profileTitle ? `人设摘要：${clipForPrompt(agent.profileTitle, 160)}` : '',
        `背景：${clipForPrompt(agent.background, 240)}`,
        `性格：${clipForPrompt(agent.personality, 190)}`,
        `初始立场：${clipForPrompt(agent.stance, 190)}`,
        `说话方式：${clipForPrompt(agent.speakingStyle, 180)}`,
        `知识领域：${formatPromptList(agent.knowledgeDomains, locale, 4)}`,
        `容易摩擦的话题：${formatPromptList(agent.frictionTopics, locale, 3)}`,
      ].filter(Boolean).join('\n')

  const memory = compactMemory(agent, locale)
  const topicRelation = compactTopicRelation(agent, locale)
  const stage = compactStage(sessionProgress, locale)
  const briefing = clipForPrompt(topicBriefing, 520)

  if (locale === 'en') {
    return {
      system: `You are one synthetic user in a live research roundtable. You are not a moderator and you are not following a script.

Every visible sentence must be newly written for this exact topic, this persona, and the live conversation. Do not use reusable openings, stock self-introductions, Markdown, bullets, JSON, speaker-name prefixes, citations, source IDs, or "as a persona" language.

Speak naturally: sometimes brief, sometimes fuller, with concrete constraints, uncertainty, bias, emotion, and social pressure. Let other people's words affect you, but do not echo their wording. If your reply could be said by any participant, silently rewrite it before output.`,
      user: `Core topic: ${normalizedTopic}
${briefing ? `Shared topic context:\n${briefing}\n` : ''}
Current stage: ${stage}

Persona core:
${profileLines}

Topic fit:
${topicRelation || 'No separate topic fit. Calibrate confidence from the profile and conversation.'}

Private memory cues:
${memory || 'No extra memory cues.'}

Latest moderator focus:
${context.moderatorFocus || 'No moderator focus yet.'}

Your earlier stance in this room:
${context.speakerContinuity || 'You have not spoken yet.'}

Current room map:
${context.roomState || 'No participant positions yet.'}

Optimized live context:
${context.recentConversation || 'No one has spoken yet.'}

Now respond as ${agent.name}. Output only the spoken message. Keep it natural, specific, and non-repetitive.`,
    }
  }

  return {
    system: `你是研究圆桌里的一个 AI 合成用户。你不是主持人，也不是按脚本发言。

所有可见句子都必须为当前议题、当前人设和现场对话实时生成。不要使用可复用开头、模板式自我介绍、Markdown、列表、JSON、名字前缀、证据编号、来源引用，也不要说“作为一个人设”。

像真人一样说话：可以短，可以稍微展开；要有具体约束、不确定感、偏见、情绪和社会压力。你会受别人刚才的话影响，但不要复读对方措辞。如果这句话换成任何参与者都能说，输出前自己重写。`,
    user: `核心议题：${normalizedTopic}
${briefing ? `共同议题背景：\n${briefing}\n` : ''}
当前阶段：${stage}

画像核心：
${profileLines}

话题关系：
${topicRelation || '没有单独话题关系，请用画像和现场对话校准自信程度。'}

私有记忆线索：
${memory || '没有额外记忆线索。'}

主持人最新焦点：
${context.moderatorFocus || '主持人还没有收窄焦点。'}

你在本场前面的立场延续：
${context.speakerContinuity || '你还没有发过言。'}

当前房间态度图：
${context.roomState || '还没有形成可见态度。'}

优化后的现场上下文：
${context.recentConversation || '还没有人发言。'}

现在以${agent.name}的身份接话。只输出这个人在群聊里会直接说出口的话，具体、自然、不要复读。`,
  }
}
