import { invoke } from '@tauri-apps/api/core'
import { listen }  from '@tauri-apps/api/event'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PermissionState = 'notDetermined' | 'authorized' | 'denied' | 'restricted'
type MascotState     = 'idle' | 'attentive' | 'listening' | 'speaking' | 'happy' | 'tired'

interface HeadPose    { yaw: number; pitch: number; roll: number }
interface TrackerFrame {
  face_detected: boolean
  head_pose:     HeadPose
  blink:         number
  smile:         number
  mouth_open:    number
}

interface MascotProfile {
  name:       string
  last_state: MascotState
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMOJI: Record<MascotState, string> = {
  idle:      '◕‿◕',
  attentive: '◉‿◉',
  listening: '◕_◕',
  speaking:  '◕◡◕',
  happy:     '◕ᴗ◕',
  tired:     '◔_◔',
}

// Minimum milliseconds a state must be suggested before committing to it.
// Prevents rapid flicker between adjacent states.
const STATE_HOLD_MS = 400

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const mascotCard    = document.getElementById('mascot-card')!
const mascotFace    = document.getElementById('mascot-face')!
const mascotLabel   = document.getElementById('mascot-state')!
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

// ---------------------------------------------------------------------------
// Mascot state machine with hysteresis
// ---------------------------------------------------------------------------

let currentState:   MascotState = 'idle'
let pendingState:   MascotState = 'idle'
let pendingSince:   number      = 0
let stateFlushTimer: ReturnType<typeof setTimeout> | null = null

function applyMascotState(s: MascotState) {
  if (s === currentState) return
  currentState = s

  // Drive state-specific CSS on both elements
  mascotCard.dataset.state = s
  mascotFace.dataset.state = s
  mascotFace.classList.remove('state-enter')
  void mascotFace.offsetWidth  // force reflow to restart animation
  mascotFace.classList.add('state-enter')

  mascotFace.textContent  = EMOJI[s]
  mascotLabel.textContent = s

  // Persist to Rust (fire-and-forget; state is cosmetic, loss is acceptable)
  invoke('set_mascot_state', { state: s }).catch(() => {})
}

function proposeMascotState(next: MascotState) {
  if (next === currentState) {
    pendingState = next
    return
  }
  if (next !== pendingState) {
    pendingState = next
    pendingSince = performance.now()
  }
  // Only commit after the candidate has been stable for STATE_HOLD_MS
  if (performance.now() - pendingSince >= STATE_HOLD_MS) {
    applyMascotState(next)
  } else if (!stateFlushTimer) {
    const remaining = STATE_HOLD_MS - (performance.now() - pendingSince)
    stateFlushTimer = setTimeout(() => {
      stateFlushTimer = null
      applyMascotState(pendingState)
    }, remaining)
  }
}

function frameToMascotState(f: TrackerFrame): MascotState {
  if (!f.face_detected) return 'idle'
  if (f.blink      > 0.75) return 'tired'
  if (f.smile      > 0.55) return 'happy'
  if (f.mouth_open > 0.45) return 'speaking'
  if (f.mouth_open > 0.18) return 'listening'
  const moved = Math.abs(f.head_pose.yaw) + Math.abs(f.head_pose.pitch)
  if (moved > 12) return 'attentive'
  return 'idle'
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
  if (state === 'authorized') cameraStatus.classList.add('authorized')
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
  if (status === 'active') trackerStatus.className = 'setting-value authorized'
  else if (status === 'error') trackerStatus.className = 'setting-value denied'
  else trackerStatus.className = 'setting-value'
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
    setTrackerDot('inactive') // running but waiting for face

    await listen<TrackerFrame>('tracker:frame', (event) => {
      const f = event.payload
      setTrackerDot(f.face_detected ? 'active' : 'inactive')
      proposeMascotState(frameToMascotState(f))
      updateDebug(f)
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

async function init() {
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

  // Restore last known state from profile
  try {
    const profile = await invoke<MascotProfile>('get_mascot_state')
    applyMascotState(profile.last_state)
  } catch {
    applyMascotState('idle')
  }

  const state = await readPermissionState()
  renderCameraUI(state)

  if (state === 'notDetermined') {
    setTimeout(openSettings, 500)
  } else if (state === 'authorized') {
    startTracker()
  }
}

init()
