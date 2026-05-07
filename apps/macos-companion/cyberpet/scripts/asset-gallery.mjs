#!/usr/bin/env node
/**
 * asset-gallery — Tasks 18/19/20
 * Browse and filter mascot reference assets from the manifest.
 *
 * Usage:
 *   npm run assets:gallery                                # show all
 *   npm run assets:gallery -- --mascot cat               # filter by species
 *   npm run assets:gallery -- --quality approved-for-modeling
 *   npm run assets:gallery -- --style mi-bunny
 *   npm run assets:gallery -- --flag <id> <quality>      # update quality flag
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname }            from 'path'
import { fileURLToPath }               from 'url'

const __dir    = dirname(fileURLToPath(import.meta.url))
const MANIFEST = resolve(__dir, '../assets/mascots/manifests/references.json')

const QUALITY_ICONS = {
  'reference-only':        '📎',
  'approved-for-modeling': '✅',
  'needs-cleanup':         '⚠️ ',
}

const VALID_QUALITY = ['reference-only', 'approved-for-modeling', 'needs-cleanup']

function load() { return JSON.parse(readFileSync(MANIFEST, 'utf8')) }
function save(d) { writeFileSync(MANIFEST, JSON.stringify(d, null, 2) + '\n', 'utf8') }

function parseArgs() {
  const args = process.argv.slice(2); const out = {}; const pos = []
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) { out[args[i].slice(2)] = args[i + 1]; i++ }
    else pos.push(args[i])
  }
  return { ...out, _: pos }
}

function printEntry(r) {
  const icon   = QUALITY_ICONS[r.quality] ?? '?'
  const t      = r.tags ?? {}
  const accTxt = t.accessories?.length ? t.accessories.join(', ') : 'none'
  const palTxt = t.palette?.join(', ') ?? '—'
  console.log(`
${icon} ${r.id}
   Mascot:     ${r.mascot ?? '(style ref)'}
   Quality:    ${r.quality}
   Style:      ${t.style ?? '—'}  |  Silhouette: ${t.silhouette ?? '—'}
   Expression: ${t.expression ?? '—'}  |  Accessories: ${accTxt}
   Palette:    ${palTxt}
   URL:        ${r.url}`)
}

function main() {
  const args     = parseArgs()
  const manifest = load()
  let   refs     = manifest.references

  // --flag <id> <quality>: update quality on one entry
  if (args.flag) {
    const id      = args.flag
    const quality = args._[0]
    if (!quality || !VALID_QUALITY.includes(quality)) {
      console.error(`Quality must be: ${VALID_QUALITY.join(' | ')}`); process.exit(1)
    }
    const entry = refs.find(r => r.id === id)
    if (!entry) { console.error(`No entry with id "${id}"`); process.exit(1) }
    entry.quality = quality
    save(manifest)
    console.log(`\n✅  Updated "${id}" → ${quality}\n`)
    return
  }

  // Filters
  if (args.mascot)  refs = refs.filter(r => r.mascot === args.mascot)
  if (args.quality) refs = refs.filter(r => r.quality === args.quality)
  if (args.style)   refs = refs.filter(r => r.tags?.style === args.style)

  // Summary
  const total    = manifest.references.length
  const approved = manifest.references.filter(r => r.quality === 'approved-for-modeling').length
  const refOnly  = manifest.references.filter(r => r.quality === 'reference-only').length
  const cleanup  = manifest.references.filter(r => r.quality === 'needs-cleanup').length

  console.log(`\n🐾  Mascot Asset Gallery  (manifest v${manifest.version})`)
  console.log(`   Total: ${total}  |  ✅ ${approved} approved  |  📎 ${refOnly} ref-only  |  ⚠️  ${cleanup} needs-cleanup`)

  const active = [
    args.mascot  && `mascot=${args.mascot}`,
    args.quality && `quality=${args.quality}`,
    args.style   && `style=${args.style}`,
  ].filter(Boolean)
  if (active.length) console.log(`   Filter: ${active.join('  ·  ')}  →  ${refs.length} result(s)`)

  if (refs.length === 0) { console.log('\n   No results.\n'); return }
  refs.forEach(printEntry)
  console.log()
}

main()
