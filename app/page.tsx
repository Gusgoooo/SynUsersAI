'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ThemeToggle } from '@/components/theme-toggle'
import LetterGlitch from '@/components/LetterGlitch'
import { useSimulationStore } from '@/lib/simulation-store'
import { ABTestForm } from '@/components/abtest-form'

const RANDOM_CROWDS = [
  '25-35岁互联网产品经理，关注效率工具和AI',
  '大学生群体，对新技术充满好奇但预算有限',
  '35-50岁企业高管，关注ROI和团队管理',
  '自由职业者和独立开发者，依赖订阅制工具',
  '教育工作者，关注AI对教学的影响',
]

const RANDOM_TOPICS = [
  'AI工具集体涨价50%，用户该不该买单？',
  '远程办公是否正在摧毁团队创造力？',
  'AI生成的内容是否必须强制标注？',
  '初级程序员会在3年内被大模型取代吗？',
  '算法推荐应不应该给用户完全的关闭权？',
  '开源大模型最终能赢过闭源吗？',
]

export default function ConfigPage() {
  const router = useRouter()
  const { setConfig, setAgents, setStatus, reset } = useSimulationStore()
  const [crowdDescription, setCrowdDescription] = useState('')
  const [topic, setTopic] = useState('AI工具集体涨价50%，用户该不该买单？')
  const [duration, setDuration] = useState(10)
  const [agentCount, setAgentCount] = useState('4')
  const [model, setModel] = useState('gpt-5.4')
  const [activeMode, setActiveMode] = useState<'roundtable' | 'interview' | 'abtest'>('roundtable')
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [genError, setGenError] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (loading) {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((t) => t + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [loading])

  function randomizeCrowd() {
    const pick = RANDOM_CROWDS[Math.floor(Math.random() * RANDOM_CROWDS.length)]
    setCrowdDescription(pick)
  }

  function randomizeTopic() {
    const pick = RANDOM_TOPICS[Math.floor(Math.random() * RANDOM_TOPICS.length)]
    setTopic(pick)
  }

  async function handleGenerate() {
    reset()
    setGenError('')
    setConfig({ topic, mode: 'generated', duration })
    setStatus('generating')
    setLoading(true)

    try {
      const res = await fetch('/api/generate-personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          crowdDescription,
          agentCount: Number(agentCount),
          model,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`API ${res.status}: ${errText}`)
      }

      const data = await res.json()
      if (data.agents?.length > 0) {
        setAgents(data.agents)
        setStatus('previewing')
        router.push('/personas')
      } else {
        throw new Error('未返回有效角色数据')
      }
    } catch (err) {
      console.error(err)
      setGenError(String(err))
      setStatus('idle')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-8">
      <div className="absolute inset-0 z-0">
        <LetterGlitch
          glitchSpeed={50}
          centerVignette={true}
          outerVignette={false}
          smooth
          glitchColors={['#212221', '#262627', '#1a1a1b']}
        />
      </div>
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight font-serif text-foreground">SynUsers.AI</h1>
          <p className="text-xs text-muted-foreground mt-1.5">系统动力学调试</p>
        </div>

        <div className="flex justify-center">
          <div className="inline-flex rounded-xl border bg-card/80 backdrop-blur-sm p-1 gap-0.5">
            {([
              { key: 'roundtable', label: '圆桌讨论', disabled: false },
              { key: 'abtest', label: 'A/B测试', disabled: false },
              { key: 'interview', label: '用户访谈', disabled: true },
            ] as const).map(({ key, label, disabled }) => (
              <button
                key={key}
                type="button"
                onClick={() => !disabled && setActiveMode(key)}
                disabled={disabled}
                title={disabled ? '敬请期待' : undefined}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  disabled
                    ? 'text-muted-foreground/50 cursor-not-allowed'
                    : activeMode === key
                      ? 'bg-foreground text-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

      {activeMode === 'abtest' ? (
        <Card className="w-full backdrop-blur-sm bg-card/90">
          <CardContent className="pt-6">
            <ABTestForm />
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full backdrop-blur-sm bg-card/90">
          <CardContent className="pt-6 space-y-6">

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>人群描述</Label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={randomizeCrowd} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    随机
                  </button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" disabled>
                    导入人群数据
                  </Button>
                </div>
              </div>
              <Textarea
                value={crowdDescription}
                onChange={(e) => setCrowdDescription(e.target.value)}
                placeholder="描述目标用户群体的特征，例如：25-35岁的互联网产品经理，关注AI工具效率..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>讨论话题</Label>
                <button type="button" onClick={randomizeTopic} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  随机
                </button>
              </div>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="输入讨论话题..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>对话时长</Label>
                <Select value={`${duration}`} onValueChange={(v) => setDuration(Number(v))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 分钟</SelectItem>
                    <SelectItem value="10">10 分钟</SelectItem>
                    <SelectItem value="20">20 分钟</SelectItem>
                    <SelectItem value="30">30 分钟</SelectItem>
                    <SelectItem value="60">60 分钟</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>虚拟用户数量</Label>
                <Select value={agentCount} onValueChange={(v) => v && setAgentCount(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[4, 6, 8, 10, 12].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} 人</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>AI 模型</Label>
                <Select value={model} onValueChange={(v) => v && setModel(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-5.4">GPT-5.4</SelectItem>
                    <SelectItem value="gemini">Gemini 3 Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={handleGenerate} disabled={loading || !topic.trim()}>
              {loading ? '生成中...' : '生成虚拟用户'}
            </Button>

            {loading && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>正在生成 {agentCount} 个虚拟用户...</span>
                    <span className="font-mono">{elapsed}s</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground/60 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min(95, (elapsed / 40) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1 text-[10px] font-mono text-muted-foreground">
                  <p className={elapsed >= 0 ? 'text-foreground/70' : ''}>
                    → 构建 prompt...{elapsed >= 2 ? ' ✓' : ''}
                  </p>
                  {elapsed >= 2 && (
                    <p className={elapsed >= 2 ? 'text-foreground/70' : ''}>
                      → 调用 LLM 生成角色（预计 20-40s）...{elapsed >= 35 ? ' ✓' : ''}
                    </p>
                  )}
                  {elapsed >= 35 && (
                    <p className="text-foreground/70">→ 解析结果...</p>
                  )}
                  {elapsed >= 60 && (
                    <p className="text-yellow-500">⚠ 耗时较长，请继续等待或检查网络</p>
                  )}
                </div>
              </div>
            )}

            {genError && !loading && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-[11px] text-destructive font-mono">{genError}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  )
}
