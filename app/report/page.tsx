'use client'

import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useSimulationStore, type SimAgent, type SimMessage, type SimulationConfig } from '@/lib/simulation-store'
import { Button } from '@/components/ui/button'
import { useLocaleStore } from '@/lib/locale-store'
import { formatRoundtableDuration } from '@/lib/roundtable-duration'

const COPY = {
  zh: {
    empty: '暂无报告数据',
    backConfig: '返回配置',
    newSimulation: '← 新模拟',
    copyMarkdown: '复制 Markdown',
    download: '下载 .md',
    downloadTranscript: '下载对话历史',
  },
  en: {
    empty: 'No report data yet',
    backConfig: 'Back to setup',
    newSimulation: '← New simulation',
    copyMarkdown: 'Copy Markdown',
    download: 'Download .md',
    downloadTranscript: 'Download transcript',
  },
}

function truncate(text: string, max = 500): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function buildTranscriptMarkdown(
  messages: SimMessage[],
  agents: SimAgent[],
  config: SimulationConfig,
  locale: 'zh' | 'en'
): string {
  const lines: string[] = []
  const durationLabel = config.durationTier
    ? formatRoundtableDuration(config.durationTier, locale)
    : `${config.duration} min`
  const title = locale === 'en' ? 'SynUsers.AI Conversation Transcript' : 'SynUsers.AI 对话历史'
  const topicLabel = locale === 'en' ? 'Topic' : '话题'
  const durationText = locale === 'en' ? 'Duration mode' : '时长档位'
  const generated = locale === 'en' ? 'Exported at' : '导出时间'
  const participants = locale === 'en' ? 'Participants' : '参与者'
  const conversation = locale === 'en' ? 'Full Conversation' : '完整对话'
  const memories = locale === 'en' ? 'Activated memories' : '激活记忆'
  const sources = locale === 'en' ? 'Source anchors' : '来源锚点'

  lines.push(`# ${title}`)
  lines.push('')
  lines.push(`**${topicLabel}:** ${config.topic}`)
  lines.push(`**${durationText}:** ${durationLabel}`)
  lines.push(`**${generated}:** ${new Date().toISOString()}`)
  lines.push(`**${participants}:** ${agents.map((agent) => agent.profileTitle ? `${agent.name} (${agent.profileTitle})` : agent.name).join(', ')}`)
  lines.push('')
  lines.push(`## ${conversation}`)
  lines.push('')

  for (const [index, message] of messages.entries()) {
    const agent = agents.find((item) => item.id === message.speakerId)
    const speaker = agent?.profileTitle ? `${message.speakerName} (${agent.profileTitle})` : message.speakerName
    lines.push(`### ${index + 1}. ${speaker}`)
    lines.push('')
    lines.push(`_${new Date(message.timestamp).toISOString()}_`)
    lines.push('')
    lines.push(message.text)
    lines.push('')

    if (message.activatedMemories?.length) {
      lines.push(`**${memories}:**`)
      for (const memory of message.activatedMemories) {
        const ids = memory.sourceEvidenceIds?.length ? ` [${memory.sourceEvidenceIds.join(', ')}]` : ''
        lines.push(`- ${memory.label} (${memory.intensity}/100)${ids}: ${memory.influence}`)
      }
      lines.push('')
    }

    if (message.evidence?.length) {
      lines.push(`**${sources}:**`)
      for (const item of message.evidence) {
        lines.push(`- [${item.evidenceId}] ${item.sourceName} · ${item.locator}: ${truncate(item.quote, 220)}`)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

export default function ReportPage() {
  const router = useRouter()
  const report = useSimulationStore((s) => s.report)
  const messages = useSimulationStore((s) => s.messages)
  const agents = useSimulationStore((s) => s.agents)
  const config = useSimulationStore((s) => s.config)
  const locale = useLocaleStore((s) => s.locale)
  const copy = COPY[locale]

  if (!report) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">{copy.empty}</p>
          <Button variant="outline" onClick={() => router.push('/')}>
            {copy.backConfig}
          </Button>
        </div>
      </div>
    )
  }

  function handleCopy() {
    navigator.clipboard.writeText(report!)
  }

  function handleDownload() {
    const blob = new Blob([report!], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'synusersai-report.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleDownloadTranscript() {
    const markdown = buildTranscriptMarkdown(messages, agents, config, locale)
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'synusersai-conversation-history.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push('/')}>
            {copy.newSimulation}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copy.copyMarkdown}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadTranscript} disabled={messages.length === 0}>
              {copy.downloadTranscript}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              {copy.download}
            </Button>
          </div>
        </div>
        <article className="prose prose-invert max-w-none rounded-xl border p-8">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
        </article>
      </div>
    </div>
  )
}
