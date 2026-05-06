import type { MascotParts, MascotId } from './shared.js'
import { buildMiBunnyCat }       from './cat.js'
import { buildMiBunnyGibbon }    from './gibbon.js'
import { buildPlaceholderRabbit }    from './rabbit.js'
import { buildPlaceholderPelican }   from './pelican.js'
import { buildPlaceholderCow }       from './cow.js'
import { buildPlaceholderBear }      from './bear.js'
import { buildPlaceholderKoala }     from './koala.js'
import { buildPlaceholderRedPanda }  from './red-panda.js'

export type { MascotId, MascotParts, AnimTargets } from './shared.js'
export { TARGET_NEUTRAL } from './shared.js'

export interface MascotMeta {
  id:        MascotId
  label:     string
  emoji:     string
  available: boolean
}

export const MASCOT_LIST: MascotMeta[] = [
  { id: 'cat',       label: 'Cat',       emoji: '🐱', available: true  },
  { id: 'gibbon',    label: 'Gibbon',    emoji: '🐒', available: true  },
  { id: 'rabbit',    label: 'Rabbit',    emoji: '🐰', available: false },
  { id: 'pelican',   label: 'Pelican',   emoji: '🦤', available: false },
  { id: 'cow',       label: 'Cow',       emoji: '🐄', available: false },
  { id: 'bear',      label: 'Bear',      emoji: '🐻', available: false },
  { id: 'koala',     label: 'Koala',     emoji: '🐨', available: true  },
  { id: 'red-panda', label: 'Red Panda', emoji: '🦊', available: false },
]

const BUILDERS: Record<MascotId, () => MascotParts> = {
  cat:         buildMiBunnyCat,
  gibbon:      buildMiBunnyGibbon,
  rabbit:      buildPlaceholderRabbit,
  pelican:     buildPlaceholderPelican,
  cow:         buildPlaceholderCow,
  bear:        buildPlaceholderBear,
  koala:       buildPlaceholderKoala,
  'red-panda': buildPlaceholderRedPanda,
}

export function buildMascot(id: MascotId): MascotParts {
  return BUILDERS[id]()
}
