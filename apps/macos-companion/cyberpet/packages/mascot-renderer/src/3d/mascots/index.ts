import type { MascotParts, MascotId } from './shared.js'
import { buildMiBunnyCat }       from './cat.js'
import { buildMiBunnyGibbon }    from './gibbon.js'
import { buildMiBunnyRabbit }    from './rabbit.js'
import { buildMiBunnyPelican }   from './pelican.js'
import { buildMiBunnyCow }       from './cow.js'
import { buildMiBunnyBear }      from './bear.js'
import { buildMiBunnyKoala }     from './koala.js'
import { buildMiBunnyRedPanda }  from './red-panda.js'

export type { MascotId, MascotParts, AnimTargets } from './shared.js'
export { TARGET_NEUTRAL } from './shared.js'

export interface MascotMeta {
  id:        MascotId
  label:     string
  emoji:     string
  available: boolean
}

export const MASCOT_LIST: MascotMeta[] = [
  { id: 'cat',       label: 'Cat',       emoji: '🐱', available: true },
  { id: 'gibbon',    label: 'Gibbon',    emoji: '🐒', available: true },
  { id: 'rabbit',    label: 'Rabbit',    emoji: '🐰', available: true },
  { id: 'pelican',   label: 'Pelican',   emoji: '🦤', available: true },
  { id: 'cow',       label: 'Cow',       emoji: '🐄', available: true },
  { id: 'bear',      label: 'Bear',      emoji: '🐻', available: true },
  { id: 'koala',     label: 'Koala',     emoji: '🐨', available: true },
  { id: 'red-panda', label: 'Red Panda', emoji: '🦊', available: true },
]

const BUILDERS: Record<MascotId, () => MascotParts> = {
  cat:         buildMiBunnyCat,
  gibbon:      buildMiBunnyGibbon,
  rabbit:      buildMiBunnyRabbit,
  pelican:     buildMiBunnyPelican,
  cow:         buildMiBunnyCow,
  bear:        buildMiBunnyBear,
  koala:       buildMiBunnyKoala,
  'red-panda': buildMiBunnyRedPanda,
}

export function buildMascot(id: MascotId): MascotParts {
  return BUILDERS[id]()
}
