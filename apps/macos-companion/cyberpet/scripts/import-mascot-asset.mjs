#!/usr/bin/env node
/**
 * import-mascot-asset — Task 17
 * Adds a new reference image entry to assets/mascots/manifests/references.json.
 *
 * Usage:
 *   node scripts/import-mascot-asset.mjs \
 *     --id      <slug>              \
 *     --mascot  <species|null>      \
 *     --url     <https://...>       \
 *     --quality <reference-only|approved-for-modeling|needs-cleanup>  \
 *     --style   <mi-bunny|plush|smooth-3d|stylized-3d|photorealistic|streetwear> \
 *     --expr    <neutral|happy|playful|cool|alert|content|relaxed>    \
 *     --sil     <full-body|upper-body|head-shoulders>
 *
 * Or run without args for interactive prompts.
 */

import { readFileSync, writeFileSync } from 'fs'
import { createInterface }             from 'readline'
import { resolve, dirname }            from 'path'
import { fileURLToPath }               from 'url'

const __dir    = dirname(fileURLToPath(import.meta.url))
const MANIFEST = resolve(__dir, '../assets/mascots/manifests/references.json')

const QUALITY_VALUES = ['reference-only', 'approved-for-modeling', 'needs-cleanup']
const STYLE_VALUES   = ['mi-bunny', 'plush', 'smooth-3d', 'stylized-3d', 'photorealistic', 'streetwear']
const EXPR_VALUES    = ['neutral', 'happy', 'playful', 'cool', 'alert', 'content', 'relaxed']
const SIL_VALUES     = ['full-body', 'upper-body', 'head-shoulders']
const SPECIES        = ['cat', 'gibbon', 'rabbit', 'pelican', 'cow', 'bear', 'koala', 'red-panda', 'null']

function loadManifest() { return JSON.parse(readFileSync(MANIFEST, 'utf8')) }
function saveManifest(d) { writeFileSync(MANIFEST, JSON.stringify(d, null, 2) + '\n', 'utf8') }
function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }

function parseArgs() {
  const args = process.argv.slice(2); const out = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) { out[args[i].slice(2)] = args[i + 1]; i++ }
  }
  return out
}

function buildEntry({ id, mascot, url, quality, style, expr, sil }) {
  if (!id || !url || !quality) throw new Error('--id, --url, and --quality are required')
  if (!QUALITY_VALUES.includes(quality)) throw new Error(`quality must be: ${QUALITY_VALUES.join(' | ')}`)
  if (style && !STYLE_VALUES.includes(style)) throw new Error(`style must be: ${STYLE_VALUES.join(' | ')}`)
  if (expr  && !EXPR_VALUES.includes(expr))   throw new Error(`expr must be: ${EXPR_VALUES.join(' | ')}`)
  if (sil   && !SIL_VALUES.includes(sil))     throw new Error(`sil must be: ${SIL_VALUES.join(' | ')}`)
  return {
    id: slugify(id),
    mascot: (!mascot || mascot === 'null') ? null : mascot,
    url,
    quality,
    tags: {
      silhouette:  sil   ?? 'full-body',
      style:       style ?? 'reference-only',
      expression:  expr  ?? 'neutral',
      accessories: [],
      palette:     [],
    },
  }
}

async function prompt(rl, q) { return new Promise(r => rl.question(q, r)) }

async function interactiveMode() {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  console.log('\n🐾  Mascot Asset Importer\n')
  const id      = await prompt(rl, 'Entry ID (slug):  ')
  const url     = await prompt(rl, 'Image URL:        ')
  const mascot  = await prompt(rl, `Mascot [${SPECIES.join('|')}]: `)
  const quality = await prompt(rl, `Quality [${QUALITY_VALUES.join('|')}]: `)
  const style   = await prompt(rl, `Style   [${STYLE_VALUES.join('|')}]: `)
  const expr    = await prompt(rl, `Expr    [${EXPR_VALUES.join('|')}]: `)
  const sil     = await prompt(rl, `Sil     [${SIL_VALUES.join('|')}]: `)
  rl.close()
  return { id, url, mascot, quality, style, expr, sil }
}

async function main() {
  const args     = parseArgs()
  const fields   = Object.keys(args).length ? args : await interactiveMode()
  const entry    = buildEntry(fields)
  const manifest = loadManifest()

  if (manifest.references.find(r => r.id === entry.id)) {
    console.error(`\n⚠️  ID "${entry.id}" already exists.\n`); process.exit(1)
  }

  manifest.references.push(entry)
  saveManifest(manifest)
  console.log(`\n✅  Added "${entry.id}" to references.json`)
  console.log(JSON.stringify(entry, null, 2), '\n')
}

main().catch(err => { console.error('\n❌ ', err.message, '\n'); process.exit(1) })
