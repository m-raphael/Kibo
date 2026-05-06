import type { MascotProfile, Trait, AnimalType } from '@cyberpet/mascot-profile'

// ---------------------------------------------------------------------------
// Trait Review panel — vanilla TS, no framework
// ---------------------------------------------------------------------------

export interface TraitReviewHandle {
  element:         HTMLElement
  getActiveTraits: () => Trait[]
  onSave:          (cb: (traits: Trait[], animal: AnimalType) => void) => void
  destroy:         () => void
}

export function buildTraitReview(profile: MascotProfile): TraitReviewHandle {
  const removed = new Set<string>()
  let saveCallback: ((traits: Trait[], animal: AnimalType) => void) | null = null

  // ---------------------------------------------------------------------------
  // Root panel
  // ---------------------------------------------------------------------------

  const panel = document.createElement('div')
  panel.id = 'trait-review-panel'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-label', 'Trait review')
  panel.setAttribute('aria-modal', 'true')
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

  header.append(title, closeBtn)

  // Subheader with live active count
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

  // ---------------------------------------------------------------------------
  // Footer — Task 8: disabled until ≥1 trait is active
  // ---------------------------------------------------------------------------

  const footer = document.createElement('div')
  footer.id = 'trait-review-footer'

  const saveBtn = document.createElement('button')
  saveBtn.id = 'trait-review-save'
  saveBtn.className = 'primary-btn'
  updateSaveBtn()

  saveBtn.addEventListener('click', () => {
    if (saveBtn.disabled) return
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

    // Left: confidence arc + label column
    const left = document.createElement('span')
    left.className = 'chip-left'

    const arc = document.createElement('span')
    arc.className = 'chip-arc'
    arc.setAttribute('aria-hidden', 'true')
    arc.style.setProperty('--conf', String(trait.confidence))

    const labelWrap = document.createElement('span')
    labelWrap.className = 'chip-label-wrap'

    const label = document.createElement('span')
    label.className = 'chip-label'
    label.textContent = trait.label

    // Task 7: "Not used" tag — hidden until chip is removed
    const notUsed = document.createElement('span')
    notUsed.className = 'chip-not-used'
    notUsed.textContent = 'Not used'
    notUsed.setAttribute('aria-hidden', 'true')

    labelWrap.append(label, notUsed)
    left.append(arc, labelWrap)

    // Right: confidence badge + remove button
    const right = document.createElement('span')
    right.className = 'chip-right'

    const badge = document.createElement('span')
    badge.className = 'chip-confidence'
    badge.textContent = `${Math.round(trait.confidence * 100)}%`
    badge.setAttribute('aria-label', `${Math.round(trait.confidence * 100)} percent confidence`)

    const removeBtn = document.createElement('button')
    removeBtn.className = 'chip-remove'
    removeBtn.setAttribute('aria-label', `Remove ${trait.label} trait`)
    removeBtn.innerHTML = `<svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
      <path d="M1 1l7 7M8 1L1 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`

    removeBtn.addEventListener('click', () => toggleRemove(trait, li, removeBtn))
    removeBtn.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRemove(trait, li, removeBtn) }
    })

    right.append(badge, removeBtn)
    li.append(left, right)
    return li
  }

  function toggleRemove(trait: Trait, li: HTMLLIElement, btn: HTMLButtonElement) {
    const isRemoving = !removed.has(trait.id)
    if (isRemoving) {
      removed.add(trait.id)
      li.classList.add('chip-removed')
      btn.setAttribute('aria-label', `Restore ${trait.label} trait`)
      btn.innerHTML = `<svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
        <path d="M4.5 1v7M1 4.5h7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>`
    } else {
      removed.delete(trait.id)
      li.classList.remove('chip-removed')
      btn.setAttribute('aria-label', `Remove ${trait.label} trait`)
      btn.innerHTML = `<svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
        <path d="M1 1l7 7M8 1L1 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>`
    }
    updateSaveBtn()
  }

  // ---------------------------------------------------------------------------
  // Save button — Task 8: label tracks count, disabled at zero
  // ---------------------------------------------------------------------------

  function updateSaveBtn() {
    const count = profile.traits.length - removed.size
    if (count === 0) {
      saveBtn.disabled = true
      saveBtn.textContent = 'No traits selected'
      saveBtn.setAttribute('aria-disabled', 'true')
    } else {
      saveBtn.disabled = false
      saveBtn.textContent = `Save ${count} trait${count === 1 ? '' : 's'}`
      saveBtn.removeAttribute('aria-disabled')
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

  panel.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') hide() })

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  function getActiveTraits(): Trait[] {
    return profile.traits.filter((t: Trait) => !removed.has(t.id))
  }

  ;(panel as unknown as { show: () => void }).show = show

  return {
    element: panel,
    getActiveTraits,
    onSave: cb => { saveCallback = cb },
    destroy: () => panel.remove(),
  }
}
