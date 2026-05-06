import type { MascotProfile, Trait, AnimalType } from '@cyberpet/mascot-profile'

// ---------------------------------------------------------------------------
// Trait Review panel — vanilla TS, no framework
// ---------------------------------------------------------------------------

export interface TraitReviewHandle {
  element:        HTMLElement
  getActiveTraits: () => Trait[]
  onSave:         (cb: (traits: Trait[], animal: AnimalType) => void) => void
  destroy:        () => void
}

export function buildTraitReview(profile: MascotProfile): TraitReviewHandle {
  // Mutable set of removed trait ids
  const removed = new Set<string>()
  let saveCallback: ((traits: Trait[], animal: AnimalType) => void) | null = null

  // ---------------------------------------------------------------------------
  // Root panel
  // ---------------------------------------------------------------------------

  const panel = document.createElement('div')
  panel.id = 'trait-review-panel'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-label', 'Trait review')
  panel.classList.add('hidden')

  // Header
  const header = document.createElement('div')
  header.id = 'trait-review-header'

  const title = document.createElement('span')
  title.id = 'trait-review-title'
  title.textContent = 'Trait Review'

  const closeBtn = document.createElement('button')
  closeBtn.id = 'trait-review-close'
  closeBtn.setAttribute('aria-label', 'Close trait review')
  closeBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
    <path d="M1 1l9 9M10 1L1 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`
  closeBtn.addEventListener('click', hide)
  closeBtn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') hide() })

  header.append(title, closeBtn)

  // Subheader
  const sub = document.createElement('p')
  sub.id = 'trait-review-sub'
  sub.textContent = 'Remove traits you disagree with before saving.'

  // Chip list
  const chipList = document.createElement('ul')
  chipList.id = 'trait-chip-list'
  chipList.setAttribute('role', 'list')
  chipList.setAttribute('aria-label', 'Inferred traits')

  profile.traits.forEach((trait: Trait) => {
    chipList.appendChild(buildChip(trait))
  })

  // Footer
  const footer = document.createElement('div')
  footer.id = 'trait-review-footer'

  const saveBtn = document.createElement('button')
  saveBtn.id = 'trait-review-save'
  saveBtn.className = 'primary-btn'
  saveBtn.textContent = 'Save traits'
  saveBtn.addEventListener('click', () => {
    const active = getActiveTraits()
    saveCallback?.(active, profile.animal)
    hide()
  })

  const privNote = document.createElement('p')
  privNote.className = 'privacy-note'
  privNote.textContent = 'Traits are stored locally only.'

  footer.append(saveBtn, privNote)
  panel.append(header, sub, chipList, footer)

  // ---------------------------------------------------------------------------
  // Chip builder
  // ---------------------------------------------------------------------------

  function buildChip(trait: Trait): HTMLLIElement {
    const li = document.createElement('li')
    li.className = 'trait-chip'
    li.dataset.id = trait.id
    li.setAttribute('role', 'listitem')

    // Confidence arc indicator
    const arc = document.createElement('span')
    arc.className = 'chip-arc'
    arc.setAttribute('aria-hidden', 'true')
    arc.style.setProperty('--conf', String(trait.confidence))

    // Label
    const label = document.createElement('span')
    label.className = 'chip-label'
    label.textContent = trait.label

    // Confidence badge
    const badge = document.createElement('span')
    badge.className = 'chip-confidence'
    badge.textContent = `${Math.round(trait.confidence * 100)}%`
    badge.setAttribute('aria-label', `${Math.round(trait.confidence * 100)} percent confidence`)

    // Remove button
    const removeBtn = document.createElement('button')
    removeBtn.className = 'chip-remove'
    removeBtn.setAttribute('aria-label', `Remove ${trait.label} trait`)
    removeBtn.setAttribute('tabindex', '0')
    removeBtn.innerHTML = `<svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
      <path d="M1 1l7 7M8 1L1 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`

    removeBtn.addEventListener('click', () => toggleRemove(trait.id, li, removeBtn))
    removeBtn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        toggleRemove(trait.id, li, removeBtn)
      }
    })

    li.append(arc, label, badge, removeBtn)
    return li
  }

  function toggleRemove(id: string, li: HTMLLIElement, btn: HTMLButtonElement) {
    if (removed.has(id)) {
      removed.delete(id)
      li.classList.remove('chip-removed')
      btn.setAttribute('aria-label', `Remove ${id} trait`)
    } else {
      removed.add(id)
      li.classList.add('chip-removed')
      btn.setAttribute('aria-label', `Restore ${id} trait`)
    }
  }

  // ---------------------------------------------------------------------------
  // Show / hide
  // ---------------------------------------------------------------------------

  function show() {
    panel.classList.remove('hidden')
    requestAnimationFrame(() => panel.classList.add('open'))
    closeBtn.focus()
  }

  function hide() {
    panel.classList.remove('open')
    panel.addEventListener('transitionend', () => panel.classList.add('hidden'), { once: true })
  }

  // Keyboard trap: Escape closes
  panel.addEventListener('keydown', e => {
    if (e.key === 'Escape') hide()
  })

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  function getActiveTraits(): Trait[] {
    return profile.traits.filter((t: Trait) => !removed.has(t.id))
  }

  // Expose show so the caller can trigger it
  ;(panel as unknown as { show: () => void }).show = show

  return {
    element: panel,
    getActiveTraits,
    onSave: cb => { saveCallback = cb },
    destroy: () => panel.remove(),
  }
}
