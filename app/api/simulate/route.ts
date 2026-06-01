import { calculateAgentImpulse } from '@/lib/engine/speaker-selector'
import { processTurnAndReflect } from '@/lib/engine/state-updater'
import { compileSingleHopPrompt } from '@/lib/engine/context-builder'
import { generateMarkdownReport } from '@/lib/engine/reporter'
import { chatCompletion, chatCompletionJSON, getEmbedding, type ModelProvider } from '@/lib/engine/llm'
import { buildModeratorSystemPrompt, getModeratorDirective } from '@/lib/engine/prompts'
import type { ActivatedMemory, AgentPersona, PersonaEvidence, UtteranceMessage, SimulationSnapshot } from '@/lib/engine/types'
import { languageInstruction, moderatorName, normalizeLocale, type Locale } from '@/lib/locale'
import { evidenceFromActivatedMemories, fallbackActivatedMemories, normalizeActivatedMemories, retrieveEvidenceForTurn } from '@/lib/population/retrieval'
import { createRuntimePersonaState, normalizeBiases, normalizeOcean } from '@/lib/persona/defaults'
import { parseRequestProviderConfig } from '@/lib/llm/request-config'
import type { LLMProviderConfigInput } from '@/lib/llm/provider-config'
import { buildOpeningText, formatTopicBriefing, generateTopicPreparation } from '@/lib/research/topic-preparation'

export const runtime = 'nodejs'
export const maxDuration = 300

function computeConvergence(
  personas: AgentPersona[],
  history: UtteranceMessage[]
): { min: number; max: number; median: number; clusters: number } {
  // Get each agent's most recent message embedding
  const agentLastEmbeddings: number[][] = []
  for (const p of personas) {
    const lastMsg = [...history].reverse().find(m => m.speakerId === p.id && m.embedding)
    if (lastMsg?.embedding) agentLastEmbeddings.push(lastMsg.embedding)
  }

  if (agentLastEmbeddings.length < 2) return { min: 0, max: 0, median: 0, clusters: 1 }

  const dim = agentLastEmbeddings[0].length

  function cosine(a: number[], b: number[]): number {
    let dot = 0, nA = 0, nB = 0
    for (let k = 0; k < dim; k++) {
      dot += a[k] * b[k]
      nA += a[k] * a[k]
      nB += b[k] * b[k]
    }
    const denom = Math.sqrt(nA) * Math.sqrt(nB)
    return denom > 0 ? dot / denom : 0
  }

  // Pairwise cosine similarities
  const sims: number[] = []
  for (let i = 0; i < agentLastEmbeddings.length; i++) {
    for (let j = i + 1; j < agentLastEmbeddings.length; j++) {
      sims.push(cosine(agentLastEmbeddings[i], agentLastEmbeddings[j]))
    }
  }
  sims.sort((a, b) => a - b)

  const minSim = sims[0]
  const maxSim = sims[sims.length - 1]
  const medianSim = sims[Math.floor(sims.length / 2)]

  // Cluster count
  const threshold = medianSim
  const visited = new Set<number>()
  let clusters = 0
  for (let i = 0; i < agentLastEmbeddings.length; i++) {
    if (visited.has(i)) continue
    visited.add(i)
    clusters++
    for (let j = i + 1; j < agentLastEmbeddings.length; j++) {
      if (visited.has(j)) continue
      if (cosine(agentLastEmbeddings[i], agentLastEmbeddings[j]) > threshold) visited.add(j)
    }
  }

  return { min: minSim, max: maxSim, median: medianSim, clusters }
}

async function generateModeratorIntervention(
  topic: string,
  topicBriefing: string,
  history: UtteranceMessage[],
  agents: AgentPersona[],
  sessionProgress: number,
  model: ModelProvider,
  locale: Locale,
  providerConfig?: LLMProviderConfigInput
): Promise<string> {
  const agentNames = agents.map(a => a.name)
  const { directive } = getModeratorDirective(history, agents, sessionProgress, locale)
  const recentContext = history.slice(-8).map(m => locale === 'en' ? `${m.speakerName}: ${m.text}` : `${m.speakerName}：${m.text}`).join('\n')
  const systemPrompt = buildModeratorSystemPrompt(topic, agentNames, locale)

  const userPrompt = locale === 'en'
    ? `Core topic reminder: "${topic}"

Shared topic briefing:
${topicBriefing}

Recent conversation:
${recentContext}

(Your intention: ${directive}.)
Use one natural English follow-up question or challenge. Do not list names, do not restate the topic, and do not say "back to the topic". Output one sentence only.`
    : `核心议题提醒：「${topic}」

共同议题背景：
${topicBriefing}

最近对话：
${recentContext}

（你的意图：${directive}。）
用一句自然的追问或质疑来实现意图。不要列名字、不要念题目、不要说"回到话题"。直接输出一句话。`

  return await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.8, maxTokens: 150, model, providerConfig }
  )
}

function splitIntoSegments(text: string): string[] {
  // First split by explicit newlines
  const rawSegments = text.split(/\n+/).map(s => s.trim()).filter(s => s.length > 0)

  const result: string[] = []
  for (const seg of rawSegments) {
    if (seg.length <= 140) {
      result.push(seg)
    } else {
      // Force split long segments at sentence boundaries
      const sentences = seg.split(/(?<=[。！？；…」.!?;])/).filter(s => s.trim())
      let buffer = ''
      for (const sentence of sentences) {
        if (buffer.length + sentence.length > 140 && buffer.length > 0) {
          result.push(buffer.trim())
          buffer = sentence
        } else {
          buffer += sentence
        }
      }
      if (buffer.trim()) result.push(buffer.trim())
    }
  }
  return result.length > 0 ? result : [text]
}

const SIMULATION_PROGRESS_COPY = {
  zh: {
    'normalize-personas': {
      label: '正在标准化 AI 用户画像',
      detail: '补齐能量、情绪、OCEAN 和偏差参数，保证画像能驱动后续发言。',
    },
    'embed-beliefs': {
      label: '正在嵌入初始立场',
      detail: '把每个虚拟用户的立场转成向量，用于判断观点差异和发言冲动。',
    },
    'prepare-topic': {
      label: '正在解析人设与话题关系',
      detail: '生成熟悉度、相关度、可能误解和这个话题下会显露的个人特点。',
    },
    opening: {
      label: '主持人正在组织开场',
      detail: '根据话题背景铺垫讨论语境，再邀请 AI 用户进入自我介绍。',
    },
    introductions: {
      label: 'AI 用户正在自我介绍',
      detail: '每个人会从自己的画像、立场和话题熟悉度出发，而不是统一套话。',
    },
    'speaker-selection': {
      label: '正在计算下一位发言者',
      detail: '综合观点差异、沉默时间、能量和最近消息，选择最有发言冲动的人。',
    },
    'memory-retrieval': {
      label: '正在激活相关记忆',
      detail: '从人设记忆、来源锚点和话题关系中挑选本轮最可能影响判断的线索。',
    },
    'response-generation': {
      label: '正在生成自然发言',
      detail: '让画像决定句长、词汇、语气、犹豫程度和判断标准。',
    },
    'state-update': {
      label: '正在更新群体状态',
      detail: '记录观点收敛、认知冲突、情绪变化和下一轮发言倾向。',
    },
    report: {
      label: '正在整理模拟报告',
      detail: '汇总对话历史、分歧、收敛和可行动洞察。',
    },
    complete: {
      label: '模拟已完成',
      detail: '报告已生成，正在收尾。',
    },
  },
  en: {
    'normalize-personas': {
      label: 'Normalizing AI user profiles',
      detail: 'Completing energy, emotion, OCEAN, and bias fields so the profiles can drive conversation.',
    },
    'embed-beliefs': {
      label: 'Embedding initial stances',
      detail: 'Turning each virtual user stance into a vector for disagreement and speaking impulse.',
    },
    'prepare-topic': {
      label: 'Mapping persona-topic relationships',
      detail: 'Generating familiarity, relevance, likely misunderstandings, and topic-specific visible traits.',
    },
    opening: {
      label: 'Moderator is preparing the opening',
      detail: 'Setting the topic context before inviting AI users to introduce themselves.',
    },
    introductions: {
      label: 'AI users are introducing themselves',
      detail: 'Each user starts from their own profile, stance, and topic familiarity rather than a generic script.',
    },
    'speaker-selection': {
      label: 'Calculating the next speaker',
      detail: 'Combining disagreement, silence time, energy, and the latest message to select speaking impulse.',
    },
    'memory-retrieval': {
      label: 'Activating relevant memory',
      detail: 'Selecting the persona memories, source anchors, and topic-fit cues most likely to shape this turn.',
    },
    'response-generation': {
      label: 'Generating natural speech',
      detail: 'Letting the profile control sentence length, vocabulary, tone, hesitation, and decision criteria.',
    },
    'state-update': {
      label: 'Updating group state',
      detail: 'Tracking convergence, cognitive conflict, emotional changes, and next-turn tendencies.',
    },
    report: {
      label: 'Preparing the simulation report',
      detail: 'Summarizing the conversation, disagreements, convergence, and actionable insights.',
    },
    complete: {
      label: 'Simulation complete',
      detail: 'The report is ready and the stream is closing.',
    },
  },
} as const

type SimulationProgressStep = keyof typeof SIMULATION_PROGRESS_COPY.zh

function buildSimulationProgress(locale: Locale, step: SimulationProgressStep, detail?: string) {
  const item = SIMULATION_PROGRESS_COPY[locale]?.[step] || SIMULATION_PROGRESS_COPY.zh[step]
  return {
    step,
    label: item.label,
    detail: detail || item.detail,
    timestamp: Date.now(),
  }
}

export async function POST(req: Request) {
  const { topic, topicContext = '', duration, personas: inputPersonas, model = 'gpt-5.4', language = 'zh', llmConfig } = await req.json()
  const locale = normalizeLocale(language)
  const providerConfig = parseRequestProviderConfig(llmConfig)
  const durationMs = (duration || 10) * 60 * 1000
  const moderatorInterval = 5
  const hostName = moderatorName(locale)

  const encoder = new TextEncoder()
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  async function send(event: string, data: unknown) {
    await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
  }

  async function sendProgress(step: SimulationProgressStep, detail?: string) {
    await send('progress', buildSimulationProgress(locale, step, detail))
  }

  // Stream text character by character
  async function streamText(
    id: string,
    speakerId: string,
    speakerName: string,
    text: string,
    evidence?: PersonaEvidence[],
    usedEvidenceIds?: string[],
    activatedMemories?: ActivatedMemory[]
  ) {
    await send('stream-start', { id, speakerId, speakerName, evidence, usedEvidenceIds, activatedMemories })
    const chunkSize = 2
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize)
      await send('stream-chunk', { id, chunk })
      await new Promise(r => setTimeout(r, 30 + Math.random() * 40))
    }
    await send('stream-end', { id, speakerId, speakerName, text, evidence, usedEvidenceIds, activatedMemories })
  }

  ;(async () => {
    try {
      await sendProgress('normalize-personas')
      const personas: AgentPersona[] = inputPersonas.map((p: Record<string, unknown>) => ({
        ...p,
        ...createRuntimePersonaState({
          currentEmotion: p.currentEmotion,
          emotionIntensity: p.emotionIntensity,
        }),
        energy: Number(p.energy) || 100,
        turns_since_last_speak: Number(p.turns_since_last_speak) || 0,
        accumulated_dissonance: Number(p.accumulated_dissonance) || 0,
        ocean: normalizeOcean(p.ocean),
        biases: normalizeBiases(p.biases),
      }))

      await sendProgress('embed-beliefs')
      for (const p of personas) {
        p.current_belief_vector = await getEmbedding(p.stance as string)
      }

      await sendProgress('prepare-topic')
      const topicPreparation = await generateTopicPreparation(topic, personas, model as ModelProvider, locale, providerConfig, String(topicContext || ''))
      for (const persona of personas) {
        persona.topicRelation = persona.topicRelation || topicPreparation.personaRelations[persona.id]
      }
      const topicBriefingText = formatTopicBriefing(topicPreparation.briefing, locale)

      // Opening: moderator sets context before asking for introductions.
      await sendProgress('opening')
      const ignitionText = buildOpeningText(topic, topicPreparation.briefing, locale)
      const ignitionId = crypto.randomUUID()
      await streamText(ignitionId, 'system', hostName, ignitionText)

      const ignitionMessage: UtteranceMessage = {
        id: ignitionId,
        speakerId: 'system',
        speakerName: hostName,
        text: ignitionText,
        inner_thoughts: '',
        embedding: await getEmbedding(ignitionText),
        isHumanPerturbation: true,
      }

      const history: UtteranceMessage[] = [ignitionMessage]
      const dissonanceLog: Record<string, number[]> = {}
      for (const p of personas) dissonanceLog[p.id] = []

      await send('state-update', {
        agents: personas.map((p) => ({
          id: p.id,
          energy: p.energy,
          accumulated_dissonance: p.accumulated_dissonance,
          stance: p.stance,
          turns_since_last_speak: p.turns_since_last_speak,
          currentEmotion: p.currentEmotion,
          emotionIntensity: p.emotionIntensity,
          topicRelation: p.topicRelation,
        })),
      })

      // Introduction round
      await sendProgress('introductions')
      for (const persona of personas) {
        await sendProgress(
          'introductions',
          locale === 'en'
            ? `${persona.name} is calibrating an introduction from their profile and topic familiarity.`
            : `${persona.name} 正在根据画像和话题熟悉度校准自我介绍。`
        )
        const introPrompt = locale === 'en'
          ? `You are ${persona.name}. The moderator has just set up this topic:
${topicBriefingText}

Introduce yourself in 1-2 natural English sentences. Connect your situation to the topic, name the first criterion you would care about, and avoid a generic biography. Do not say you are a persona or that you represent data. ${languageInstruction(locale)} Return raw JSON only: {"text":"your introduction","inner_thoughts":"one short private thought"}`
          : `你是${persona.name}。主持人刚给出了这段议题背景：
${topicBriefingText}

用1-2句自然口语自我介绍。必须把你的处境和这个议题连起来，说出你第一反应里会看重的一个判断标准，不要泛泛介绍职业。不要说自己是人设，也不要说你代表数据。直接输出JSON：{"text":"你的自我介绍","inner_thoughts":"内心想法"}`
        let intro: { text: string; inner_thoughts: string }
        try {
          intro = await chatCompletionJSON<{ text: string; inner_thoughts: string }>(
            [
              {
                role: 'system',
                content: locale === 'en'
                  ? `You are ${persona.name}. Background: ${persona.background}. Personality: ${persona.personality}. Speaking style signal: ${persona.speakingStyle}. Treat speaking style as subtle rhythm/register, not catchphrases or repeated signature words. Internal memory: ${persona.memoryProfile ? JSON.stringify(persona.memoryProfile) : ''}. Topic briefing: ${topicBriefingText}. Your relation to this topic: ${persona.topicRelation ? JSON.stringify(persona.topicRelation) : 'none'}. Calibrate your confidence by familiarity and relevance. Keep it conversational, under 80 words. Do not cite data or sources. ${languageInstruction(locale)}`
                  : `你是${persona.name}。背景：${persona.background}。性格：${persona.personality}。说话风格信号：${persona.speakingStyle}。把说话风格当作细微的节奏和语域，不要变成口头禅或反复出现的标志词。内在记忆：${persona.memoryProfile ? JSON.stringify(persona.memoryProfile) : ''}。议题背景：${topicBriefingText}。你与这个议题的关系：${persona.topicRelation ? JSON.stringify(persona.topicRelation) : '无'}。根据熟悉度和相关度校准自信程度。口语化，不超过90字。不要引用数据或来源。`,
              },
              { role: 'user', content: introPrompt },
            ],
            { temperature: 0.8, maxTokens: 150, model: model as ModelProvider, providerConfig }
          )
        } catch (e) {
          console.error(`[${persona.name}] Intro LLM failed:`, e)
          intro = locale === 'en'
            ? { text: `I'm ${persona.name}, representing ${persona.background.slice(0, 80)}.`, inner_thoughts: '' }
            : { text: `我是${persona.name}，${persona.background.slice(0, 50)}。`, inner_thoughts: '' }
        }

        const introId = crypto.randomUUID()
        await streamText(introId, persona.id, persona.name, intro.text)

        const introMsg: UtteranceMessage = {
          id: introId,
          speakerId: persona.id,
          speakerName: persona.name,
          text: intro.text,
          inner_thoughts: intro.inner_thoughts,
          embedding: await getEmbedding(intro.text),
        }
        history.push(introMsg)
      }

      // Main discussion loop — time-based
      const startTime = Date.now()
      let lastMessage = history[history.length - 1]
      let turnCount = 0

      while (Date.now() - startTime < durationMs) {
        turnCount++
        const sessionProgress = Math.min(1, (Date.now() - startTime) / durationMs)

        // Moderator intervention every N turns
        if (turnCount > 0 && turnCount % moderatorInterval === 0) {
          try {
            const modText = await generateModeratorIntervention(
              topic, topicBriefingText, history, personas, sessionProgress, model as ModelProvider, locale, providerConfig
            )
            const modId = crypto.randomUUID()
            await streamText(modId, 'system', hostName, modText.trim())

            const modMessage: UtteranceMessage = {
              id: modId,
              speakerId: 'system',
              speakerName: hostName,
              text: modText.trim(),
              inner_thoughts: '',
              embedding: await getEmbedding(modText),
              isHumanPerturbation: true,
            }
            history.push(modMessage)
            lastMessage = modMessage
          } catch (e) {
            console.error('[Moderator] LLM failed:', e)
          }
        }

        // Select 1-2 speakers per turn
        await sendProgress(
          'speaker-selection',
          locale === 'en'
            ? `Round ${turnCount}: calculating speaking impulse from disagreement, silence, and energy.`
            : `第 ${turnCount} 轮：根据观点差异、沉默时间和能量计算发言冲动。`
        )
        const impulseScores = personas
          .filter((p) => p.id !== lastMessage.speakerId)
          .map((p) => ({
            id: p.id,
            name: p.name,
            impulse: calculateAgentImpulse(p, lastMessage, history.length),
            cd: lastMessage.embedding && p.current_belief_vector.length > 0
              ? 1.0 - Math.abs(
                  p.current_belief_vector.reduce((sum, v, i) => sum + v * (lastMessage.embedding![i] ?? 0), 0) /
                  (Math.sqrt(p.current_belief_vector.reduce((s, v) => s + v * v, 0)) *
                    Math.sqrt((lastMessage.embedding ?? []).reduce((s, v) => s + v * v, 0)) || 1)
                )
              : 0,
            ri: Math.exp(-0.3 * p.turns_since_last_speak),
          }))
          .sort((a, b) => b.impulse - a.impulse)

        await send('impulse-scores', { scores: impulseScores })

        // Pick 1-2 speakers
        const speakerCount = Math.random() < 0.3 ? 2 : 1
        const selectedSpeakers: AgentPersona[] = []
        for (let s = 0; s < speakerCount && s < impulseScores.length; s++) {
          const p = personas.find(a => a.id === impulseScores[s].id)
          if (p && p.energy > 0) selectedSpeakers.push(p)
        }

        if (selectedSpeakers.length === 0) break

        // Generate responses — start next generation while streaming current
        for (let si = 0; si < selectedSpeakers.length; si++) {
          if (Date.now() - startTime >= durationMs) break

          const speaker = selectedSpeakers[si]
          const progress = Math.min(1, (Date.now() - startTime) / durationMs)
          await sendProgress(
            'memory-retrieval',
            locale === 'en'
              ? `Activating memories and source cues for ${speaker.name}.`
              : `正在为 ${speaker.name} 激活相关记忆和来源线索。`
          )
          const availableEvidence = await retrieveEvidenceForTurn(speaker, topic, history)
          const speakerForTurn = { ...speaker, evidence: availableEvidence }
          const { system, user } = compileSingleHopPrompt(speakerForTurn, history, '', topic, progress, locale, topicBriefingText)

          let response: { text: string; inner_thoughts: string; usedEvidenceIds?: string[]; activatedMemories?: ActivatedMemory[] }
          try {
            await sendProgress(
              'response-generation',
              locale === 'en'
                ? `${speaker.name} is generating a reply shaped by profile, memory, and topic fit.`
                : `${speaker.name} 正在根据画像、记忆和话题关系生成自然发言。`
            )
            response = await chatCompletionJSON<{ text: string; inner_thoughts: string; usedEvidenceIds?: string[]; activatedMemories?: ActivatedMemory[] }>(
              [
                { role: 'system', content: system },
                { role: 'user', content: user },
              ],
              { temperature: 0.8, maxTokens: 400, model: model as ModelProvider, providerConfig }
            )
          } catch (e) {
            console.error(`[${speaker.name}] LLM failed, skipping:`, e)
            continue
          }

          if (!response.text || response.text.trim().length < 2) continue

          // Split into segments and stream each one
          const segments = splitIntoSegments(response.text)
          const normalizedMemories = normalizeActivatedMemories(response.activatedMemories, availableEvidence)
          const activatedMemories = normalizedMemories.length
            ? normalizedMemories
            : fallbackActivatedMemories(speaker, availableEvidence, locale)
          const usedEvidence = evidenceFromActivatedMemories(availableEvidence, activatedMemories)
          const usedEvidenceIds = usedEvidence.map((item) => item.evidenceId)

          for (const segment of segments) {
            const utteranceId = crypto.randomUUID()
            await streamText(utteranceId, speaker.id, speaker.name, segment, usedEvidence, usedEvidenceIds, activatedMemories)

            const utterance: UtteranceMessage = {
              id: utteranceId,
              speakerId: speaker.id,
              speakerName: speaker.name,
              text: segment,
              inner_thoughts: segments.indexOf(segment) === 0 ? response.inner_thoughts : '',
              usedEvidenceIds,
              evidence: usedEvidence,
              activatedMemories,
              embedding: await getEmbedding(segment),
            }
            history.push(utterance)
            lastMessage = utterance
          }

          // State update after each speaker
          const preStates = new Map(personas.map((p) => [p.id, { acc: p.accumulated_dissonance, prev: p.previous_dissonance }]))

          try {
            await sendProgress('state-update')
            await processTurnAndReflect(personas, lastMessage, history)
          } catch (e) {
            console.error('[State Update] Error:', e)
          }

          for (const p of personas) {
            const pre = preStates.get(p.id)!
            const spike = p.previous_dissonance - pre.prev
            if (spike >= 0.5) {
              await send('cognitive-event', { type: 'shock', agentName: p.name, value: spike, round: turnCount })
            } else if (p.accumulated_dissonance >= 3.0) {
              await send('cognitive-event', { type: 'overload', agentName: p.name, value: p.accumulated_dissonance, round: turnCount })
              p.accumulated_dissonance = 0
            }
            dissonanceLog[p.id].push(p.previous_dissonance)
          }

          await send('state-update', {
            agents: personas.map((p) => ({
              id: p.id,
              energy: p.energy,
              accumulated_dissonance: p.accumulated_dissonance,
              stance: p.stance,
              turns_since_last_speak: p.turns_since_last_speak,
              currentEmotion: p.currentEmotion,
              emotionIntensity: p.emotionIntensity,
            })),
          })

          // Emit opinion convergence metrics (based on latest utterance similarity)
          const conv = computeConvergence(personas, history)
          await send('convergence', { turn: turnCount, min: conv.min, max: conv.max, median: conv.median, clusters: conv.clusters })
        }
      }

      // Generate report
      await sendProgress('report')
      const snapshot: SimulationSnapshot = {
        timestamp: Date.now(),
        history,
        trackedDissonanceLog: dissonanceLog,
      }

      const report = generateMarkdownReport(snapshot, personas, locale)
      await send('report', { markdown: report })
      await sendProgress('complete')
      await send('done', {})
    } catch (err) {
      await send('error', { message: String(err) })
    } finally {
      await writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
