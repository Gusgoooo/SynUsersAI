'use client'

import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useSimulationStore } from '@/lib/simulation-store'
import { Button } from '@/components/ui/button'
import { useLocaleStore } from '@/lib/locale-store'

const COPY = {
  zh: {
    empty: '暂无报告数据',
    backConfig: '返回配置',
    newSimulation: '← 新模拟',
    copyMarkdown: '复制 Markdown',
    download: '下载 .md',
  },
  en: {
    empty: 'No report data yet',
    backConfig: 'Back to setup',
    newSimulation: '← New simulation',
    copyMarkdown: 'Copy Markdown',
    download: 'Download .md',
  },
}

export default function ReportPage() {
  const router = useRouter()
  const report = useSimulationStore((s) => s.report)
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
