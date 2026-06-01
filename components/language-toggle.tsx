'use client'

import { useEffect } from 'react'
import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocaleStore } from '@/lib/locale-store'

export function LanguageToggle() {
  const locale = useLocaleStore((s) => s.locale)
  const hydrate = useLocaleStore((s) => s.hydrate)
  const setLocale = useLocaleStore((s) => s.setLocale)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-background/80 p-0.5 backdrop-blur">
      <Button
        variant={locale === 'zh' ? 'secondary' : 'ghost'}
        size="xs"
        onClick={() => setLocale('zh')}
        className="h-7 rounded-md px-2"
        title="切换到中文版"
      >
        中文
      </Button>
      <Button
        variant={locale === 'en' ? 'secondary' : 'ghost'}
        size="xs"
        onClick={() => setLocale('en')}
        className="h-7 rounded-md px-2"
        title="Switch to English"
      >
        <Languages className="size-3" />
        EN
      </Button>
    </div>
  )
}
