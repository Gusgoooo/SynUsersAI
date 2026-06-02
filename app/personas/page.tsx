'use client'

import { useRouter } from 'next/navigation'
import { useSimulationStore } from '@/lib/simulation-store'
import { PersonaCard } from '@/components/persona-card'
import { Button } from '@/components/ui/button'
import { useLocaleStore } from '@/lib/locale-store'
import { formatRoundtableDuration } from '@/lib/roundtable-duration'
import { buildPersonaMarkdown, buildPersonaMarkdownFilename } from '@/lib/persona/export-markdown'

const COPY = {
  zh: {
    empty: '尚未生成人设',
    back: '返回配置',
    title: 'AI 人设预览',
    topic: '话题',
    agents: '位 Agent',
    reconfigure: '重新配置',
    exportPersonas: '导出人设 MD',
    start: '开始对话',
  },
  en: {
    empty: 'No personas generated yet',
    back: 'Back to setup',
    title: 'AI Persona Preview',
    topic: 'Topic',
    agents: 'agents',
    reconfigure: 'Reconfigure',
    exportPersonas: 'Export persona MD',
    start: 'Start chat',
  },
}

export default function PersonasPage() {
  const router = useRouter()
  const agents = useSimulationStore((s) => s.agents)
  const config = useSimulationStore((s) => s.config)
  const locale = useLocaleStore((s) => s.locale)
  const copy = COPY[locale]
  const durationLabel = config.durationTier
    ? formatRoundtableDuration(config.durationTier, locale)
    : `${config.duration} min`

  function handleExportPersonas() {
    agents.forEach((agent, index) => {
      window.setTimeout(() => {
        const markdown = buildPersonaMarkdown(agent, config, locale)
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = buildPersonaMarkdownFilename(agent, index)
        a.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      }, index * 150)
    })
  }

  if (agents.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">{copy.empty}</p>
          <Button variant="outline" onClick={() => router.push('/')}>
            {copy.back}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-6 pb-6 pt-24">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">{copy.title}</h1>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {copy.topic}: {config.topic} · {agents.length} {copy.agents} · {durationLabel}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:pt-0.5">
            <Button variant="outline" onClick={() => router.push('/')}>
              {copy.reconfigure}
            </Button>
            <Button variant="outline" onClick={handleExportPersonas} disabled={agents.length === 0}>
              {copy.exportPersonas}
            </Button>
            <Button onClick={() => router.push('/chat')} disabled={agents.length === 0}>
              {copy.start}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {agents.map((agent) => (
            <PersonaCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </div>
  )
}
