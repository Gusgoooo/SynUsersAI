'use client'

import { useRouter } from 'next/navigation'
import { useSimulationStore } from '@/lib/simulation-store'
import { PersonaCard } from '@/components/persona-card'
import { Button } from '@/components/ui/button'

export default function PersonasPage() {
  const router = useRouter()
  const agents = useSimulationStore((s) => s.agents)
  const config = useSimulationStore((s) => s.config)

  if (agents.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">尚未生成人设</p>
          <Button variant="outline" onClick={() => router.push('/')}>
            返回配置
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">AI 人设预览</h1>
            <p className="text-sm text-muted-foreground mt-1">
              话题：{config.topic} · {agents.length} 位 Agent · {config.duration} min
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push('/')}>
              重新配置
            </Button>
            <Button onClick={() => router.push('/chat')}>
              开始对话
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
