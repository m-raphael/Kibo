import { invoke } from '@tauri-apps/api/core'

type PermissionState = 'notDetermined' | 'authorized' | 'denied' | 'restricted'
type MascotState = 'idle' | 'attentive' | 'listening' | 'speaking' | 'happy' | 'tired'

const EMOJI: Record<MascotState, string> = {
  idle:      '◕‿◕',
  attentive: '◉‿◉',
  listening: '◕_◕',
  speaking:  '◕◡◕',
  happy:     '◕ᴗ◕',
  tired:     '◔_◔',
}

const mascotFace  = document.getElementById('mascot-face')!
const mascotLabel = document.getElementById('mascot-state')!
const settingsBtn = document.getElementById('settings-btn')!
const settingsPanel = document.getElementById('settings-panel')!
const settingsClose = document.getElementById('settings-close')!
const cameraStatus  = document.getElementById('camera-status')!
const grantBtn      = document.getElementById('grant-btn')!

function setMascotState(s: MascotState) {
  mascotFace.textContent  = EMOJI[s]
  mascotLabel.textContent = s
}

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

async function readPermissionState(): Promise<PermissionState> {
  const stored = await invoke<PermissionState>('get_permission_state')
  try {
    const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
    const fromApi: PermissionState = result.state === 'granted' ? 'authorized'
      : result.state === 'denied' ? 'denied'
      : 'notDetermined'
    if (fromApi !== 'notDetermined') {
      await invoke('store_permission_state', { state: fromApi })
      return fromApi
    }
  } catch {
    // Permissions API not available — use stored value
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
  } catch (err) {
    const state: PermissionState =
      (err as DOMException).name === 'NotAllowedError' ? 'denied' : 'notDetermined'
    await invoke('store_permission_state', { state })
    renderCameraUI(state)
  } finally {
    grantBtn.removeAttribute('disabled')
  }
}

async function init() {
  settingsBtn.addEventListener('click', openSettings)
  settingsClose.addEventListener('click', closeSettings)
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

  const state = await readPermissionState()
  renderCameraUI(state)

  if (state === 'notDetermined') {
    setTimeout(openSettings, 500)
  }

  setMascotState('idle')
}

init()
