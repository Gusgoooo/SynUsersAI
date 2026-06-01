import type { AgentPersona } from '@/lib/engine/types'
import type { Locale } from '@/lib/locale'

export type WebSearchProvider = 'tavily' | 'brave' | 'serper'

export interface WebSearchResult {
  title: string
  url: string
  snippet: string
  provider: WebSearchProvider
  publishedDate?: string
  score?: number
}

export interface TopicWebContext {
  enabled: boolean
  provider?: WebSearchProvider
  queries: string[]
  results: WebSearchResult[]
  error?: string
}

interface WebSearchConfig {
  provider?: WebSearchProvider
  apiKey: string
  maxResults: number
  country: string
  language: string
}

function normalizeProvider(value: string | undefined): WebSearchProvider | undefined {
  const normalized = value?.trim().toLowerCase()
  if (normalized === 'tavily' || normalized === 'brave' || normalized === 'serper') return normalized
  return undefined
}

function getSearchConfig(locale: Locale): WebSearchConfig | undefined {
  const envProvider = normalizeProvider(process.env.WEB_SEARCH_PROVIDER)
  const provider =
    envProvider ||
    (process.env.TAVILY_API_KEY ? 'tavily' : undefined) ||
    (process.env.BRAVE_SEARCH_API_KEY ? 'brave' : undefined) ||
    (process.env.SERPER_API_KEY ? 'serper' : undefined)

  if (!provider) return undefined

  const apiKey =
    process.env.WEB_SEARCH_API_KEY ||
    (provider === 'tavily' ? process.env.TAVILY_API_KEY : '') ||
    (provider === 'brave' ? process.env.BRAVE_SEARCH_API_KEY : '') ||
    (provider === 'serper' ? process.env.SERPER_API_KEY : '') ||
    ''

  if (!apiKey.trim()) return undefined

  const maxResults = Number(process.env.WEB_SEARCH_MAX_RESULTS || 5)
  const country = process.env.WEB_SEARCH_COUNTRY || (locale === 'en' ? 'us' : 'cn')
  const language = process.env.WEB_SEARCH_LANGUAGE || (locale === 'en' ? 'en' : 'zh')

  return {
    provider,
    apiKey: apiKey.trim(),
    maxResults: Number.isFinite(maxResults) ? Math.min(Math.max(maxResults, 2), 10) : 5,
    country,
    language,
  }
}

function uniqueStrings(items: string[], limit: number): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    const normalized = item.trim()
    if (!normalized) continue
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(normalized)
    if (result.length >= limit) break
  }
  return result
}

function collectAudienceTerms(personas: AgentPersona[], locale: Locale): string {
  const terms = personas.flatMap((persona) => [
    ...persona.tags,
    ...persona.knowledgeDomains,
    persona.memoryProfile?.socialIdentity || '',
    persona.memoryProfile?.educationCognitiveStyle || '',
  ])
  const selected = uniqueStrings(terms, 6)
  if (selected.length === 0) return locale === 'en' ? 'target users' : '目标用户'
  return selected.join(locale === 'en' ? ', ' : ' ')
}

function buildSearchQueries(topic: string, personas: AgentPersona[], locale: Locale): string[] {
  const audienceTerms = collectAudienceTerms(personas, locale)
  if (locale === 'en') {
    return uniqueStrings([
      `${topic} user adoption barriers concerns alternatives`,
      `${topic} customer behavior pricing trust workflow risk`,
      `${topic} ${audienceTerms} needs pain points`,
    ], 3)
  }

  return uniqueStrings([
    `${topic} 用户 采用 门槛 痛点 替代方案`,
    `${topic} 消费者 行为 价格 信任 工作流 风险`,
    `${topic} ${audienceTerms} 需求 顾虑 误解`,
  ], 3)
}

function normalizeResult(result: Partial<WebSearchResult>): WebSearchResult | null {
  const title = String(result.title || '').trim()
  const url = String(result.url || '').trim()
  const snippet = String(result.snippet || '').trim()
  if (!title || !url || !snippet || !result.provider) return null
  return {
    title,
    url,
    snippet,
    provider: result.provider,
    publishedDate: result.publishedDate,
    score: result.score,
  }
}

async function searchTavily(query: string, config: WebSearchConfig): Promise<WebSearchResult[]> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      query,
      search_depth: 'basic',
      max_results: config.maxResults,
      include_answer: false,
      include_raw_content: false,
    }),
  })

  if (!res.ok) throw new Error(`Tavily search failed: ${res.status}`)
  const data = await res.json()
  const results: Record<string, unknown>[] = Array.isArray(data.results) ? data.results : []
  const normalized: Array<WebSearchResult | null> = results
    .map((item: Record<string, unknown>) => normalizeResult({
      provider: 'tavily',
      title: String(item.title || ''),
      url: String(item.url || ''),
      snippet: String(item.content || ''),
      publishedDate: typeof item.published_date === 'string' ? item.published_date : undefined,
      score: typeof item.score === 'number' ? item.score : undefined,
    }))
  return normalized
    .filter((item): item is WebSearchResult => Boolean(item))
}

async function searchBrave(query: string, config: WebSearchConfig): Promise<WebSearchResult[]> {
  const url = new URL('https://api.search.brave.com/res/v1/web/search')
  url.searchParams.set('q', query)
  url.searchParams.set('count', String(config.maxResults))
  url.searchParams.set('country', config.country)
  url.searchParams.set('search_lang', config.language)

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': config.apiKey,
    },
  })

  if (!res.ok) throw new Error(`Brave search failed: ${res.status}`)
  const data = await res.json()
  const results: Record<string, unknown>[] = Array.isArray(data.web?.results) ? data.web.results : []
  const normalized: Array<WebSearchResult | null> = results
    .map((item: Record<string, unknown>) => normalizeResult({
      provider: 'brave',
      title: String(item.title || ''),
      url: String(item.url || ''),
      snippet: String(item.description || ''),
      publishedDate: typeof item.age === 'string' ? item.age : undefined,
    }))
  return normalized
    .filter((item): item is WebSearchResult => Boolean(item))
}

async function searchSerper(query: string, config: WebSearchConfig): Promise<WebSearchResult[]> {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': config.apiKey,
    },
    body: JSON.stringify({
      q: query,
      num: config.maxResults,
      gl: config.country,
      hl: config.language,
    }),
  })

  if (!res.ok) throw new Error(`Serper search failed: ${res.status}`)
  const data = await res.json()
  const results: Record<string, unknown>[] = Array.isArray(data.organic) ? data.organic : []
  const normalized: Array<WebSearchResult | null> = results
    .map((item: Record<string, unknown>) => normalizeResult({
      provider: 'serper',
      title: String(item.title || ''),
      url: String(item.link || ''),
      snippet: String(item.snippet || ''),
    }))
  return normalized
    .filter((item): item is WebSearchResult => Boolean(item))
}

async function searchOne(query: string, config: WebSearchConfig): Promise<WebSearchResult[]> {
  if (config.provider === 'tavily') return searchTavily(query, config)
  if (config.provider === 'brave') return searchBrave(query, config)
  return searchSerper(query, config)
}

export async function searchTopicWeb(topic: string, personas: AgentPersona[], locale: Locale): Promise<TopicWebContext> {
  if (process.env.WEB_RESEARCH_ENABLED === 'false') {
    return { enabled: false, queries: [], results: [] }
  }

  const config = getSearchConfig(locale)
  const queries = buildSearchQueries(topic, personas, locale)
  if (!config) return { enabled: false, queries, results: [] }

  try {
    const batches = await Promise.all(queries.map((query) => searchOne(query, config)))
    const seen = new Set<string>()
    const results: WebSearchResult[] = []
    for (const item of batches.flat()) {
      const key = item.url.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      results.push(item)
      if (results.length >= config.maxResults * 2) break
    }

    return {
      enabled: true,
      provider: config.provider,
      queries,
      results,
    }
  } catch (e) {
    return {
      enabled: true,
      provider: config.provider,
      queries,
      results: [],
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
