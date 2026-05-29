'use client'

import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useSimulationStore } from '@/lib/simulation-store'
import { Button } from '@/components/ui/button'

export default function ReportPage() {
  const router = useRouter()
  const report = useSimulationStore((s) => s.report)

  if (!report) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">暂无报告数据</p>
          <Button variant="outline" onClick={() => router.push('/')}>
            返回配置
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
            ← 新模拟
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              复制 Markdown
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              下载 .md
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
