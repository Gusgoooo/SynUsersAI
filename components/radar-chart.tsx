'use client'

interface RadarChartProps {
  data: { label: string; value: number; fullName?: string }[]
  size?: number
}

export function RadarChart({ data, size = 120 }: RadarChartProps) {
  const padding = 18
  const cx = size / 2
  const cy = size / 2
  const r = (size - padding * 2) / 2
  const n = data.length

  function getPoint(i: number, scale: number) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    return {
      x: cx + r * scale * Math.cos(angle),
      y: cy + r * scale * Math.sin(angle),
    }
  }

  const gridLevels = [0.25, 0.5, 0.75, 1.0]
  const dataPoints = data.map((d, i) => getPoint(i, d.value / 100))
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z'

  return (
    <svg width={size} height={size} className="block overflow-visible">
      {gridLevels.map((level) => {
        const points = Array.from({ length: n }, (_, i) => getPoint(i, level))
        const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z'
        return <path key={level} d={path} fill="none" stroke="currentColor" strokeOpacity={0.1} />
      })}
      {data.map((_, i) => {
        const p = getPoint(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="currentColor" strokeOpacity={0.1} />
      })}
      <path d={dataPath} fill="hsl(220, 80%, 60%)" fillOpacity={0.2} stroke="hsl(220, 80%, 60%)" strokeWidth={1.5} />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="hsl(220, 80%, 60%)" />
      ))}
      {data.map((d, i) => {
        const p = getPoint(i, 1.3)
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[9px]">
            <title>{d.fullName ?? d.label}: {d.value}</title>
            {d.label}
          </text>
        )
      })}
    </svg>
  )
}
