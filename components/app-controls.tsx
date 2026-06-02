'use client'

import { usePathname, useRouter } from 'next/navigation'
import { LanguageToggle } from '@/components/language-toggle'
import { ModelSettings } from '@/components/model-settings'
import { ThemeToggle } from '@/components/theme-toggle'

export function AppControls() {
  const router = useRouter()
  const pathname = usePathname()
  const hasTopNav = pathname === '/personas' || pathname === '/chat'

  if (!hasTopNav) {
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
      <div className="flex h-16 w-full items-center justify-between gap-4 px-6 sm:px-8">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="shrink-0 font-serif text-2xl font-semibold tracking-tight text-foreground"
        >
          SynUsers.AI
        </button>

        <div className="flex min-w-0 items-center gap-2">
          <ModelSettings />
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
