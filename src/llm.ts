const API_URL = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions'
const API_KEY = process.env.LLM_API_KEY || ''
const MODEL = process.env.LLM_MODEL || 'gpt-4o-mini'

const EMBEDDING_URL = process.env.EMBEDDING_API_URL || 'https://api.openai.com/v1/embeddings'
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface CompletionOptions {
  temperature?: number
  maxTokens?: number
}

export async function chatCompletion(
  messages: ChatMessage[],
  options: CompletionOptions = {}
): Promise<string> {
  const { temperature = 0.7, maxTokens = 2048 } = options

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`LLM API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.choices[0].message.content
}

export async function chatCompletionJSON<T>(
  messages: ChatMessage[],
  options: CompletionOptions = {}
): Promise<T> {
  const raw = await chatCompletion(messages, options)
  const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/)
  const jsonStr = jsonMatch ? jsonMatch[1] : raw
  return JSON.parse(jsonStr)
}

export async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(EMBEDDING_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Embedding API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.data[0].embedding
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
