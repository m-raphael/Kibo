import { invoke } from '@tauri-apps/api/core'
import { listen }  from '@tauri-apps/api/event'
import { inferTraits, assignMascot } from '@cyberpet/mascot-profile'
import type { AssignedSpecies, LlmConfig, MascotProfile } from '@cyberpet/mascot-profile'
import { buildTraitReview } from './components/trait-review.js'
import { buildAssignmentResult } from './components/assignment-result.js'
import {
  type MascotState,
  type TrackerFrame,
  type FacialProfile,
  mapTrackerToState,
  makeHysteresis,
  proposeState,
  ScanAccumulator,
  SCAN_DURATION_MS,
} from '@cyberpet/mascot-core'
import {
  buildMascotSvg, updateMascotState, setPupilOffset,
  buildMascotOrb, updateOrbState, setOrbEyesVisible, setOrbEyeOffset,
  buildMascot3d, MASCOT_LIST, ACCESSORY_LIST, PALETTE_LIST,
} from '@cyberpet/mascot-renderer'
import type { ThreeMascotHandle, MascotId, AccessoryId, PaletteId } from '@cyberpet/mascot-renderer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PermissionState = 'notDetermined' | 'authorized' | 'denied' | 'restricted'
type Theme = 'apple' | 'xiaomi' | 'animal'

interface TauriMascotState {
  name:       string
  last_state: MascotState
}

const STATE_HOLD_MS = 400

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const mascotCard     = document.getElementById('mascot-card')!
const mascotFaceEl   = document.getElementById('mascot-face')!
const mascotLabel    = document.getElementById('mascot-state')!
const mascotSelector = document.getElementById('mascot-selector')!
const traitReviewBtn = document.getElementById('trait-review-btn')!
const trackerDot    = document.getElementById('tracker-dot')!
const settingsBtn   = document.getElementById('settings-btn')!
const settingsPanel = document.getElementById('settings-panel')!
const settingsClose = document.getElementById('settings-close')!
const cameraStatus  = document.getElementById('camera-status')!
const grantBtn      = document.getElementById('grant-btn')!
const trackerStatus = document.getElementById('tracker-status')!
const debugToggle   = document.getElementById('debug-toggle')!
const debugChevron  = document.getElementById('debug-chevron')!
const debugLabel    = document.getElementById('debug-toggle-label')!
const debugPanel    = document.getElementById('debug-panel')!
const dFace  = document.getElementById('d-face')!
const dYaw   = document.getElementById('d-yaw')!
const dPitch = document.getElementById('d-pitch')!
const dBlink = document.getElementById('d-blink')!
const dSmile = document.getElementById('d-smile')!
const dMouth = document.getElementById('d-mouth')!
// AI assignment
const aiToggle      = document.getElementById('ai-toggle')!
const aiChevron     = document.getElementById('ai-chevron')!
const aiToggleLabel = document.getElementById('ai-toggle-label')!
const aiBadge       = document.getElementById('ai-badge')!
const aiConfigPanel = document.getElementById('ai-config-panel')!
const aiProvider    = document.getElementById('ai-provider') as HTMLSelectElement
const aiKeyInput    = document.getElementById('ai-key') as HTMLInputElement
const aiSaveBtn     = document.getElementById('ai-save')!
const aiClearBtn    = document.getElementById('ai-clear')!
// Palette picker
const palettePanel    = document.getElementById('palette-panel')!
const paletteClose    = document.getElementById('palette-close')!
const paletteSwatches = document.getElementById('palette-swatches')!
const paletteBtn      = document.getElementById('palette-btn')!
// Accessory picker
const accessoryPanel = document.getElementById('accessory-panel')!
const accessoryClose = document.getElementById('accessory-close')!
const accessoryGrid  = document.getElementById('accessory-grid')!
const accessoryBtn   = document.getElementById('accessory-btn')!
// Onboarding
const onboarding    = document.getElementById('onboarding')!
const onboardStart  = document.getElementById('onboard-start')!
const onboardSkip   = document.getElementById('onboard-skip')!
// Scan overlay
const scanOverlay   = document.getElementById('scan-overlay')!
const scanRingFill  = document.getElementById('scan-ring-fill')!
const scanFaceDot   = document.getElementById('scan-face-dot')!
const scanLabel     = document.getElementById('scan-label')!
const scanCancelBtn = document.getElementById('scan-cancel')!

// ---------------------------------------------------------------------------
// Theme detection
// ---------------------------------------------------------------------------

const THEME: Theme = (mascotCard.dataset.theme as Theme) ?? 'apple'

// ---------------------------------------------------------------------------
// Mascot renderer — initialised once, either SVG (Apple) or Orb (Xiaomi)
// ---------------------------------------------------------------------------

let mascotSvg: SVGSVGElement    | null = null
let mascotOrb: HTMLElement       | null = null
let mascot3d: ThreeMascotHandle  | null = null

let pupilDx = 0
let pupilDy = 0
const PUPIL_LERP = 0.25

function initMascotRenderer() {
  if (THEME === 'xiaomi' || THEME === 'animal') {
    const h = buildMascot3d(mascotFaceEl)
    mascot3d = h
    mascotFaceEl.textContent = ''
    mascotFaceEl.appendChild(h.element)
    // URL param override → localStorage → default 'cat'
    const urlMascot = new URLSearchParams(location.search).get('mascot') as MascotId | null
    const saved = urlMascot ?? savedMascotId()
    if (saved !== 'cat') h.setMascot(saved)
    buildSelectorUI(saved)
  } else {
    const svg = buildMascotSvg()
    mascotSvg = svg
    mascotFaceEl.replaceWith(svg)
  }
}

function updatePupils(frame: TrackerFrame) {
  if (!frame.face_detected) {
    pupilDx = pupilDx * (1 - PUPIL_LERP)
    pupilDy = pupilDy * (1 - PUPIL_LERP)
  } else {
    const targetDx = (frame.head_pose.yaw   / 28) * 3
    const targetDy = (frame.head_pose.pitch / 22) * -2.5
    pupilDx = pupilDx + (targetDx - pupilDx) * PUPIL_LERP
    pupilDy = pupilDy + (targetDy - pupilDy) * PUPIL_LERP
  }

  if (mascot3d) {
    mascot3d.update(undefined, pupilDx, pupilDy, frame.face_detected)
  } else if (mascotOrb) {
    setOrbEyesVisible(mascotOrb, frame.face_detected)
    setOrbEyeOffset(mascotOrb, pupilDx * 2.5, pupilDy * 2)
  } else if (mascotSvg) {
    setPupilOffset(mascotSvg, pupilDx, pupilDy)
  }
}

// ---------------------------------------------------------------------------
// Mascot state machine
// ---------------------------------------------------------------------------

const hysteresis = makeHysteresis(STATE_HOLD_MS)

function applyMascotState(s: MascotState) {
  mascotCard.dataset.state = s

  if (mascot3d) {
    mascot3d.update(s, pupilDx, pupilDy, true)
  } else if (mascotOrb) {
    mascotOrb.classList.remove('state-enter')
    void mascotOrb.getBoundingClientRect()
    mascotOrb.classList.add('state-enter')
    updateOrbState(mascotOrb, s)
  } else if (mascotSvg) {
    mascotSvg.classList.remove('state-enter')
    void mascotSvg.getBoundingClientRect()
    mascotSvg.classList.add('state-enter')
    updateMascotState(mascotSvg, s)
  }

  mascotLabel.textContent = s
  invoke('set_mascot_state', { state: s }).catch(() => {})
}

function proposeMascotState(next: MascotState) {
  proposeState(hysteresis, next, STATE_HOLD_MS, applyMascotState)
}

// ---------------------------------------------------------------------------
// Scan — real FacialProfile accumulation
// ---------------------------------------------------------------------------

const RING_CIRCUMFERENCE = 2 * Math.PI * 38  // matches r=38 in SVG

const accumulator = new ScanAccumulator()
let scanning = false
let scanRafId = 0
let onScanComplete: ((profile: FacialProfile) => void) | null = null

function startScan(onComplete: (profile: FacialProfile) => void) {
  if (scanning) return
  scanning = true
  onScanComplete = onComplete
  accumulator.reset()

  scanOverlay.classList.remove('hidden')
  scanLabel.textContent = 'Look at the camera…'

  function tick() {
    const pct = accumulator.progress()
    const offset = RING_CIRCUMFERENCE * (1 - pct)
    scanRingFill.style.strokeDashoffset = String(offset)

    const secsLeft = Math.ceil((SCAN_DURATION_MS / 1000) * (1 - pct))
    scanLabel.textContent = accumulator.done
      ? 'Done!'
      : pct < 0.05
        ? 'Look at the camera…'
        : `Scanning… ${secsLeft}s left`

    if (accumulator.done) {
      finishScan()
      return
    }
    scanRafId = requestAnimationFrame(tick)
  }

  scanRafId = requestAnimationFrame(tick)
}

function finishScan() {
  scanning = false
  cancelAnimationFrame(scanRafId)
  const profile = accumulator.result()

  // brief "Done" flash then hide
  setTimeout(() => {
    scanOverlay.classList.add('hidden')
    scanRingFill.style.strokeDashoffset = String(RING_CIRCUMFERENCE)
    onScanComplete?.(profile)
    onScanComplete = null
  }, 600)
}

function cancelScan() {
  scanning = false
  accumulator.stop()
  cancelAnimationFrame(scanRafId)
  scanOverlay.classList.add('hidden')
  scanRingFill.style.strokeDashoffset = String(RING_CIRCUMFERENCE)
  onScanComplete = null
}

// ---------------------------------------------------------------------------
// Onboarding — Task 1
// ---------------------------------------------------------------------------

function showOnboarding() {
  onboarding.classList.remove('hidden')
  requestAnimationFrame(() => onboarding.classList.add('visible'))
  onboardStart.focus()
}

function hideOnboarding() {
  onboarding.classList.remove('visible')
  onboarding.addEventListener('transitionend', () => onboarding.classList.add('hidden'), { once: true })
}

// ---------------------------------------------------------------------------
// Settings panel
// ---------------------------------------------------------------------------

function openSettings() {
  settingsPanel.classList.remove('hidden')
  settingsClose.focus()
}

function closeSettings() {
  settingsPanel.classList.add('hidden')
}

function renderCameraUI(state: PermissionState) {
  const labels: Record<PermissionState, string> = {
    notDetermined: 'Not requested',
    authorized:    'Authorized',
    denied:        'Denied',
    restricted:    'Restricted',
  }
  cameraStatus.textContent = labels[state]
  cameraStatus.className = 'setting-value'
  if (state === 'authorized')  cameraStatus.classList.add('authorized')
  else if (state === 'denied') cameraStatus.classList.add('denied')
  else if (state === 'restricted') cameraStatus.classList.add('restricted')

  grantBtn.classList.add('hidden')
  if (state === 'notDetermined') {
    grantBtn.textContent = 'Grant Access'
    grantBtn.classList.remove('hidden')
  } else if (state === 'denied') {
    grantBtn.textContent = 'Open System Settings'
    grantBtn.classList.remove('hidden')
  }
}

// ---------------------------------------------------------------------------
// Tracker
// ---------------------------------------------------------------------------

function setTrackerDot(status: 'active' | 'inactive' | 'error') {
  trackerDot.className = `tracker-dot ${status}`
  trackerStatus.textContent =
    status === 'active' ? 'Running' : status === 'error' ? 'Error' : 'Stopped'
  if (status === 'active')      trackerStatus.className = 'setting-value authorized'
  else if (status === 'error')  trackerStatus.className = 'setting-value denied'
  else                          trackerStatus.className = 'setting-value'
}

function updateDebug(f: TrackerFrame) {
  dFace.textContent  = f.face_detected ? 'yes' : 'no'
  dYaw.textContent   = f.head_pose.yaw.toFixed(1) + '°'
  dPitch.textContent = f.head_pose.pitch.toFixed(1) + '°'
  dBlink.textContent = f.blink.toFixed(2)
  dSmile.textContent = f.smile.toFixed(2)
  dMouth.textContent = f.mouth_open.toFixed(2)
}

async function startTracker() {
  try {
    await invoke('start_tracker')
    setTrackerDot('inactive')

    await listen<TrackerFrame>('tracker:frame', (event) => {
      const f     = event.payload
      const state = mapTrackerToState(f)
      setTrackerDot(f.face_detected ? 'active' : 'inactive')
      proposeMascotState(state)
      updatePupils(f)
      updateDebug(f)

      // Feed scan accumulator when a scan is in progress
      if (scanning) {
        accumulator.push(f, state)
        scanFaceDot.classList.toggle('detected', f.face_detected)
      }
    })

    await listen<string>('tracker:error', (event) => {
      setTrackerDot('error')
      console.warn('tracker error:', event.payload)
    })
  } catch (err) {
    setTrackerDot('error')
    console.warn('start_tracker failed:', err)
  }
}

// ---------------------------------------------------------------------------
// Permission flow
// ---------------------------------------------------------------------------

async function readPermissionState(): Promise<PermissionState> {
  const stored = await invoke<PermissionState>('get_permission_state')
  try {
    const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
    const fromApi: PermissionState =
      result.state === 'granted' ? 'authorized'
      : result.state === 'denied' ? 'denied'
      : 'notDetermined'
    if (fromApi !== 'notDetermined') {
      await invoke('store_permission_state', { state: fromApi })
      return fromApi
    }
  } catch {
    // Permissions API not available — fall back to stored value
  }
  return stored
}

async function requestCamera() {
  grantBtn.textContent = 'Requesting…'
  grantBtn.setAttribute('disabled', 'true')
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    stream.getTracks().forEach(t => t.stop())
    await invoke('store_permission_state', { state: 'authorized' })
    renderCameraUI('authorized')
    setTimeout(closeSettings, 500)
    startTracker()
  } catch (err) {
    const state: PermissionState =
      (err as DOMException).name === 'NotAllowedError' ? 'denied' : 'notDetermined'
    await invoke('store_permission_state', { state })
    renderCameraUI(state)
  } finally {
    grantBtn.removeAttribute('disabled')
  }
}

// ---------------------------------------------------------------------------
// Debug panel toggle
// ---------------------------------------------------------------------------

let debugOpen = false

function toggleDebug() {
  debugOpen = !debugOpen
  debugPanel.classList.toggle('hidden', !debugOpen)
  debugChevron.classList.toggle('open', debugOpen)
  debugLabel.textContent = debugOpen ? 'Hide debug' : 'Show debug'
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// AI config — Tasks 11/12
// ---------------------------------------------------------------------------

const AI_KEY_STORE      = 'cyberpet:ai-key'
const AI_PROVIDER_STORE = 'cyberpet:ai-provider'

function loadLlmConfig(): LlmConfig | null {
  const key      = localStorage.getItem(AI_KEY_STORE)
  const provider = (localStorage.getItem(AI_PROVIDER_STORE) ?? 'nvidia-nim') as LlmConfig['provider']
  if (!key) return null
  return { provider, apiKey: key }
}

let aiPanelOpen = false

function initAiSection() {
  const saved = loadLlmConfig()
  if (saved) {
    aiProvider.value = saved.provider
    aiBadge.textContent = 'ON'
    aiBadge.classList.remove('hidden')
  }

  aiToggle.addEventListener('click', () => {
    aiPanelOpen = !aiPanelOpen
    aiConfigPanel.classList.toggle('hidden', !aiPanelOpen)
    aiChevron.classList.toggle('open', aiPanelOpen)
    if (aiPanelOpen) aiKeyInput.value = ''  // clear mask when opening
  })

  aiSaveBtn.addEventListener('click', () => {
    const key = aiKeyInput.value.trim()
    if (!key) return
    localStorage.setItem(AI_KEY_STORE, key)
    localStorage.setItem(AI_PROVIDER_STORE, aiProvider.value)
    aiBadge.textContent = 'ON'
    aiBadge.classList.remove('hidden')
    aiKeyInput.value = ''
    aiPanelOpen = false
    aiConfigPanel.classList.add('hidden')
    aiChevron.classList.remove('open')
  })

  aiClearBtn.addEventListener('click', () => {
    localStorage.removeItem(AI_KEY_STORE)
    localStorage.removeItem(AI_PROVIDER_STORE)
    aiKeyInput.value = ''
    aiBadge.classList.add('hidden')
  })
}

// ---------------------------------------------------------------------------
// Trait review
// ---------------------------------------------------------------------------

function initTraitReview() {
  // review/assignment panels are created once; profile is injected after scan
  let reviewHandle = buildTraitReview({ animal: 'cat', traits: [], scannedAt: 0 })
  const assignment = buildAssignmentResult()

  mascotCard.appendChild(reviewHandle.element)
  mascotCard.appendChild(assignment.element)

  function openReviewWith(profile: MascotProfile) {
    // Rebuild chip list with the new profile's traits
    reviewHandle.destroy()
    reviewHandle = buildTraitReview(profile)

    // Rewire save callback
    reviewHandle.onSave((traits, _animal) => {
      const config = loadLlmConfig()
      assignMascot(traits, config).then(result => {
        assignment.show(result, traits)
      })
    })

    // Re-attach regenerate → rescan
    assignment.onRegenerate(() => startScanFlow())

    mascotCard.insertBefore(reviewHandle.element, assignment.element)
    ;(reviewHandle.element as unknown as { show: () => void }).show()
  }

  // Wire assignment confirm — switch live mascot
  assignment.onConfirm((species: AssignedSpecies) => {
    if (mascot3d) mascot3d.setMascot(species)
    localStorage.setItem('cyberpet:mascot-id', species)
    mascotSelector.querySelectorAll<HTMLButtonElement>('.mascot-pill').forEach(p => {
      const active = p.dataset.id === species
      p.dataset.active = String(active)
      p.setAttribute('aria-pressed', String(active))
    })
  })

  assignment.onRegenerate(() => startScanFlow())

  function startScanFlow() {
    closeSettings()
    startScan((facialProfile) => {
      const traits  = inferTraits(facialProfile)
      const profile: MascotProfile = { animal: 'cat', traits, scannedAt: Date.now() }
      openReviewWith(profile)
    })
  }

  // Cancel button
  scanCancelBtn.addEventListener('click', cancelScan)

  // Settings button → trigger scan
  traitReviewBtn.addEventListener('click', startScanFlow)
}

// ---------------------------------------------------------------------------
// Palette picker — Task 15
// ---------------------------------------------------------------------------

const PALETTE_STORAGE_KEY = 'cyberpet:palette-id'

function savedPaletteId(): PaletteId {
  return (localStorage.getItem(PALETTE_STORAGE_KEY) as PaletteId | null) ?? 'original'
}

function openPalettePanel() {
  closeSettings()
  palettePanel.classList.remove('hidden')
  requestAnimationFrame(() => palettePanel.classList.add('open'))
}

function closePalettePanel() {
  palettePanel.classList.remove('open')
  palettePanel.addEventListener('transitionend', () => palettePanel.classList.add('hidden'), { once: true })
}

function initPalettePicker() {
  const active = savedPaletteId()
  if (mascot3d) mascot3d.setPalette(active)

  PALETTE_LIST.forEach(palette => {
    const btn = document.createElement('button')
    btn.className = 'palette-swatch'
    btn.dataset.id = palette.id
    btn.dataset.active = String(palette.id === active)
    btn.setAttribute('aria-label', palette.label)
    btn.setAttribute('aria-pressed', String(palette.id === active))

    const circle = document.createElement('span')
    circle.className = 'swatch-circle'
    circle.style.background = `#${palette.swatch.toString(16).padStart(6, '0')}`

    const label = document.createElement('span')
    label.className = 'swatch-label'
    label.textContent = palette.label

    btn.append(circle, label)
    paletteSwatches.appendChild(btn)
  })

  paletteSwatches.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.palette-swatch')
    if (!btn) return
    const id = btn.dataset.id as PaletteId

    if (mascot3d) mascot3d.setPalette(id)
    localStorage.setItem(PALETTE_STORAGE_KEY, id)

    paletteSwatches.querySelectorAll<HTMLButtonElement>('.palette-swatch').forEach(b => {
      const isActive = b.dataset.id === id
      b.dataset.active = String(isActive)
      b.setAttribute('aria-pressed', String(isActive))
    })
  })

  paletteClose.addEventListener('click', closePalettePanel)
  paletteBtn.addEventListener('click', openPalettePanel)
  palettePanel.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePalettePanel() })
}

// ---------------------------------------------------------------------------
// Accessory picker — Task 14
// ---------------------------------------------------------------------------

const ACCESSORY_STORAGE_KEY = 'cyberpet:accessory-id'

function savedAccessoryId(): AccessoryId | null {
  return localStorage.getItem(ACCESSORY_STORAGE_KEY) as AccessoryId | null
}

function openAccessoryPanel() {
  closeSettings()
  accessoryPanel.classList.remove('hidden')
  requestAnimationFrame(() => accessoryPanel.classList.add('open'))
}

function closeAccessoryPanel() {
  accessoryPanel.classList.remove('open')
  accessoryPanel.addEventListener('transitionend', () => accessoryPanel.classList.add('hidden'), { once: true })
}

function initAccessoryPicker() {
  const active = savedAccessoryId()
  if (active && mascot3d) mascot3d.setAccessory(active)

  // Build "None" + 4 accessory items
  const noneBtn = document.createElement('button')
  noneBtn.className = 'accessory-item'
  noneBtn.dataset.id = 'none'
  noneBtn.dataset.active = String(!active)
  noneBtn.setAttribute('aria-label', 'No accessory')
  noneBtn.innerHTML = `<span class="accessory-emoji">✕</span><span class="accessory-label">None</span>`
  accessoryGrid.appendChild(noneBtn)

  ACCESSORY_LIST.forEach(meta => {
    const btn = document.createElement('button')
    btn.className = 'accessory-item'
    btn.dataset.id = meta.id
    btn.dataset.active = String(meta.id === active)
    btn.setAttribute('aria-label', meta.label)
    btn.innerHTML = `<span class="accessory-emoji">${meta.emoji}</span><span class="accessory-label">${meta.label}</span>`
    accessoryGrid.appendChild(btn)
  })

  accessoryGrid.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.accessory-item')
    if (!btn) return
    const id = btn.dataset.id as AccessoryId | 'none'
    const accessoryId = id === 'none' ? null : id

    if (mascot3d) mascot3d.setAccessory(accessoryId)
    if (accessoryId) localStorage.setItem(ACCESSORY_STORAGE_KEY, accessoryId)
    else localStorage.removeItem(ACCESSORY_STORAGE_KEY)

    accessoryGrid.querySelectorAll<HTMLButtonElement>('.accessory-item').forEach(b => {
      b.dataset.active = String(b.dataset.id === id)
    })
  })

  accessoryClose.addEventListener('click', closeAccessoryPanel)
  accessoryBtn.addEventListener('click', openAccessoryPanel)

  accessoryPanel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAccessoryPanel()
  })
}

async function init() {
  initMascotRenderer()
  initTraitReview()
  initAiSection()
  initPalettePicker()
  initAccessoryPicker()
  settingsBtn.addEventListener('click', openSettings)
  settingsClose.addEventListener('click', closeSettings)
  debugToggle.addEventListener('click', toggleDebug)

  grantBtn.addEventListener('click', () => {
    if (grantBtn.textContent === 'Open System Settings') {
      invoke('open_camera_settings')
    } else {
      requestCamera()
    }
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !settingsPanel.classList.contains('hidden')) {
      closeSettings()
    }
  })

  try {
    const profile = await invoke<TauriMascotState>('get_mascot_state')
    applyMascotState(profile.last_state)
  } catch {
    applyMascotState('idle')
  }

  const state = await readPermissionState()
  renderCameraUI(state)

  // Onboarding button wiring
  onboardStart.addEventListener('click', async () => {
    onboardStart.textContent = 'Requesting…'
    onboardStart.setAttribute('disabled', 'true')
    await requestCamera()
    onboardStart.removeAttribute('disabled')
    const newState = await readPermissionState()
    if (newState === 'authorized') hideOnboarding()
    else onboardStart.textContent = 'Allow Camera & Start'
  })

  onboardSkip.addEventListener('click', hideOnboarding)

  if (state === 'notDetermined') {
    setTimeout(showOnboarding, 300)
  } else if (state === 'authorized') {
    startTracker()
  }
}

// ---------------------------------------------------------------------------
// Mascot selector
// ---------------------------------------------------------------------------

const MASCOT_STORAGE_KEY = 'cyberpet:mascot-id'

function savedMascotId(): MascotId {
  return (localStorage.getItem(MASCOT_STORAGE_KEY) as MascotId | null) ?? 'cat'
}

function buildSelectorUI(activeMascot: MascotId = savedMascotId()) {
  mascotSelector.innerHTML = ''

  MASCOT_LIST.forEach(meta => {
    const btn = document.createElement('button')
    btn.className = 'mascot-pill'
    btn.dataset.id = meta.id
    btn.dataset.active = String(meta.id === activeMascot)
    btn.dataset.locked = String(!meta.available)
    btn.setAttribute('aria-label', meta.label + (meta.available ? '' : ' (coming soon)'))
    btn.setAttribute('aria-pressed', String(meta.id === activeMascot))
    btn.disabled = !meta.available

    const emoji = document.createElement('span')
    emoji.className = 'pill-emoji'
    emoji.textContent = meta.emoji

    const dot = document.createElement('span')
    dot.className = 'pill-dot'
    dot.setAttribute('aria-hidden', 'true')

    btn.append(emoji, dot)
    mascotSelector.append(btn)

    if (!meta.available) return

    btn.addEventListener('click', () => {
      const id = meta.id as MascotId
      if (!mascot3d) return

      mascot3d.setMascot(id)
      localStorage.setItem(MASCOT_STORAGE_KEY, id)

      mascotSelector.querySelectorAll<HTMLButtonElement>('.mascot-pill').forEach(p => {
        const active = p.dataset.id === id
        p.dataset.active = String(active)
        p.setAttribute('aria-pressed', String(active))
      })
    })
  })
}

init()
