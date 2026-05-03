import * as THREE from 'three'

export interface ThreeSceneHandle {
  scene:    THREE.Scene
  camera:   THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  group:    THREE.Group
  canvas:   HTMLCanvasElement
  dispose:  () => void
}

export function initThreeScene(container: HTMLElement): ThreeSceneHandle {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
  })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)

  const canvas = renderer.domElement

  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(40, 1, 1, 20)
  camera.position.set(0, 0.4, 6)
  camera.lookAt(0, 0.2, 0)

  const ambient = new THREE.AmbientLight(0xffffff, 0.65)
  scene.add(ambient)

  const mainLight = new THREE.DirectionalLight(0xffffff, 1.2)
  mainLight.position.set(3, 5, 4)
  scene.add(mainLight)

  const fillLight = new THREE.DirectionalLight(0x8888ff, 0.35)
  fillLight.position.set(-3, 1, 2)
  scene.add(fillLight)

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.5)
  rimLight.position.set(0, -2, -4)
  scene.add(rimLight)

  const group = new THREE.Group()
  scene.add(group)

  function resize() {
    const w = container.clientWidth || 200
    const h = container.clientHeight || 200
    const s = Math.max(w, h)
    renderer.setSize(s, s, false)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    camera.aspect = 1
    camera.updateProjectionMatrix()
  }

  const ro = new ResizeObserver(resize)
  ro.observe(container)
  resize()

  return {
    scene, camera, renderer, group, canvas,
    dispose: () => {
      ro.disconnect()
      renderer.dispose()
      scene.clear()
    },
  }
}
