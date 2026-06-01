'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LanguageToggle } from '@/components/language-toggle'
import { ModelSettings } from '@/components/model-settings'
import { ThemeToggle } from '@/components/theme-toggle'
import { useLocaleStore } from '@/lib/locale-store'
import { useSimulationStore } from '@/lib/simulation-store'

const COPY = {
  zh: {
    reconfigure: '重新配置',
    start: '开始对话',
  },
  en: {
    reconfigure: 'Reconfigure',
    start: 'Start chat',
  },
}

export function AppControls() {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocaleStore((s) => s.locale)
  const agents = useSimulationStore((s) => s.agents)
  const copy = COPY[locale]
  const isPersonasPage = pathname === '/personas'

  if (!isPersonasPage) {
    return (
      <div className="fixed right-4 top-4 z-50 flex items-center gap-2">
        <ModelSettings />
        <LanguageToggle />
        <ThemeToggle />
      </div>
    )
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="shrink-0 font-serif text-2xl font-semibold tracking-tight text-foreground"
        >
          SynUsers.AI
        </button>

        <div className="flex min-w-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/')}>
            {copy.reconfigure}
          </Button>
          <Button size="sm" onClick={() => router.push('/chat')} disabled={agents.length === 0}>
            {copy.start}
          </Button>
          <div className="mx-1 h-6 w-px bg-border/70" />
          <ModelSettings />
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
