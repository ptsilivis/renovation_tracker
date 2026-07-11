// GLB → 2D plan converter. Parses a glTF/GLB with three.js, keeps the near-
// vertical surfaces (walls), projects them straight down onto the XZ plane, and
// returns fitted 2D line segments in canvas coordinates. No 3D rendering.
//
// three + three/addons resolve via the import map in index.html; loaded on demand.
let THREE, GLTFLoader;

async function ensureThree() {
  if (THREE) return;
  THREE = await import('three');
  ({ GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js'));
}

// Returns { segments: [[x1,y1,x2,y2], ...] } fitted into targetW × targetH.
export async function glbToPlan(url, targetW, targetH, margin = 40) {
  await ensureThree();
  const gltf = await new Promise((res, rej) => new GLTFLoader().load(url, res, undefined, rej));
  const root = gltf.scene;
  root.updateMatrixWorld(true);

  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
  const ab = new THREE.Vector3(), cb = new THREE.Vector3(), n = new THREE.Vector3();
  const raw = [];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;

  const track = (x, z) => { if (x < minX) minX = x; if (x > maxX) maxX = x; if (z < minZ) minZ = z; if (z > maxZ) maxZ = z; };

  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const pos = o.geometry.attributes.position;
    if (!pos) return;
    const index = o.geometry.index;
    const tris = index ? index.count / 3 : pos.count / 3;
    for (let ti = 0; ti < tris; ti++) {
      const a = index ? index.getX(ti * 3) : ti * 3;
      const b = index ? index.getX(ti * 3 + 1) : ti * 3 + 1;
      const c = index ? index.getX(ti * 3 + 2) : ti * 3 + 2;
      vA.fromBufferAttribute(pos, a).applyMatrix4(o.matrixWorld);
      vB.fromBufferAttribute(pos, b).applyMatrix4(o.matrixWorld);
      vC.fromBufferAttribute(pos, c).applyMatrix4(o.matrixWorld);
      cb.subVectors(vC, vB); ab.subVectors(vA, vB); n.crossVectors(cb, ab).normalize();
      if (Math.abs(n.y) > 0.5) continue; // skip floors/ceilings, keep walls
      for (const [p, q] of [[vA, vB], [vB, vC], [vC, vA]]) {
        raw.push([p.x, p.z, q.x, q.z]);
        track(p.x, p.z); track(q.x, q.z);
      }
    }
  });

  if (!raw.length || !isFinite(minX)) return { segments: [] };

  const spanX = Math.max(1e-6, maxX - minX);
  const spanZ = Math.max(1e-6, maxZ - minZ);
  const scale = Math.min((targetW - 2 * margin) / spanX, (targetH - 2 * margin) / spanZ);
  const offX = (targetW - spanX * scale) / 2;
  const offY = (targetH - spanZ * scale) / 2;
  const fit = (x, z) => [Math.round((x - minX) * scale + offX), Math.round((z - minZ) * scale + offY)];

  // Fit, round to the pixel grid, drop zero-length, dedupe undirected segments.
  const seen = new Set();
  const segments = [];
  for (const [x1, z1, x2, z2] of raw) {
    const [px1, py1] = fit(x1, z1);
    const [px2, py2] = fit(x2, z2);
    if (px1 === px2 && py1 === py2) continue;
    const pa = `${px1},${py1}`, pb = `${px2},${py2}`;
    const key = pa < pb ? pa + '|' + pb : pb + '|' + pa;
    if (seen.has(key)) continue;
    seen.add(key);
    segments.push([px1, py1, px2, py2]);
  }
  return { segments };
}
