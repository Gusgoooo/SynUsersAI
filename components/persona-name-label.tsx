interface PersonaNameLabelProps {
  displayName: string
  profileTitle?: string
  className?: string
}

export function PersonaNameLabel({ displayName, profileTitle, className = '' }: PersonaNameLabelProps) {
  return (
    <span className={`group relative inline-flex max-w-full items-center ${className}`}>
      <span className="truncate">{displayName}</span>
      {profileTitle && (
        <span className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden max-w-64 rounded-md border bg-popover px-2 py-1 text-[10px] font-normal leading-relaxed text-muted-foreground shadow-lg group-hover:block">
          {profileTitle}
        </span>
      )}
    </span>
  )
}
