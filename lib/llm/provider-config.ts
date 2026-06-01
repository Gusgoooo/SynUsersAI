export type LLMProtocol = 'openai-compatible' | 'gemini'

export type LLMProviderPresetId =
  | 'custom'
  | 'openai'
  | 'openrouter'
  | 'zenmux'
  | 'routify'
  | 'siliconflow'
  | 'deepseek'
  | 'qwen'
  | 'moonshot'
  | 'groq'
  | 'together'
  | 'lmstudio'
  | 'ollama'

export interface LLMProviderConfig {
  enabled: boolean
  protocol: LLMProtocol
  apiKey: string
  baseUrl: string
  model: string
}

export interface LLMProviderConfigInput {
  enabled?: unknown
  protocol?: unknown
  apiKey?: unknown
  baseUrl?: unknown
  model?: unknown
}

export const DEFAULT_OPENAI_COMPATIBLE_URL = 'https://api.openai.com/v1/chat/completions'
export const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

export const DEFAULT_BYOK_CONFIG: LLMProviderConfig = {
  enabled: false,
  protocol: 'openai-compatible',
  apiKey: '',
  baseUrl: DEFAULT_OPENAI_COMPATIBLE_URL,
  model: 'gpt-4o-mini',
}

export interface LLMProviderPreset {
  id: LLMProviderPresetId
  name: string
  protocol: LLMProtocol
  baseUrl: string
  model: string
  description: string
}

export const LLM_PROVIDER_PRESETS: LLMProviderPreset[] = [
  {
    id: 'custom',
    name: 'Custom',
    protocol: 'openai-compatible',
    baseUrl: DEFAULT_OPENAI_COMPATIBLE_URL,
    model: 'gpt-4o-mini',
    description: 'Manual OpenAI-compatible or Gemini-compatible endpoint.',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    protocol: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    description: 'Official OpenAI Chat Completions endpoint.',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    protocol: 'openai-compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o-mini',
    description: 'Router for OpenAI, Anthropic, Google, Meta, Mistral, DeepSeek, Qwen, and more.',
  },
  {
    id: 'zenmux',
    name: 'ZenMux',
    protocol: 'openai-compatible',
    baseUrl: 'https://zenmux.ai/api/v1',
    model: 'gpt-4o-mini',
    description: 'Multi-protocol model router; this preset uses its OpenAI Chat Completions protocol.',
  },
  {
    id: 'routify',
    name: 'Routify',
    protocol: 'gemini',
    baseUrl: 'https://routify.alibaba-inc.com/protocol/vertex/v1beta',
    model: 'gemini-3-pro-preview',
    description: 'Routify Vertex-style route. Your local .env can still use Routify through LLM_API_URL or GEMINI_API_URL.',
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow',
    protocol: 'openai-compatible',
    baseUrl: 'https://api.siliconflow.com/v1',
    model: 'Qwen/Qwen2.5-72B-Instruct',
    description: 'OpenAI-compatible router for Qwen, DeepSeek, GLM, and open models.',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    protocol: 'openai-compatible',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    description: 'DeepSeek OpenAI-compatible API.',
  },
  {
    id: 'qwen',
    name: 'Qwen / DashScope',
    protocol: 'openai-compatible',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    description: 'Alibaba Cloud DashScope OpenAI-compatible mode.',
  },
  {
    id: 'moonshot',
    name: 'Moonshot / Kimi',
    protocol: 'openai-compatible',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    description: 'Moonshot AI OpenAI-compatible API.',
  },
  {
    id: 'groq',
    name: 'Groq',
    protocol: 'openai-compatible',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    description: 'Groq OpenAI-compatible API for fast open models.',
  },
  {
    id: 'together',
    name: 'Together AI',
    protocol: 'openai-compatible',
    baseUrl: 'https://api.together.xyz/v1',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    description: 'Together AI OpenAI-compatible endpoint.',
  },
  {
    id: 'lmstudio',
    name: 'LM Studio',
    protocol: 'openai-compatible',
    baseUrl: 'http://localhost:1234/v1',
    model: 'local-model',
    description: 'Local OpenAI-compatible server from LM Studio.',
  },
  {
    id: 'ollama',
    name: 'Ollama',
    protocol: 'openai-compatible',
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3.1',
    description: 'Ollama OpenAI-compatible local endpoint.',
  },
]

export function getProviderPreset(id: string): LLMProviderPreset {
  return LLM_PROVIDER_PRESETS.find((preset) => preset.id === id) || LLM_PROVIDER_PRESETS[0]
}

export function detectProviderName(baseUrl: string): string {
  const url = baseUrl.toLowerCase()
  if (url.includes('openrouter.ai')) return 'OpenRouter'
  if (url.includes('zenmux')) return 'ZenMux'
  if (url.includes('routify.alibaba-inc.com')) return 'Routify'
  if (url.includes('siliconflow')) return 'SiliconFlow'
  if (url.includes('deepseek')) return 'DeepSeek'
  if (url.includes('dashscope') || url.includes('aliyuncs.com/compatible-mode')) return 'Qwen / DashScope'
  if (url.includes('moonshot')) return 'Moonshot / Kimi'
  if (url.includes('groq.com')) return 'Groq'
  if (url.includes('together')) return 'Together AI'
  if (url.includes('localhost:1234')) return 'LM Studio'
  if (url.includes('localhost:11434')) return 'Ollama'
  if (url.includes('generativelanguage.googleapis.com')) return 'Google Gemini'
  if (url.includes('api.openai.com')) return 'OpenAI'
  return 'Custom'
}

export function modelProviderFromProtocol(protocol: LLMProtocol): 'gpt-5.4' | 'gemini' {
  return protocol === 'gemini' ? 'gemini' : 'gpt-5.4'
}

export function normalizeProtocol(value: unknown): LLMProtocol {
  return value === 'gemini' ? 'gemini' : 'openai-compatible'
}

export function normalizeProviderConfig(input: LLMProviderConfigInput | null | undefined): LLMProviderConfig | undefined {
  if (!input || typeof input !== 'object') return undefined
  const protocol = normalizeProtocol(input.protocol)
  const baseUrl = String(input.baseUrl || (protocol === 'gemini' ? DEFAULT_GEMINI_BASE_URL : DEFAULT_OPENAI_COMPATIBLE_URL)).trim()
  const apiKey = String(input.apiKey || '').trim()
  const model = String(input.model || '').trim()
  const enabled = Boolean(input.enabled)

  if (!enabled) return undefined
  if (!apiKey || !model || !baseUrl) return undefined

  return { enabled, protocol, apiKey, baseUrl, model }
}

export function isUsableProviderConfig(input: LLMProviderConfigInput | null | undefined): boolean {
  return Boolean(normalizeProviderConfig(input))
}

export function redactProviderConfig(config: LLMProviderConfigInput | null | undefined) {
  const normalized = normalizeProviderConfig(config)
  if (!normalized) return undefined
  return {
    ...normalized,
    apiKey: normalized.apiKey ? `${normalized.apiKey.slice(0, 4)}...${normalized.apiKey.slice(-4)}` : '',
  }
}

export function getOpenAIChatCompletionsUrl(baseUrl: string): string {
  const clean = baseUrl.trim().replace(/\/+$/, '')
  if (clean.endsWith('/chat/completions')) return clean
  if (clean.endsWith('/v1')) return `${clean}/chat/completions`
  if (clean.endsWith('/api/v1')) return `${clean}/chat/completions`
  return clean
}

export function getGeminiModelUrl(baseUrl: string, model: string, streaming = false): string {
  const clean = baseUrl.trim().replace(/\/+$/, '')
  const action = streaming ? 'streamGenerateContent?alt=sse' : 'generateContent'
  if (clean.includes('/models/')) return `${clean}:${action}`
  return `${clean}/models/${model}:${action}`
}
