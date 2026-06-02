import {
  detectProviderName,
  modelProviderFromProtocol,
  type LLMProtocol,
} from '@/lib/llm/provider-config'

export const runtime = 'nodejs'

function inferEnvProtocol(): LLMProtocol {
  const llmUrl = process.env.LLM_API_URL || ''
  const hasExplicitGeminiEnv = Boolean(process.env.GEMINI_API_KEY || process.env.GEMINI_API_URL || process.env.GEMINI_MODEL)

  if (llmUrl.includes('routify.alibaba-inc.com/protocol/vertex')) return 'gemini'
  if (hasExplicitGeminiEnv && !process.env.LLM_API_URL) return 'gemini'
  return 'openai-compatible'
}

export async function GET() {
  const protocol = inferEnvProtocol()
  const baseUrl = protocol === 'gemini'
    ? process.env.GEMINI_API_URL || process.env.LLM_API_URL || 'https://routify.alibaba-inc.com/protocol/vertex/v1beta'
    : process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions'
  const model = protocol === 'gemini'
    ? process.env.GEMINI_MODEL || process.env.LLM_MODEL || 'gemini-1.5-pro'
    : process.env.LLM_MODEL || 'gpt-5.5'
  const hasApiKey = protocol === 'gemini'
    ? Boolean(process.env.GEMINI_API_KEY || process.env.LLM_API_KEY)
    : Boolean(process.env.LLM_API_KEY)

  return Response.json({
    source: '.env',
    configured: Boolean(hasApiKey && baseUrl && model),
    protocol,
    providerName: detectProviderName(baseUrl),
    model,
    baseUrl,
    modelProvider: modelProviderFromProtocol(protocol),
  })
}
