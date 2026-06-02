'use client'

import { useEffect, useState } from 'react'
import { KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBYOKStore } from '@/lib/byok-store'
import { useLocaleStore } from '@/lib/locale-store'
import { LLM_PROVIDER_PRESETS, type LLMProviderPresetId, type LLMProtocol } from '@/lib/llm/provider-config'

const COPY = {
  zh: {
    title: '模型服务配置',
    trigger: '模型服务配置',
    quickConfig: '页面快速填写',
    quickConfigHint: '你可以在 .env 写模型配置，也可以在这里快速填写。这里填完整后会用于当前浏览器会话；不填则使用 .env。',
    protocol: '协议',
    provider: '平台预设',
    apiKey: 'API Key',
    apiKeyPlaceholder: 'sk-...',
    baseUrl: 'Base URL',
    model: '模型名',
    modelPlaceholder: 'gpt-5.5 / deepseek-chat / qwen-plus',
    clear: '清除页面配置',
    active: '使用页面配置',
    inactive: '使用 .env 配置',
    openaiHint: 'OpenAI-compatible 支持 OpenAI、DeepSeek、OpenRouter、Qwen、SiliconFlow、Groq、LM Studio、Ollama 网关等。',
    geminiHint: 'Gemini 模式使用 Google Generative Language / Vertex-style generateContent 接口。',
    presetHint: '选择 OpenRouter、ZenMux、SiliconFlow 等平台后，会自动填充 Base URL 和示例模型名。',
  },
  en: {
    title: 'Model Provider Settings',
    trigger: 'Model Provider Settings',
    quickConfig: 'Quick page setup',
    quickConfigHint: 'You can configure the model in .env, or fill it here quickly. Complete page settings are used for this browser session; otherwise the app uses .env.',
    protocol: 'Protocol',
    provider: 'Provider preset',
    apiKey: 'API Key',
    apiKeyPlaceholder: 'sk-...',
    baseUrl: 'Base URL',
    model: 'Model',
    modelPlaceholder: 'gpt-5.5 / deepseek-chat / qwen-plus',
    clear: 'Clear page settings',
    active: 'Using page settings',
    inactive: 'Using .env settings',
    openaiHint: 'OpenAI-compatible supports OpenAI, DeepSeek, OpenRouter, Qwen, SiliconFlow, Groq, LM Studio, Ollama gateways, and more.',
    geminiHint: 'Gemini mode uses Google Generative Language / Vertex-style generateContent APIs.',
    presetHint: 'Choose OpenRouter, ZenMux, SiliconFlow, or another preset to auto-fill Base URL and an example model.',
  },
}

export function ModelSettings() {
  const locale = useLocaleStore((s) => s.locale)
  const copy = COPY[locale]
  const { config, hydrate, setConfig, setProtocol, applyPreset, clear } = useBYOKStore()
  const [open, setOpen] = useState(false)
  const [presetId, setPresetId] = useState<LLMProviderPresetId>('custom')
  const hasPageConfig = Boolean(config.apiKey.trim() && config.baseUrl.trim() && config.model.trim())

  useEffect(() => {
    hydrate()
  }, [hydrate])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs backdrop-blur transition-colors ${
          hasPageConfig
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
            : 'border-border bg-background/80 text-muted-foreground hover:text-foreground'
        }`}
        title={copy.trigger}
      >
        <KeyRound className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{hasPageConfig ? copy.active : copy.inactive}</span>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/30 px-3 py-2 space-y-0.5">
            <Label>{copy.quickConfig}</Label>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{copy.quickConfigHint}</p>
          </div>

          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>{copy.provider}</Label>
              <Select
                value={presetId}
                onValueChange={(v) => {
                  const nextPreset = v as LLMProviderPresetId
                  setPresetId(nextPreset)
                  applyPreset(nextPreset)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LLM_PROVIDER_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">{copy.presetHint}</p>
            </div>

            <div className="space-y-1.5">
              <Label>{copy.protocol}</Label>
              <Select value={config.protocol} onValueChange={(v) => setProtocol(v as LLMProtocol)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai-compatible">OpenAI-compatible</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {config.protocol === 'gemini' ? copy.geminiHint : copy.openaiHint}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>{copy.apiKey}</Label>
              <Input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ apiKey: e.target.value })}
                placeholder={copy.apiKeyPlaceholder}
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <Label>{copy.baseUrl}</Label>
              <Input
                value={config.baseUrl}
                onChange={(e) => setConfig({ baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1/chat/completions"
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <Label>{copy.model}</Label>
              <Input
                value={config.model}
                onChange={(e) => setConfig({ model: e.target.value })}
                placeholder={copy.modelPlaceholder}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={clear}>
              {copy.clear}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
