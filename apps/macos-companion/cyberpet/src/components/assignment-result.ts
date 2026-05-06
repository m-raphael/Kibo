import type { AssignmentResult, AssignedSpecies, Trait } from '@cyberpet/mascot-profile'

// ---------------------------------------------------------------------------
// Assignment Result panel — Task 10
// Shows matched species, reasons, regenerate, and confirm actions
// ---------------------------------------------------------------------------

export interface AssignmentResultHandle {
  element: HTMLElement
  show:    (result: AssignmentResult, traits: Trait[]) => void
  onConfirm: (cb: (species: AssignedSpecies) => void) => void
  onRegenerate: (cb: () => void) => void
  destroy: () => void
}

export function buildAssignmentResult(): AssignmentResultHandle {
  let confirmCallback:    ((species: AssignedSpecies) => void) | null = null
  let regenerateCallback: (() => void) | null = null
  let currentResult: AssignmentResult | null = null

  // ---------------------------------------------------------------------------
  // Root panel
  // ---------------------------------------------------------------------------

  const panel = document.createElement('div')
  panel.id = 'assignment-result-panel'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-label', 'Mascot assignment result')
  panel.setAttribute('aria-modal', 'true')
  panel.classList.add('hidden')

  // Header
  const header = document.createElement('div')
  header.id = 'assignment-result-header'

  const closeBtn = document.createElement('button')
  closeBtn.id = 'assignment-result-close'
  closeBtn.setAttribute('aria-label', 'Close')
  closeBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
    <path d="M1 1l9 9M10 1L1 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`
  closeBtn.addEventListener('click', hide)
  header.append(closeBtn)

  // Hero — emoji + species name + score ring
  const hero = document.createElement('div')
  hero.id = 'assignment-hero'

  const emojiEl = document.createElement('span')
  emojiEl.id = 'assignment-emoji'

  const scoreRing = document.createElement('span')
  scoreRing.id = 'assignment-score-ring'
  scoreRing.setAttribute('aria-hidden', 'true')

  const heroText = document.createElement('div')
  heroText.id = 'assignment-hero-text'

  const heroLabel = document.createElement('p')
  heroLabel.id = 'assignment-hero-label'
  heroLabel.textContent = 'Your mascot'

  const speciesName = document.createElement('h2')
  speciesName.id = 'assignment-species-name'

  heroText.append(heroLabel, speciesName)
  hero.append(emojiEl, scoreRing, heroText)

  // Reasons list
  const reasonsSection = document.createElement('div')
  reasonsSection.id = 'assignment-reasons'

  const reasonsTitle = document.createElement('p')
  reasonsTitle.id = 'assignment-reasons-title'
  reasonsTitle.textContent = 'Why this match'

  const reasonsList = document.createElement('ul')
  reasonsList.id = 'assignment-reasons-list'
  reasonsList.setAttribute('role', 'list')

  reasonsSection.append(reasonsTitle, reasonsList)

  // Runner-up hint
  const runnerUpEl = document.createElement('p')
  runnerUpEl.id = 'assignment-runner-up'

  // Footer
  const footer = document.createElement('div')
  footer.id = 'assignment-result-footer'

  const regenBtn = document.createElement('button')
  regenBtn.id = 'assignment-regen-btn'
  regenBtn.className = 'ghost-btn'
  regenBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M10 2A5 5 0 1 0 11 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M11 2l-1.5 1.5L11 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  <span>Regenerate</span>`

  regenBtn.addEventListener('click', () => {
    hide()
    regenerateCallback?.()
  })

  const confirmBtn = document.createElement('button')
  confirmBtn.id = 'assignment-confirm-btn'
  confirmBtn.className = 'primary-btn'
  confirmBtn.textContent = 'Use this mascot'
  confirmBtn.addEventListener('click', () => {
    if (currentResult) confirmCallback?.(currentResult.species)
    hide()
  })

  footer.append(regenBtn, confirmBtn)
  panel.append(header, hero, reasonsSection, runnerUpEl, footer)

  // ---------------------------------------------------------------------------
  // Keyboard
  // ---------------------------------------------------------------------------

  panel.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') hide()
  })

  // ---------------------------------------------------------------------------
  // Show / hide
  // ---------------------------------------------------------------------------

  function show(result: AssignmentResult, _traits: Trait[]) {
    currentResult = result

    // Populate
    emojiEl.textContent = result.emoji
    speciesName.textContent = result.label
    scoreRing.style.setProperty('--score', String(result.score))
    scoreRing.setAttribute('aria-label', `${Math.round(result.score * 100)}% match`)

    // Reasons
    reasonsList.innerHTML = ''
    result.reasons.forEach(reason => {
      const li = document.createElement('li')
      li.className = 'assignment-reason'
      li.textContent = reason
      reasonsList.appendChild(li)
    })

    // Runner-up
    if (result.runnerUp) {
      runnerUpEl.textContent =
        `Close match: ${result.runnerUp.label} (${Math.round(result.runnerUp.score * 100)}%)`
      runnerUpEl.style.display = ''
    } else {
      runnerUpEl.style.display = 'none'
    }

    // Animate in
    panel.classList.remove('hidden')
    requestAnimationFrame(() => panel.classList.add('open'))
    closeBtn.focus()
  }

  function hide() {
    panel.classList.remove('open')
    panel.addEventListener('transitionend', () => panel.classList.add('hidden'), { once: true })
  }

  return {
    element: panel,
    show,
    onConfirm:    cb => { confirmCallback = cb },
    onRegenerate: cb => { regenerateCallback = cb },
    destroy: () => panel.remove(),
  }
}
