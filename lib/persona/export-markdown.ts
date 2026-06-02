import type { Locale } from '@/lib/locale'
import type { SimAgent, SimulationConfig } from '@/lib/simulation-store'
import { formatRoundtableDuration } from '@/lib/roundtable-duration'

function asItems(value: string | string[] | undefined): string[] {
  if (!value) return []
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean)
}

function mdValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return 'N/A'
  return String(value)
}

function tableCell(value: unknown): string {
  return mdValue(value)
    .replace(/\|/g, '\\|')
    .replace(/\n+/g, ' ')
    .trim()
}

function listBlock(items: string[]): string {
  const normalized = asItems(items).map((item) => item.trim()).filter(Boolean)
  return normalized.length ? normalized.map((item) => `- ${item}`).join('\n') : '- N/A'
}

function jsonBlock(value: unknown): string {
  return ['```json', JSON.stringify(value, null, 2), '```'].join('\n')
}

function score(value: unknown): string {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(1) : 'N/A'
}

function buildScoreTable(items: Array<{ label: string; value: unknown }>): string {
  return [
    '| 参数 | 数值 |',
    '|---|---:|',
    ...items.map((item) => `| ${tableCell(item.label)} | ${score(item.value)} |`),
  ].join('\n')
}

function buildEvidenceTable(agent: SimAgent): string {
  const evidence = agent.evidence || []
  if (evidence.length === 0) return 'N/A'

  return [
    '| ID | 来源 | 位置 | 权重 | 用途 | 引文 |',
    '|---|---|---|---:|---|---|',
    ...evidence.map((item) => [
      tableCell(item.evidenceId),
      tableCell(item.sourceName),
      tableCell(item.locator),
      score(item.weight),
      tableCell(item.reason),
      tableCell(item.quote),
    ].join(' | ')).map((row) => `| ${row} |`),
  ].join('\n')
}

function buildMemorySection(agent: SimAgent): string {
  const memory = agent.memoryProfile
  if (!memory) return 'N/A'

  return [
    '### 稳定信念 / Semantic Memory',
    listBlock(memory.semanticMemory),
    '',
    '### 复合经历 / Episodic Composite Memory',
    listBlock(memory.episodicCompositeMemory),
    '',
    '### 消费习惯 / Consumption Habits',
    listBlock(memory.consumptionHabits),
    '',
    '### 认知方式 / Cognitive Style',
    mdValue(memory.educationCognitiveStyle),
    '',
    '### 社会身份 / Social Identity',
    mdValue(memory.socialIdentity),
    '',
    '### 情绪触发点 / Emotional Triggers',
    listBlock(memory.emotionalTriggers),
    '',
    '### 语言风格 / Language Register',
    mdValue(memory.languageRegister),
    '',
    '### 决策捷径 / Decision Heuristics',
    listBlock(memory.decisionHeuristics),
  ].join('\n')
}

function buildTopicRelationSection(agent: SimAgent): string {
  const topic = agent.topicRelation
  if (!topic) return 'N/A'

  return [
    '| 字段 | 内容 |',
    '|---|---|',
    `| 议题 | ${tableCell(topic.topic)} |`,
    `| 熟悉度 | ${score(topic.familiarity)} |`,
    `| 相关度 | ${score(topic.relevance)} |`,
    `| 暴露层级 | ${tableCell(topic.exposureLevel)} |`,
    `| 研究依据 | ${tableCell(topic.researchGrounding)} |`,
    `| 关系摘要 | ${tableCell(topic.relationSummary)} |`,
    '',
    '### 大概率知道 / Likely Known Facts',
    listBlock(topic.likelyKnownFacts),
    '',
    '### 可能误解或不知道 / Likely Misunderstandings',
    listBlock(topic.likelyMisunderstandings),
    '',
    '### 判断入口 / Decision Angles',
    listBlock(topic.decisionAngles),
    '',
    '### 话题中显露的特点 / Visible Traits',
    listBlock(topic.visibleTraits),
    '',
    '### 私有发言指令 / Private Instruction',
    mdValue(topic.privateInstruction),
  ].join('\n')
}

export function buildPersonaMarkdown(agent: SimAgent, config: SimulationConfig, locale: Locale): string {
  const durationLabel = config.durationTier
    ? formatRoundtableDuration(config.durationTier, locale)
    : `${config.duration} min`

  return [
    `# ${agent.name}`,
    '',
    '## 导出信息',
    '',
    '| 字段 | 内容 |',
    '|---|---|',
    `| 导出时间 | ${new Date().toISOString()} |`,
    `| 讨论话题 | ${tableCell(config.topic)} |`,
    `| 讨论模式 | ${tableCell(config.mode)} |`,
    `| 对话时长档位 | ${tableCell(durationLabel)} |`,
    `| 模型 | ${tableCell(config.model || 'N/A')} |`,
    `| 语言 | ${tableCell(config.locale)} |`,
    '',
    '## 基础画像',
    '',
    '| 字段 | 内容 |',
    '|---|---|',
    `| ID | ${tableCell(agent.id)} |`,
    `| 昵称 | ${tableCell(agent.name)} |`,
    `| 人设标题 | ${tableCell(agent.profileTitle)} |`,
    `| 背景 | ${tableCell(agent.background)} |`,
    `| 性格 | ${tableCell(agent.personality)} |`,
    `| 初始立场 | ${tableCell(agent.stance)} |`,
    `| 说话风格 | ${tableCell(agent.speakingStyle)} |`,
    `| 参与曲线 | ${tableCell(agent.engagementCurve)} |`,
    `| 数据支撑分 | ${score(agent.dataGroundingScore)} |`,
    `| 来源模式摘要 | ${tableCell(agent.sourceSummary)} |`,
    '',
    '## 行为与语义标签',
    '',
    '### 擅长领域 / Knowledge Domains',
    listBlock(agent.knowledgeDomains),
    '',
    '### 触发词 / Trigger Keywords',
    listBlock(agent.triggerKeywords),
    '',
    '### 摩擦议题 / Friction Topics',
    listBlock(agent.frictionTopics),
    '',
    '### 标签 / Tags',
    listBlock(agent.tags),
    '',
    '## 内在记忆系统',
    '',
    buildMemorySection(agent),
    '',
    '## 当前议题关系',
    '',
    buildTopicRelationSection(agent),
    '',
    '## OCEAN 大五人格参数',
    '',
    buildScoreTable([
      { label: 'Openness / 开放性', value: agent.ocean.openness },
      { label: 'Conscientiousness / 尽责性', value: agent.ocean.conscientiousness },
      { label: 'Extraversion / 外向性', value: agent.ocean.extraversion },
      { label: 'Agreeableness / 顺和性', value: agent.ocean.agreeableness },
      { label: 'Neuroticism / 神经质', value: agent.ocean.neuroticism },
    ]),
    '',
    '## 认知偏见参数',
    '',
    buildScoreTable([
      { label: 'Novelty Resistance / 新事物怀疑', value: agent.biases.noveltyResistance },
      { label: 'Authority Deference / 权威信任', value: agent.biases.authorityDeference },
      { label: 'Loss Aversion / 损失厌恶', value: agent.biases.lossAversion },
      { label: 'Confirmation Bias / 确认偏误', value: agent.biases.confirmationBias },
      { label: 'Social Proof / 从众倾向', value: agent.biases.socialProof },
      { label: 'Anchoring / 锚定效应', value: agent.biases.anchoring },
    ]),
    '',
    '## 运行时状态',
    '',
    '| 参数 | 数值 |',
    '|---|---:|',
    `| Energy / 能量 | ${score(agent.energy)} |`,
    `| Turns Since Last Speak / 沉默轮次 | ${score(agent.turns_since_last_speak)} |`,
    `| Accumulated Dissonance / 累计认知张力 | ${score(agent.accumulated_dissonance)} |`,
    `| Previous Dissonance / 上轮张力 | ${score(agent.previous_dissonance)} |`,
    `| Emotion Intensity / 情绪强度 | ${score(agent.emotionIntensity)} |`,
    '',
    `当前情绪：${mdValue(agent.currentEmotion)}`,
    '',
    '## 来源锚点',
    '',
    buildEvidenceTable(agent),
    '',
    '## 原始参数快照',
    '',
    jsonBlock(agent),
  ].join('\n')
}

export function buildPersonaMarkdownFilename(agent: SimAgent, index: number): string {
  const label = agent.profileTitle || agent.name || `persona-${index + 1}`
  const sanitized = label
    .replace(/[\\/:*?"<>|#%{}$!`&=+@]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)

  return `${String(index + 1).padStart(2, '0')}-${sanitized || agent.id || 'persona'}.md`
}
