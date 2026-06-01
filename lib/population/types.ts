export type PopulationSourceType = 'csv' | 'excel' | 'docx' | 'text' | 'unknown'

export interface PopulationSource {
  id: string
  name: string
  type: PopulationSourceType
  size: number
  unitCount: number
}

export interface EvidenceUnit {
  id: string
  sourceId: string
  sourceName: string
  sourceType: PopulationSourceType
  locator: string
  text: string
  fields?: Record<string, string>
  embedding?: number[]
}

export interface PersonaEvidence {
  evidenceId: string
  sourceName: string
  locator: string
  quote: string
  reason: string
  weight: number
}

export interface EvidenceTheme {
  theme: string
  description: string
  evidenceIds: string[]
  prevalence: 'low' | 'medium' | 'high'
}

export interface PopulationImportSummary {
  sources: PopulationSource[]
  evidenceCount: number
  selectedEvidenceCount: number
  themes: EvidenceTheme[]
  methodNotes: string
}
