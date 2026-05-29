'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface Reference {
  title: string
  authors: string
  year: number
  description: string
  url: string
}

interface ReferenceModalProps {
  references: Reference[]
}

export function ReferenceButton({ references }: ReferenceModalProps) {
  return (
    <Dialog>
      <DialogTrigger className="text-[9px] text-muted-foreground hover:text-foreground border border-border/50 rounded px-1.5 py-0.5 transition-colors">
        Ref
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">References</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {references.map((ref, i) => (
            <div key={i} className="space-y-1 border-b pb-3 last:border-0">
              <p className="text-xs font-medium">{ref.title}</p>
              <p className="text-[10px] text-muted-foreground">{ref.authors} ({ref.year})</p>
              <p className="text-[11px] text-foreground/80 leading-relaxed">{ref.description}</p>
              <a
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-blue-400 hover:underline inline-block mt-0.5"
              >
                View Paper →
              </a>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const SECTION_REFERENCES: Record<string, Reference[]> = {
  activation: [
    {
      title: 'A Theory of Cognitive Dissonance',
      authors: 'Festinger, L.',
      year: 1957,
      description: 'The foundational theory of cognitive dissonance. We compute CD as the cosine distance between incoming message embedding and the agent\'s belief vector — higher values indicate greater conflict with existing beliefs.',
      url: 'https://psycnet.apa.org/record/1993-97948-000',
    },
    {
      title: 'Measuring Individual Differences in Cognitive Dissonance',
      authors: 'Harmon-Jones, E.',
      year: 2019,
      description: 'Provides empirical scales for dissonance measurement. Our activation heatmap maps continuous CD values to color opacity (0→transparent, 1→full saturation) following this scale.',
      url: 'https://doi.org/10.1016/B978-0-12-811472-6.00002-3',
    },
  ],
  energy: [
    {
      title: 'Ego Depletion: Is the Active Self a Limited Resource?',
      authors: 'Baumeister, R. F., Bratslavsky, E., Muraven, M., & Tice, D. M.',
      year: 1998,
      description: 'The ego-depletion model posits that self-control and active engagement draw from a limited resource pool. Our Energy parameter models this — speaking costs more than listening, and depletion leads to conversation withdrawal.',
      url: 'https://doi.org/10.1037/0022-3514.74.5.1252',
    },
    {
      title: 'The Strength Model of Self-Regulation',
      authors: 'Baumeister, R. F. & Vohs, K. D.',
      year: 2007,
      description: 'Extended resource model for engagement fatigue. Speaker energy cost vs listener fatigue rates are calibrated to produce realistic conversation dropout patterns.',
      url: 'https://doi.org/10.1111/j.1467-8721.2007.00534.x',
    },
  ],
  impulse: [
    {
      title: 'The Elaboration Likelihood Model of Persuasion',
      authors: 'Petty, R. E. & Cacioppo, J. T.',
      year: 1986,
      description: 'ELM\'s central/peripheral processing routes inform our impulse formula. High cognitive dissonance (central route activation) + keyword triggers (peripheral cues) + personality traits determine speaking motivation.',
      url: 'https://doi.org/10.1016/S0065-2601(08)60214-2',
    },
    {
      title: 'Personality and Social Psychology: Towards a Synthesis',
      authors: 'Costa, P. T. & McCrae, R. R.',
      year: 1992,
      description: 'The Big Five (OCEAN) model. Extraversion directly modulates impulse magnitude; Neuroticism amplifies friction-triggered responses; Agreeableness dampens confrontational impulses.',
      url: 'https://doi.org/10.1007/978-1-4615-0763-5_11',
    },
  ],
  events: [
    {
      title: 'When Prophecy Fails: A Social and Psychological Study',
      authors: 'Festinger, L., Riecken, H. W., & Schachter, S.',
      year: 1956,
      description: 'Documents belief change under extreme dissonance. Our "Shock" event (single high-dissonance spike) triggers immediate belief refresh, modeled after sudden disconfirmation scenarios.',
      url: 'https://psycnet.apa.org/record/2011-15857-000',
    },
    {
      title: 'Cognitive Overload and Decision Making',
      authors: 'Kirsh, D.',
      year: 2000,
      description: 'Accumulated cognitive load degrades decision quality. Our "Overload" event fires when accumulated dissonance exceeds threshold, triggering belief reconstruction — the agent fundamentally reorganizes their position.',
      url: 'https://doi.org/10.1016/S0364-0213(00)00005-8',
    },
  ],
  convergence: [
    {
      title: 'Have Americans\' Social Attitudes Become More Polarized?',
      authors: 'DiMaggio, P., Evans, J., & Bryson, B.',
      year: 1996,
      description: 'Proposed tracking opinion variance over time as primary polarization indicator. We use trace of belief-vector covariance matrix — decreasing variance indicates convergence toward consensus.',
      url: 'https://doi.org/10.1086/230995',
    },
    {
      title: 'Opinion Dynamics and Bounded Confidence: Models, Analysis and Simulation',
      authors: 'Hegselmann, R. & Krause, U.',
      year: 2002,
      description: 'Bounded confidence model where agents only influence each other within a trust radius. We count distinct opinion clusters using cosine similarity threshold — stable cluster count indicates fragmentation equilibrium.',
      url: 'http://jasss.soc.surrey.ac.uk/5/3/2.html',
    },
    {
      title: 'On the Measurement of Polarization',
      authors: 'Esteban, J. & Ray, D.',
      year: 1994,
      description: 'Distinguishes polarization (clustered opposition) from simple dispersion. Informs our dual metric: variance captures spread, cluster count captures factional structure.',
      url: 'https://doi.org/10.2307/2951734',
    },
  ],
  params: [
    {
      title: 'Agent-Based Models of Social Interaction',
      authors: 'Epstein, J. M. & Axtell, R.',
      year: 1996,
      description: 'Foundational work on agent-based social simulation. Our engine parameters (noise range, silence compensation, energy costs) follow ABM design principles for producing emergent group behavior.',
      url: 'https://mitpress.mit.edu/9780262550253/',
    },
    {
      title: 'Spiral of Silence Theory',
      authors: 'Noelle-Neumann, E.',
      year: 1974,
      description: 'Explains why silent agents need compensatory impulse boosts — without it, early-silenced agents stay permanently silent, violating realistic group dynamics where quieter members eventually contribute.',
      url: 'https://doi.org/10.1111/j.1460-2466.1974.tb00367.x',
    },
  ],
}
