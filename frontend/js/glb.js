// GLB → editable wall segments. Parses a glTF/GLB with three.js, keeps the
// near-vertical surfaces (walls), projects them top-down onto the XZ plane,
// removes triangulation diagonals, merges collinear runs into real wall lines,
// and returns segments in canvas pixels at a fixed real-world scale (so the
// resulting plan_walls carry actual measurements).
//
// three + three/addons resolve via the import map in index.html; loaded on demand.
let THREE, GLTFLoader;

async function ensureThree() {
  if (THREE) return;
  THREE = await import('three');
  ({ GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js'));
}

const round3 = (v) => Math.round(v * 1000) / 1000;

// Merge collinear, overlapping/touching segments into maximal runs.
// Input/return: [[x1,y1,x2,y2], ...] in metres.
export function mergeCollinear(segs, snap) {
  const groups = new Map();
  for (const [x1, y1, x2, y2] of segs) {
    let dx = x2 - x1, dy = y2 - y1;
    const L = Math.hypot(dx, dy);
    if (L < 1e-9) continue;
    dx /= L; dy /= L;
    if (dx < 0 || (Math.abs(dx) < 1e-9 && dy < 0)) { dx = -dx; dy = -dy; } // canonical dir
    const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 180)); // 1° buckets
    const perp = Math.round((-dy * x1 + dx * y1) / snap);          // distance from origin
    const key = angle + ':' + perp;
    let g = groups.get(key);
    if (!g) { g = { dx, dy, x1, y1, t0: x1 * dx + y1 * dy, ints: [] }; groups.set(key, g); }
    const ta = x1 * g.dx + y1 * g.dy, tb = x2 * g.dx + y2 * g.dy;
    g.ints.push([Math.min(ta, tb), Math.max(ta, tb)]);
  }
  const out = [];
  const gap = snap * 1.5;
  for (const g of groups.values()) {
    g.ints.sort((a, b) => a[0] - b[0]);
    let [cs, ce] = g.ints[0];
    for (let i = 1; i < g.ints.length; i++) {
      const [s, e] = g.ints[i];
      if (s <= ce + gap) ce = Math.max(ce, e);
      else { out.push(seg(g, cs, ce)); cs = s; ce = e; }
    }
    out.push(seg(g, cs, ce));
  }
  return out;
  function seg(g, ta, tb) {
    return [
      g.x1 + (ta - g.t0) * g.dx, g.y1 + (ta - g.t0) * g.dy,
      g.x1 + (tb - g.t0) * g.dx, g.y1 + (tb - g.t0) * g.dy,
    ];
  }
}

// Convert a GLB to editable wall segments, preserving the model's layout.
// Keeps EVERY vertical-surface edge (the projection that looked correct),
// projects top-down, fits uniformly into the canvas (so proportions/shape are
// faithful), then merges collinear fragments to keep the wall count sane.
// Returns { walls: [{x1,y1,x2,y2}], scale } where scale is px-per-model-unit
// (≈ px per metre for a metric model) so dimensions read as real measurements.
export async function glbToWalls(url, targetW, targetH, opts = {}) {
  await ensureThree();
  const margin = opts.margin ?? 40;
  const gltf = await new Promise((res, rej) => new GLTFLoader().load(url, res, undefined, rej));
  const root = gltf.scene;
  root.updateMatrixWorld(true);

  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
  const ab = new THREE.Vector3(), cb = new THREE.Vector3(), n = new THREE.Vector3();

  // Dedupe undirected edges in model space; keep them all (no boundary filter —
  // that is what scrambled the layout previously).
  const seen = new Set();
  const raw = [];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  const add = (x1, z1, x2, z2) => {
    if (x1 === x2 && z1 === z2) return;
    const a = `${round3(x1)},${round3(z1)}`, b = `${round3(x2)},${round3(z2)}`;
    const key = a < b ? a + '|' + b : b + '|' + a;
    if (seen.has(key)) return;
    seen.add(key);
    raw.push([x1, z1, x2, z2]);
    minX = Math.min(minX, x1, x2); maxX = Math.max(maxX, x1, x2);
    minZ = Math.min(minZ, z1, z2); maxZ = Math.max(maxZ, z1, z2);
  };

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
      if (Math.abs(n.y) > 0.5) continue; // keep walls, drop floors/ceilings
      add(vA.x, vA.z, vB.x, vB.z); add(vB.x, vB.z, vC.x, vC.z); add(vC.x, vC.z, vA.x, vA.z);
    }
  });

  if (!raw.length || !isFinite(minX)) return { walls: [], scale: null };

  // Uniform fit-to-canvas (same transform as the known-good drawing).
  const spanX = Math.max(1e-6, maxX - minX);
  const spanZ = Math.max(1e-6, maxZ - minZ);
  const scale = Math.min((targetW - 2 * margin) / spanX, (targetH - 2 * margin) / spanZ);
  const offX = (targetW - spanX * scale) / 2;
  const offY = (targetH - spanZ * scale) / 2;
  const fit = ([x1, z1, x2, z2]) => [
    Math.round((x1 - minX) * scale + offX), Math.round((z1 - minZ) * scale + offY),
    Math.round((x2 - minX) * scale + offX), Math.round((z2 - minZ) * scale + offY),
  ];
  const fitted = raw.map(fit).filter((s) => s[0] !== s[2] || s[1] !== s[3]);

  // Merge collinear fragments in pixel space to reduce editable-wall count.
  // Guard: if the merge produces anything outside the canvas, it misbehaved —
  // fall back to the unmerged (guaranteed-correct) segments.
  let out = fitted;
  try {
    const merged = mergeCollinear(fitted, 3);
    const ok = merged.length && merged.every((s) =>
      s.every((v, i) => v >= -20 && v <= (i % 2 === 0 ? targetW : targetH) + 20));
    if (ok) out = merged.map((s) => s.map(Math.round));
  } catch { /* keep fitted */ }

  return { walls: out.map(([x1, y1, x2, y2]) => ({ x1, y1, x2, y2 })), scale };
}
