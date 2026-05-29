// Dual protocol LLM client
// GPT: OpenAI protocol (chat/completions)
// Gemini: Vertex protocol (generateContent)

const GPT_URL = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions'
const GPT_KEY = process.env.LLM_API_KEY || ''
const GPT_MODEL = process.env.LLM_MODEL || 'gpt-5.4-2026-03-05'

const GEMINI_BASE = process.env.GEMINI_API_URL || 'https://routify.alibaba-inc.com/protocol/vertex/v1beta'
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY || ''
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-pro-preview'

const EMBEDDING_DIM = 128

export type ModelProvider = 'gpt-5.4' | 'gemini'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface CompletionOptions {
  temperature?: number
  maxTokens?: number
  model?: ModelProvider
}

// ========== OpenAI Protocol ==========

async function chatCompletionOpenAI(
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 150000)

  try {
    const res = await fetch(GPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GPT_KEY}`,
      },
      body: JSON.stringify({
        model: GPT_MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`GPT API error ${res.status}: ${err}`)
    }

    const data = await res.json()
    return data.choices[0].message.content
  } finally {
    clearTimeout(timeout)
  }
}

// ========== Gemini Vertex Protocol ==========

interface GeminiPart { text: string }
interface GeminiContent { role: 'user' | 'model'; parts: GeminiPart[] }

function toGeminiFormat(messages: ChatMessage[]): { contents: GeminiContent[]; systemInstruction?: { parts: GeminiPart[] } } {
  let systemInstruction: { parts: GeminiPart[] } | undefined
  const contents: GeminiContent[] = []

  for (const msg of messages) {
    if (msg.role === 'system') {
      if (!systemInstruction) {
        systemInstruction = { parts: [{ text: msg.content }] }
      } else {
        systemInstruction.parts.push({ text: msg.content })
      }
    } else {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })
    }
  }

  return { contents, systemInstruction }
}

const THINKING_OVERHEAD = 4096

async function chatCompletionGemini(
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 150000)

  const { contents, systemInstruction } = toGeminiFormat(messages)

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: Math.min(temperature, 2.0),
      maxOutputTokens: maxTokens + THINKING_OVERHEAD,
      thinkingConfig: { thinkingBudget: THINKING_OVERHEAD },
    },
  }
  if (systemInstruction) body.systemInstruction = systemInstruction

  const url = `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': `Bearer ${GEMINI_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Gemini API error ${res.status}: ${err}`)
    }

    const data = await res.json()
    const candidates = data.candidates
    if (!candidates || candidates.length === 0) {
      throw new Error('Gemini returned no candidates')
    }

    const parts = candidates[0]?.content?.parts
    if (!parts || parts.length === 0) {
      if (candidates[0]?.finishReason === 'MAX_TOKENS') {
        throw new Error('Gemini exceeded token limit (thinking used all budget)')
      }
      throw new Error('Gemini returned empty content')
    }

    // Extract text from all parts that have a text field
    return parts
      .filter((p: { text?: string }) => typeof p.text === 'string')
      .map((p: GeminiPart) => p.text)
      .join('')
  } finally {
    clearTimeout(timeout)
  }
}

// ========== Streaming ==========

export interface StreamChunk {
  type: 'thinking' | 'text' | 'done'
  content: string
}

async function* streamOpenAI(
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
): AsyncGenerator<StreamChunk> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 150000)

  try {
    const res = await fetch(GPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GPT_KEY}`,
      },
      body: JSON.stringify({
        model: GPT_MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`GPT API error ${res.status}: ${err}`)
    }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullContent = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') break

        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta
          if (!delta) continue

          if (delta.reasoning_content) {
            yield { type: 'thinking', content: delta.reasoning_content }
          } else if (delta.content) {
            fullContent += delta.content
            yield { type: 'text', content: delta.content }
          }
        } catch {}
      }
    }

    yield { type: 'done', content: fullContent }
  } finally {
    clearTimeout(timeout)
  }
}

async function* streamGemini(
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
): AsyncGenerator<StreamChunk> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 150000)

  const { contents, systemInstruction } = toGeminiFormat(messages)

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: Math.min(temperature, 2.0),
      maxOutputTokens: maxTokens + THINKING_OVERHEAD,
      thinkingConfig: { thinkingBudget: THINKING_OVERHEAD },
    },
  }
  if (systemInstruction) body.systemInstruction = systemInstruction

  const url = `${GEMINI_BASE}/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': `Bearer ${GEMINI_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Gemini stream error ${res.status}: ${err}`)
    }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullContent = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const parsed = JSON.parse(line.slice(6))
          const parts = parsed.candidates?.[0]?.content?.parts
          if (!parts) continue

          for (const part of parts) {
            if (part.thought && part.text) {
              yield { type: 'thinking', content: part.text }
            } else if (part.text) {
              fullContent += part.text
              yield { type: 'text', content: part.text }
            }
          }
        } catch {}
      }
    }

    yield { type: 'done', content: fullContent }
  } finally {
    clearTimeout(timeout)
  }
}

export function chatCompletionStream(
  messages: ChatMessage[],
  options: CompletionOptions = {}
): AsyncGenerator<StreamChunk> {
  const { temperature = 0.7, maxTokens = 2048, model = 'gpt-5.4' } = options

  if (model === 'gemini') {
    return streamGemini(messages, temperature, maxTokens)
  }
  return streamOpenAI(messages, temperature, maxTokens)
}

// ========== Unified Interface ==========

export async function chatCompletion(
  messages: ChatMessage[],
  options: CompletionOptions = {}
): Promise<string> {
  const { temperature = 0.7, maxTokens = 2048, model = 'gpt-5.4' } = options

  if (model === 'gemini') {
    return chatCompletionGemini(messages, temperature, maxTokens)
  }
  return chatCompletionOpenAI(messages, temperature, maxTokens)
}

export async function chatCompletionJSON<T>(
  messages: ChatMessage[],
  options: CompletionOptions = {}
): Promise<T> {
  const raw = await chatCompletion(messages, options)

  // Try multiple extraction strategies
  // 1. Markdown code block
  const jsonBlock = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonBlock) {
    try { return JSON.parse(jsonBlock[1]) } catch {}
  }

  // 2. Find JSON object in the response
  const jsonObjMatch = raw.match(/\{[\s\S]*\}/)
  if (jsonObjMatch) {
    try { return JSON.parse(jsonObjMatch[0]) } catch {}
  }

  // 3. Try raw string directly
  return JSON.parse(raw)
}

export async function getEmbedding(text: string): Promise<number[]> {
  return localEmbedding(text)
}

function localEmbedding(text: string): number[] {
  const vec = new Float64Array(EMBEDDING_DIM)
  const normalized = text.toLowerCase().replace(/[^\w一-鿿]/g, '')
  for (let i = 0; i < normalized.length - 2; i++) {
    const trigram = normalized.slice(i, i + 3)
    let hash = 0
    for (let j = 0; j < trigram.length; j++) {
      hash = ((hash << 5) - hash + trigram.charCodeAt(j)) | 0
    }
    const idx = Math.abs(hash) % EMBEDDING_DIM
    vec[idx] += (hash > 0 ? 1 : -1) / Math.sqrt(normalized.length)
  }
  let norm = 0
  for (let i = 0; i < EMBEDDING_DIM; i++) norm += vec[i] * vec[i]
  norm = Math.sqrt(norm)
  if (norm > 0) for (let i = 0; i < EMBEDDING_DIM; i++) vec[i] /= norm
  return Array.from(vec)
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}
