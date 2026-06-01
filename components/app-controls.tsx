'use client'

import { LanguageToggle } from '@/components/language-toggle'
import { ThemeToggle } from '@/components/theme-toggle'

export function AppControls() {
  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-2">
      <LanguageToggle />
      <ThemeToggle />
    </div>
  )
}
