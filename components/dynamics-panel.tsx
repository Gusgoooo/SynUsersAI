'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, AreaChart, Area,
} from 'recharts'
import { useSimulationStore, type ImpulseScore, type CognitiveEvent, type EngineParams, type ConvergenceSnapshot } from '@/lib/simulation-store'
import { Badge } from '@/components/ui/badge'
import { InfoTooltip } from '@/components/info-tooltip'
import { ReferenceButton, SECTION_REFERENCES } from '@/components/reference-modal'
import { Slider } from '@/components/ui/slider'
import { getPersonaDisplayName, getPersonaProfileTitle } from '@/lib/persona/names'

const AGENT_COLORS = [
  '#f97316', '#3b82f6', '#22c55e', '#a855f7',
  '#ec4899', '#14b8a6', '#eab308', '#6366f1',
  '#f43f5e', '#06b6d4', '#84cc16', '#d946ef',
]

function SectionHeader({ title, tooltip, refKey }: { title: string; tooltip: string; refKey?: string }) {
  return (
    <div className="flex items-center gap-1 mb-2">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{title}</span>
      <InfoTooltip text={tooltip} />
      {refKey && SECTION_REFERENCES[refKey] && (
        <ReferenceButton references={SECTION_REFERENCES[refKey]} />
      )}
    </div>
  )
}

function AgentRadar() {
  const agents = useSimulationStore((s) => s.agents)
  const impulseLog = useSimulationStore((s) => s.impulseLog)
  const latestImpulses = impulseLog[impulseLog.length - 1] ?? []

  const data = useMemo(() => {
    return agents.map((agent, i) => {
      const impulse = latestImpulses.find(s => s.id === agent.id || s.name === agent.name)
      const displayName = getPersonaDisplayName(agent, i)
      const profileTitle = getPersonaProfileTitle(agent)
      return {
        name: displayName,
        title: profileTitle || displayName,
        energy: agent.energy,
        dissonance: Math.min(100, (impulse?.cd ?? 0) * 100),
        impulse: Math.min(100, Math.max(0, impulse?.impulse ?? 0)),
        color: AGENT_COLORS[i % AGENT_COLORS.length],
      }
    })
  }, [agents, latestImpulses])

  if (data.length === 0) {
    return <p className="text-[10px] text-muted-foreground">Waiting...</p>
  }

  return (
    <div className="grid grid-cols-2 gap-1">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-1.5 text-[10px]">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
          <span className="truncate w-10" title={d.title}>{d.name}</span>
          <div className="flex-1 flex gap-0.5">
            <div className="h-3 rounded-sm bg-blue-500/70" style={{ width: `${d.energy}%` }} title={`Energy: ${d.energy}`} />
          </div>
          <span className="font-mono w-4 text-right text-muted-foreground">{d.energy}</span>
        </div>
      ))}
    </div>
  )
}

function ActivationHeatmap() {
  const agents = useSimulationStore((s) => s.agents)
  const impulseLog = useSimulationStore((s) => s.impulseLog)

  const heatData = useMemo(() => {
    const recentRounds = impulseLog.slice(-12)
    return agents.map((agent, i) => {
      const displayName = getPersonaDisplayName(agent, i)
      return {
        name: displayName,
        title: getPersonaProfileTitle(agent) || displayName,
        color: AGENT_COLORS[i % AGENT_COLORS.length],
        cells: recentRounds.map(round => {
          const score = round.find(s => s.id === agent.id || s.name === agent.name)
          return score ? Math.min(1, Math.max(0, score.cd)) : 0
        }),
      }
    })
  }, [agents, impulseLog])

  if (impulseLog.length < 1) {
    return <p className="text-[10px] text-muted-foreground">Waiting...</p>
  }

  return (
    <div className="space-y-1">
      {heatData.map((row) => (
        <div key={row.name} className="flex items-center gap-1.5">
          <span className="text-[9px] text-muted-foreground w-12 truncate shrink-0" title={row.title}>{row.name}</span>
          <div className="flex gap-px flex-1">
            {row.cells.map((val, j) => (
              <div
                key={j}
                className="flex-1 h-3 rounded-[2px]"
                style={{
                  backgroundColor: row.color,
                  opacity: 0.15 + val * 0.85,
                }}
                title={`R${impulseLog.length - row.cells.length + j + 1}: ${val.toFixed(2)}`}
              />
            ))}
          </div>
        </div>
      ))}
      <div className="flex justify-between text-[8px] text-muted-foreground mt-0.5 px-14">
        <span>←older</span>
        <span>recent→</span>
      </div>
    </div>
  )
}

function ConvergenceChart() {
  const convergenceLog = useSimulationStore((s) => s.convergenceLog)

  if (convergenceLog.length < 2) {
    return <p className="text-[10px] text-muted-foreground">Waiting for data...</p>
  }

  // Prepare band data: Recharts Area needs [min, max] for range rendering
  const bandData = convergenceLog.map(d => ({
    turn: d.turn,
    range: [d.min, d.max] as [number, number],
    median: d.median,
    clusters: d.clusters,
  }))

  const allVals = convergenceLog.flatMap(d => [d.min, d.max])
  const yMin = Math.min(...allVals) - 0.05
  const yMax = Math.max(...allVals) + 0.05
  const latest = convergenceLog[convergenceLog.length - 1]
  const prev = convergenceLog.length > 3 ? convergenceLog[convergenceLog.length - 4] : null

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={110}>
        <LineChart data={bandData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
          <XAxis dataKey="turn" tick={{ fontSize: 8, fill: 'currentColor', opacity: 0.5 }} stroke="currentColor" opacity={0.2} />
          <YAxis domain={[yMin, yMax]} tick={{ fontSize: 8, fill: 'currentColor', opacity: 0.5 }} stroke="currentColor" opacity={0.2} />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 10 }}
            formatter={(value) => [Number(value).toFixed(3), 'Similarity']}
            labelFormatter={(label) => `Turn ${label}`}
          />
          <Line type="monotone" dataKey="median" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 3 }} name="median" />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
        <span>{latest?.clusters ?? '—'} camps · spread {((latest?.max ?? 0) - (latest?.min ?? 0)).toFixed(3)}</span>
        <span>
          {prev && latest.median > prev.median
            ? '↑ Converging'
            : prev ? '↓ Diverging' : '—'}
        </span>
      </div>
    </div>
  )
}

function ImpulseChart() {
  const impulseLog = useSimulationStore((s) => s.impulseLog)
  const latestImpulses = impulseLog[impulseLog.length - 1] ?? []

  const data = useMemo(() => {
    return [...latestImpulses].sort((a, b) => b.impulse - a.impulse)
  }, [latestImpulses])

  if (data.length === 0) {
    return <p className="text-[10px] text-muted-foreground">Waiting...</p>
  }

  return (
    <ResponsiveContainer width="100%" height={data.length * 24 + 16}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <XAxis type="number" tick={{ fontSize: 9, fill: 'currentColor', opacity: 0.6 }} stroke="currentColor" opacity={0.3} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'currentColor', opacity: 0.6 }} stroke="currentColor" opacity={0.3} width={42} />
        <Tooltip
          contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
          formatter={(value) => [Number(value).toFixed(1), 'Impulse']}
        />
        <Bar dataKey="impulse" radius={[0, 4, 4, 0]} barSize={12}>
          {data.map((_, i) => (
            <Cell key={i} fill={AGENT_COLORS[i % AGENT_COLORS.length]} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function EventLog({ events }: { events: CognitiveEvent[] }) {
  const recent = events.slice(-8).reverse()
  if (recent.length === 0) return <p className="text-[10px] text-muted-foreground">No events yet</p>

  return (
    <div className="space-y-0.5 max-h-32 overflow-y-auto">
      {recent.map((e, i) => (
        <div key={i} className="flex items-center gap-1.5 text-[10px]">
          <Badge
            variant="outline"
            className={`text-[9px] px-1 py-0 ${
              e.type === 'shock' ? 'border-red-500/40 text-red-400' : 'border-yellow-500/40 text-yellow-400'
            }`}
          >
            {e.type === 'shock' ? 'SHOCK' : 'OVERLOAD'}
          </Badge>
          <span className="font-medium">{e.agentName}</span>
          <span className="text-muted-foreground">R{e.round}</span>
          <span className="font-mono">{e.value.toFixed(3)}</span>
        </div>
      ))}
    </div>
  )
}

function ParamSlider({ label, tooltip, value, min, max, step, onChange }: {
  label: string; tooltip: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">{label}</span>
          <InfoTooltip text={tooltip} />
        </div>
        <span className="text-[10px] font-mono text-foreground">{value}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)} className="h-4" />
    </div>
  )
}

function EngineParamsPanel() {
  const params = useSimulationStore((s) => s.engineParams)
  const setParams = useSimulationStore((s) => s.setEngineParams)

  return (
    <div className="space-y-2.5">
      <ParamSlider
        label="Moderator Interval"
        tooltip="How many turns between moderator interventions"
        value={params.moderatorInterval} min={2} max={15} step={1}
        onChange={(v) => setParams({ moderatorInterval: v })}
      />
      <ParamSlider
        label="Noise Range"
        tooltip="Random noise (±N/2) in speaker selection. Higher = more random"
        value={params.noiseRange} min={0} max={160} step={10}
        onChange={(v) => setParams({ noiseRange: v })}
      />
      <ParamSlider
        label="Silence Boost"
        tooltip="Impulse bonus per silent turn. Prevents long silence streaks"
        value={params.silenceCompensation} min={0} max={20} step={1}
        onChange={(v) => setParams({ silenceCompensation: v })}
      />
      <ParamSlider
        label="Speaker Energy Cost"
        tooltip="Energy consumed per utterance"
        value={params.energyCostSpeaker} min={1} max={10} step={1}
        onChange={(v) => setParams({ energyCostSpeaker: v })}
      />
      <ParamSlider
        label="Listener Fatigue"
        tooltip="Energy drain per turn for non-speakers (attention fatigue)"
        value={params.energyCostListener} min={0} max={5} step={1}
        onChange={(v) => setParams({ energyCostListener: v })}
      />
    </div>
  )
}

export function DynamicsPanel() {
  const agents = useSimulationStore((s) => s.agents)
  const messages = useSimulationStore((s) => s.messages)
  const cognitiveEvents = useSimulationStore((s) => s.cognitiveEvents)

  return (
    <div className="h-full overflow-y-auto flex flex-col">
      <div className="p-3 border-b">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Cognitive Dynamics
        </h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Turn {messages.length} · {agents.length} agents
        </p>
      </div>

      <div className="p-3 border-b">
        <SectionHeader
          title="Engine Params"
          tooltip="Core simulation parameters. Adjustable in real-time during conversation"
          refKey="params"
        />
        <EngineParamsPanel />
      </div>

      <div className="p-3 border-b">
        <SectionHeader
          title="Activation Heatmap"
          tooltip="Cognitive dissonance intensity per agent over recent turns. Brighter = higher conflict between incoming info and existing beliefs"
          refKey="activation"
        />
        <ActivationHeatmap />
      </div>

      <div className="p-3 border-b">
        <SectionHeader
          title="Agent Energy"
          tooltip="Remaining engagement energy per agent. Depletes with each turn (faster for speakers). At zero the agent exits conversation"
          refKey="energy"
        />
        <AgentRadar />
      </div>

      <div className="p-3 border-b">
        <SectionHeader
          title="Opinion Convergence"
          tooltip="Divergence = 1 - avg pairwise cosine similarity of belief vectors. 0 = full consensus, 1 = max disagreement. Cluster count shows distinct opinion camps (cosine threshold 0.6). Line dropping = opinions converging"
          refKey="convergence"
        />
        <ConvergenceChart />
      </div>

      <div className="p-3 border-b">
        <SectionHeader
          title="Impulse Ranking"
          tooltip="Current speaking impulse = f(CD, RI, personality, keyword match, noise). Highest score speaks next"
          refKey="impulse"
        />
        <ImpulseChart />
      </div>

      <div className="p-3 flex-1">
        <SectionHeader
          title="Cognitive Events"
          tooltip="Shock: single-turn dissonance exceeds threshold → immediate belief refresh. Overload: accumulated dissonance exceeds threshold → belief reconstruction"
          refKey="events"
        />
        <EventLog events={cognitiveEvents} />
      </div>
    </div>
  )
}
