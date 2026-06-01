'use client'

import { useRouter } from 'next/navigation'
import { useSimulationStore } from '@/lib/simulation-store'
import { PersonaCard } from '@/components/persona-card'
import { Button } from '@/components/ui/button'
import { useLocaleStore } from '@/lib/locale-store'

const COPY = {
  zh: {
    empty: '尚未生成人设',
    back: '返回配置',
    title: 'AI 人设预览',
    topic: '话题',
    agents: '位 Agent',
  },
  en: {
    empty: 'No personas generated yet',
    back: 'Back to setup',
    title: 'AI Persona Preview',
    topic: 'Topic',
    agents: 'agents',
  },
}

export default function PersonasPage() {
  const router = useRouter()
  const agents = useSimulationStore((s) => s.agents)
  const config = useSimulationStore((s) => s.config)
  const locale = useLocaleStore((s) => s.locale)
  const copy = COPY[locale]

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
        <div className="mb-6">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">{copy.title}</h1>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {copy.topic}: {config.topic} · {agents.length} {copy.agents} · {config.duration} min
            </p>
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
