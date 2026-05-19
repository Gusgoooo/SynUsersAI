#!/usr/bin/env node

import { AgentPersona, UtteranceMessage, SimulationSnapshot } from './types.js'
import { initializeSimulationEnviron } from './initializer.js'
import { selectNextSpeaker } from './speaker-selector.js'
import { processTurnAndReflect } from './state-updater.js'
import { compileSingleHopPrompt } from './context-builder.js'
import { generateMarkdownReport } from './reporter.js'
import { chatCompletionJSON, getEmbedding } from './llm.js'
import { readFileSync, writeFileSync } from 'node:fs'

interface CLIArgs {
  topic: string
  mode: 'generated' | 'manual'
  rounds: number
  config?: string
  output?: string
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2)
  const parsed: CLIArgs = {
    topic: 'AI subscription price increase',
    mode: 'generated',
    rounds: 20,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--topic': parsed.topic = args[++i]; break
      case '--mode': parsed.mode = args[++i] as 'generated' | 'manual'; break
      case '--rounds': parsed.rounds = parseInt(args[++i], 10); break
      case '--config': parsed.config = args[++i]; break
      case '--output': parsed.output = args[++i]; break
    }
  }

  return parsed
}

function getPhaseDirective(round: number, totalRounds: number): string {
  const progress = round / totalRounds
  if (progress < 0.2) return 'Opening phase: establish your position clearly. Be direct.'
  if (progress < 0.5) return 'Exploration phase: challenge others, ask probing questions.'
  if (progress < 0.8) return 'Deepening phase: confront disagreements, synthesize or push back.'
  return 'Closing phase: crystallize your final stance. Be concise.'
}

async function main() {
  const args = parseArgs()
  console.log(`\n=== SynUsersAI Cognitive Dynamics Engine ===`)
  console.log(`Topic: ${args.topic}`)
  console.log(`Mode: ${args.mode} | Rounds: ${args.rounds}\n`)

  // Initialize
  let initResult
  if (args.mode === 'manual' && args.config) {
    const raw = readFileSync(args.config, 'utf-8')
    const payload = JSON.parse(raw)
    initResult = await initializeSimulationEnviron('MANUAL', payload)
  } else {
    initResult = await initializeSimulationEnviron('GENERATED', { topic: args.topic })
  }

  const { personas, ignitionMessage } = initResult
  console.log(`Agents: ${personas.map(p => p.name).join(', ')}`)
  console.log(`Ignition: "${ignitionMessage.text}"\n`)

  // Track initial beliefs for the report
  const initialBeliefs = new Map<string, string>()
  for (const p of personas) {
    initialBeliefs.set(p.id, p.current_belief_summary)
  }

  // Simulation state
  const history: UtteranceMessage[] = [ignitionMessage]
  const dissonanceLog: Record<string, number[]> = {}
  for (const p of personas) {
    dissonanceLog[p.id] = []
  }

  // Main simulation loop
  let lastMessage = ignitionMessage

  for (let round = 0; round < args.rounds; round++) {
    console.log(`--- Round ${round + 1}/${args.rounds} ---`)

    // Select speaker
    const speaker = selectNextSpeaker(personas, lastMessage, history.length)
    if (!speaker) {
      console.log('  No speaker selected, skipping round.')
      continue
    }

    // Build prompt
    const phaseDirective = getPhaseDirective(round, args.rounds)
    const { system, user } = compileSingleHopPrompt(speaker, history, phaseDirective)

    // Generate response
    let response: { text: string; inner_thoughts: string }
    try {
      response = await chatCompletionJSON<{ text: string; inner_thoughts: string }>(
        [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        { temperature: 0.8, maxTokens: 300 }
      )
    } catch {
      response = { text: '...', inner_thoughts: '' }
    }

    // Create utterance
    const utterance: UtteranceMessage = {
      id: crypto.randomUUID(),
      speakerId: speaker.id,
      speakerName: speaker.name,
      text: response.text,
      inner_thoughts: response.inner_thoughts,
    }

    console.log(`  ${speaker.name}: "${response.text}"`)
    if (response.inner_thoughts) {
      console.log(`    (thinks: ${response.inner_thoughts})`)
    }

    // Update states
    await processTurnAndReflect(personas, utterance, history)

    // Record dissonance for each agent
    for (const p of personas) {
      dissonanceLog[p.id].push(p.previous_dissonance)
    }

    history.push(utterance)
    lastMessage = utterance
  }

  // Generate report
  console.log('\n=== Generating Report ===\n')

  const snapshot: SimulationSnapshot = {
    timestamp: Date.now(),
    history,
    trackedDissonanceLog: dissonanceLog,
  }

  // Restore initial beliefs for comparison in report
  // (reporter uses persona.current_belief_summary as "final")
  const report = generateMarkdownReport(snapshot, personas)

  if (args.output) {
    writeFileSync(args.output, report, 'utf-8')
    console.log(`Report written to: ${args.output}`)
  } else {
    console.log(report)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
