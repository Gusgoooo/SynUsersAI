const SHORT_ENGLISH_NAMES = [
  'Alex', 'Mia', 'Ryan', 'Emma', 'Noah', 'Lily', 'Ethan', 'Ava',
  'Leo', 'Nina', 'Owen', 'Zoe', 'Max', 'Ivy', 'Jack', 'Ella',
  'Finn', 'Maya', 'Luke', 'Ruby', 'Ben', 'Chloe', 'Sam', 'Grace',
  'Eli', 'Nora', 'Jake', 'Sofia', 'Cole', 'Aria', 'Miles', 'Tina',
]

interface NamedPersona {
  id?: string
  name?: string
  profileTitle?: string
}

function cleanName(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function isShortEnglishName(value: unknown): boolean {
  const name = cleanName(value)
  if (!name || name.length > 18) return false
  const parts = name.split(' ')
  if (parts.length > 2) return false
  return parts.every((part) => /^[A-Za-z][A-Za-z'-]{1,12}$/.test(part))
}

function pickShortName(seed: string, index: number, used: Set<string>): string {
  const start = (hashString(seed) + index * 7) % SHORT_ENGLISH_NAMES.length
  for (let offset = 0; offset < SHORT_ENGLISH_NAMES.length; offset++) {
    const name = SHORT_ENGLISH_NAMES[(start + offset) % SHORT_ENGLISH_NAMES.length]
    const key = name.toLocaleLowerCase()
    if (!used.has(key)) return name
  }
  return `${SHORT_ENGLISH_NAMES[start]}${index + 1}`
}

export function getPersonaDisplayName(persona: NamedPersona, index = 0): string {
  const name = cleanName(persona.name)
  if (isShortEnglishName(name)) return name
  return pickShortName(`${persona.id || ''}:${persona.profileTitle || name}`, index, new Set())
}

export function getPersonaProfileTitle(persona: NamedPersona): string {
  const name = cleanName(persona.name)
  const profileTitle = cleanName(persona.profileTitle)
  if (profileTitle && profileTitle !== name) return profileTitle
  if (name && !isShortEnglishName(name)) return name
  return ''
}

export function normalizePersonaDisplayNames<T extends NamedPersona>(personas: T[]): T[] {
  const used = new Set<string>()

  return personas.map((persona, index) => {
    const originalName = cleanName(persona.name)
    const existingProfileTitle = cleanName(persona.profileTitle)
    let nextName = originalName
    let profileTitle = existingProfileTitle

    const shouldReplace = !isShortEnglishName(originalName) || used.has(originalName.toLocaleLowerCase())
    if (shouldReplace) {
      nextName = pickShortName(`${persona.id || ''}:${originalName || existingProfileTitle}`, index, used)
      if (!profileTitle && originalName) profileTitle = originalName
    }

    used.add(nextName.toLocaleLowerCase())

    return {
      ...persona,
      name: nextName,
      profileTitle: profileTitle || undefined,
    }
  })
}
