// Minimal GLB viewer. Loads three.js (+ loaders/controls) from a CDN as ES
// modules on demand, renders the model with orbit controls. Kept isolated so
// the rest of the app has no 3D dependency until the floor-plan needs it.
// Resolved via the import map in index.html so the addons' bare `three`
// imports share the same module instance.
let THREE, GLTFLoader, OrbitControls;

async function ensureThree() {
  if (THREE) return;
  THREE = await import('three');
  ({ GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js'));
  ({ OrbitControls } = await import('three/addons/controls/OrbitControls.js'));
}

// Mount a GLB at `url` into `container`. Returns a dispose() function.
export async function mountGlb(container, url) {
  await ensureThree();
  container.replaceChildren();
  const w = container.clientWidth || 640;
  const hgt = container.clientHeight || 420;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfdfefe);
  const camera = new THREE.PerspectiveCamera(50, w / hgt, 0.1, 1000);
  camera.position.set(4, 4, 6);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, hgt);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  container.append(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.1));
  const dir = new THREE.DirectionalLight(0xffffff, 1.4);
  dir.position.set(5, 10, 7);
  scene.add(dir);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  new GLTFLoader().load(url, (gltf) => {
    const model = gltf.scene;
    // center + frame the model
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    camera.position.set(maxDim * 1.4, maxDim * 1.2, maxDim * 1.8);
    controls.target.set(0, 0, 0);
    scene.add(model);
  });

  let raf;
  const loop = () => { raf = requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); };
  loop();

  const onResize = () => {
    const nw = container.clientWidth, nh = container.clientHeight || hgt;
    camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh);
  };
  window.addEventListener('resize', onResize);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    renderer.dispose();
    container.replaceChildren();
  };
}
