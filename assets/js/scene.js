// Scène 3D BETAT-IC : terrain en courbes de niveau, ossature de bâtiment qui se monte,
// grue, et anneaux segmentés repris du symbole du logo. Tout est généré par le code.
import * as THREE from '../vendor/three.module.min.js';

const C = { green: 0x089048, green2: 0x12c468, blue: 0x1878b8, sky: 0x48a0d0, yellow: 0xf8d838, white: 0xffffff };

const terrainVert = /* glsl */ `
uniform float uTime; uniform vec3 uPad;
varying float vH; varying vec2 vP;
float relief(vec2 p){
  float t = uTime * .06;
  float v = sin(p.x*.22 + t) * cos(p.y*.19 - t*.7) * 1.55
          + sin(p.x*.50 + p.y*.34 + t*1.3) * .55
          + cos(p.y*.83 - p.x*.21) * .28
          + sin((p.x + p.y) * 1.3) * .07;
  float flatten = smoothstep(uPad.z, uPad.z + 7.5, length(p - uPad.xy));
  return v * flatten;
}
void main(){
  vec3 p = position; vP = p.xz;
  p.y = relief(p.xz); vH = p.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
}`;

const terrainFrag = /* glsl */ `
precision highp float;
uniform vec3 uLow, uHigh, uMajor; uniform float uOpacity; uniform vec2 uCenter;
varying float vH; varying vec2 vP;
void main(){
  float f = vH * 3.2 + .37;
  float l = abs(fract(f - .5) - .5) / max(fwidth(f), 1e-4);
  float line = 1. - smoothstep(0., 1.5, l);
  float f2 = vH * .8 + .37;
  float l2 = abs(fract(f2 - .5) - .5) / max(fwidth(f2), 1e-4);
  float major = 1. - smoothstep(0., 2.2, l2);
  vec2 g = abs(fract(vP / 2.5 - .5) - .5) / fwidth(vP / 2.5);
  float grid = (1. - min(min(g.x, g.y), 1.)) * .13;
  vec3 col = mix(uLow, uHigh, smoothstep(-1.4, 1.9, vH));
  col = mix(col, uMajor, major * .55);
  float fade = 1. - smoothstep(11., 33., length(vP - uCenter));
  float a = (line * .78 + major * .9 + grid * 1.5) * fade * uOpacity;
  if (a < .004) discard;
  gl_FragColor = vec4(col, a);
}`;

function lines(points, color, opacity = 1) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
}

function arc(radius, tube, degrees, color, opacity = 1) {
  const m = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 10, Math.max(24, Math.round(degrees * .7)), THREE.MathUtils.degToRad(degrees)),
    new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 })
  );
  return m;
}

// Les cinq arcs du symbole, dans un groupe (plan XY, rayon extérieur ~ 1).
function logoRings(opacity = 1, thin = 1) {
  const g = new THREE.Group();
  const defs = [
    [1, .105, 165, C.blue, 55], [.71, .15, 180, C.green, 115], [1, .105, 70, C.yellow, 228],
    [.74, .07, 48, C.sky, 300], [1.05, .045, 36, C.white, 304],
  ];
  defs.forEach(([r, t, deg, col, start]) => {
    const a = arc(r, t * thin, deg, col, opacity);
    a.rotation.z = -THREE.MathUtils.degToRad(start + deg);
    g.add(a);
  });
  return g;
}

function building() {
  const nx = 3, nz = 2, floors = 6, bw = 1.18, bd = 1.18, fh = .74;
  const W = nx * bw, D = nz * bd, x0 = -W / 2, z0 = -D / 2;
  const pts = [];
  const slabs = new THREE.Group();
  for (let f = 0; f < floors; f++) {
    const y0 = f * fh, y1 = y0 + fh;
    for (let i = 0; i <= nx; i++) for (let k = 0; k <= nz; k++) pts.push(x0 + i * bw, y0, z0 + k * bd, x0 + i * bw, y1, z0 + k * bd);
    for (let k = 0; k <= nz; k++) for (let i = 0; i < nx; i++) pts.push(x0 + i * bw, y1, z0 + k * bd, x0 + (i + 1) * bw, y1, z0 + k * bd);
    for (let i = 0; i <= nx; i++) for (let k = 0; k < nz; k++) pts.push(x0 + i * bw, y1, z0 + k * bd, x0 + i * bw, y1, z0 + (k + 1) * bd);
    // contreventement en croix sur une travée de façade
    pts.push(x0, y0, z0 + D, x0 + bw, y1, z0 + D, x0 + bw, y0, z0 + D, x0, y1, z0 + D);
    const slab = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ color: C.sky, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    slab.rotation.x = -Math.PI / 2; slab.position.y = y1;
    slabs.add(slab);
  }
  const frame = lines(pts, C.white, .92);
  const glow = lines(pts, C.yellow, 1);
  const total = pts.length / 3;
  const perFloor = total / floors;
  // implantation : emprise au sol + piquets
  const m = .7, base = [];
  const rx = [x0 - m, x0 + W + m], rz = [z0 - m, z0 + D + m];
  base.push(rx[0], .01, rz[0], rx[1], .01, rz[0], rx[1], .01, rz[0], rx[1], .01, rz[1], rx[1], .01, rz[1], rx[0], .01, rz[1], rx[0], .01, rz[1], rx[0], .01, rz[0]);
  rx.forEach((x) => rz.forEach((z) => base.push(x, 0, z, x, .45, z)));
  const footprint = lines(base, C.yellow, .75);
  const group = new THREE.Group();
  group.add(footprint, slabs, frame, glow);
  return {
    group, height: floors * fh, W, D,
    set(p) {
      const n = Math.floor(total * p / 2) * 2;
      frame.geometry.setDrawRange(0, n);
      const tail = Math.min(n, 16);
      glow.geometry.setDrawRange(n - tail, p >= 1 ? 0 : tail);
      slabs.children.forEach((s, i) => { s.material.opacity = THREE.MathUtils.clamp((n - (i + 1) * perFloor) / perFloor + 1, 0, 1) * .075; });
      footprint.material.opacity = Math.min(1, p * 6) * .75;
    },
  };
}

function crane(h) {
  const g = new THREE.Group();
  const s = .17, mast = [];
  const corners = [[-s, -s], [s, -s], [s, s], [-s, s]];
  corners.forEach(([x, z]) => mast.push(x, 0, z, x, h, z));
  const step = .46;
  for (let y = 0, i = 0; y < h - .01; y += step, i++) {
    const y1 = Math.min(h, y + step);
    corners.forEach(([x, z], c) => {
      const [nx, nz] = corners[(c + 1) % 4];
      if (i % 2) mast.push(x, y, z, nx, y1, nz); else mast.push(nx, y, nz, x, y1, z);
    });
  }
  g.add(lines(mast, C.yellow, .85));
  const top = new THREE.Group(); top.position.y = h; g.add(top);
  const L = 5.4, B = 1.7, jib = [];
  jib.push(-B, 0, -s, L, 0, -s, -B, 0, s, L, 0, s, -B, .5, 0, L * .55, .5, 0, L * .55, .5, 0, L, 0, 0);
  for (let x = -B, i = 0; x < L * .55; x += .5, i++) jib.push(x, 0, i % 2 ? s : -s, x + .25, .5, 0, x + .25, .5, 0, x + .5, 0, i % 2 ? -s : s);
  jib.push(0, 0, 0, 0, 1.25, 0, 0, 1.25, 0, L * .55, .5, 0, 0, 1.25, 0, -B, .5, 0);
  top.add(lines(jib, C.yellow, .9));
  const weight = new THREE.Mesh(new THREE.BoxGeometry(.5, .42, .5), new THREE.MeshBasicMaterial({ color: C.yellow, transparent: true, opacity: .85 }));
  weight.position.set(-B + .3, -.22, 0); top.add(weight);
  const cable = lines([0, 0, 0, 0, -1, 0], C.white, .7);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(.2, .2, .2), new THREE.MeshBasicMaterial({ color: C.white }));
  const trolley = new THREE.Group(); trolley.add(cable, hook); top.add(trolley);
  return {
    group: g, top,
    update(t) {
      top.rotation.y = Math.sin(t * .13) * .9 + .5;
      const x = 2.4 + Math.sin(t * .31) * 1.5, len = 1.3 + (Math.sin(t * .23) * .5 + .5) * (h * .45);
      trolley.position.x = x; cable.scale.y = len; hook.position.y = -len;
    },
  };
}

export function initScene(canvas, mode = 'home') {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x060d12, 16, 44);
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 140);
  const world = new THREE.Group(); scene.add(world);
  const home = mode === 'home';

  const tUniforms = {
    uTime: { value: 0 }, uPad: { value: new THREE.Vector3(0, 0, home ? 3.4 : -100) }, uCenter: { value: new THREE.Vector2(0, 0) },
    uLow: { value: new THREE.Color(C.blue) }, uHigh: { value: new THREE.Color(C.green2) }, uMajor: { value: new THREE.Color(C.yellow) },
    uOpacity: { value: 0 },
  };
  const tGeo = new THREE.PlaneGeometry(72, 72, 220, 220); tGeo.rotateX(-Math.PI / 2);
  const terrain = new THREE.Mesh(tGeo, new THREE.ShaderMaterial({ uniforms: tUniforms, vertexShader: terrainVert, fragmentShader: terrainFrag, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  terrain.frustumCulled = false;
  world.add(terrain);

  const rings = home ? logoRings(.6, .42) : logoRings();
  let bld = null, crn = null;
  if (home) {
    bld = building(); world.add(bld.group); bld.set(0);
    crn = crane(bld.height + 2.1); crn.group.position.set(-bld.W / 2 - 1.5, 0, bld.D / 2 + 1.1); crn.group.scale.setScalar(0.001); world.add(crn.group);
    rings.scale.setScalar(4.3); rings.rotation.x = -Math.PI / 2; rings.position.y = .04; world.add(rings);
  } else {
    rings.scale.setScalar(3); rings.position.set(0, 3.3, 0); world.add(rings);
  }

  const N = 320, pp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pp[i * 3] = (Math.random() - .5) * 34; pp[i * 3 + 1] = Math.random() * 11; pp[i * 3 + 2] = (Math.random() - .5) * 34; }
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const dust = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: C.sky, size: .055, transparent: true, opacity: .0, depthWrite: false }));
  world.add(dust);

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => { mouse.tx = e.clientX / window.innerWidth - .5; mouse.ty = e.clientY / window.innerHeight - .5; }, { passive: true });

  let w = 0, h = 0, wide = true;
  const host = canvas.parentElement;
  function resize() {
    w = canvas.clientWidth; h = canvas.clientHeight;
    if (!w || !h) return;
    wide = window.innerWidth > 1000;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = wide ? 34 : 40;
    // Grand écran : scène décalée à droite du titre. Mobile : scène centrée dans sa propre zone, au-dessus du texte.
    if (wide) camera.setViewOffset(w, h, -w * (home ? .215 : .26), home ? -h * .03 : 0, w, h);
    else if (home) camera.clearViewOffset();
    else camera.setViewOffset(w, h, -w * .2, h * .12, w, h);
    target.y = home ? (wide ? 2.35 : .9) : 2.6;
    camera.updateProjectionMatrix();
  }
  const target = new THREE.Vector3(0, home ? 2.35 : 2.6, 0);
  new ResizeObserver(resize).observe(canvas); resize();

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

  let start = null;
  const begin = () => { if (start === null) start = performance.now(); };
  if (window.__betatReady) begin(); else window.addEventListener('betat:ready', begin, { once: true });
  setTimeout(begin, 8000);

  const ease = (x) => 1 - Math.pow(1 - x, 3);
  const clock = new THREE.Clock();

  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden || !w) return;
    const t = clock.getElapsedTime();
    const since = start === null ? 0 : (performance.now() - start) / 1000;
    const intro = ease(Math.min(1, since / 2.2));
    const scroll = Math.min(1, Math.max(0, window.scrollY / (host.offsetHeight || 1)));
    mouse.x += (mouse.tx - mouse.x) * .045; mouse.y += (mouse.ty - mouse.y) * .045;

    tUniforms.uTime.value = t;
    tUniforms.uOpacity.value = intro * (1 - scroll * .5);
    dust.material.opacity = intro * .55;
    dust.rotation.y = t * .012; dust.position.y = Math.sin(t * .2) * .3;

    if (home) {
      const p = ease(Math.min(1, Math.max(0, (since - .5) / 5.2)));
      bld.set(p);
      crn.group.scale.setScalar(Math.max(.001, ease(Math.min(1, Math.max(0, (since - .2) / 1.6)))));
      crn.update(t);
      rings.rotation.z = t * .07;
      rings.scale.setScalar((wide ? 4.3 : 3.5) * (.6 + .4 * intro));
    } else {
      rings.rotation.set(Math.sin(t * .25) * .35, t * .22, Math.cos(t * .2) * .2);
      rings.scale.setScalar(3 * (.55 + .45 * intro));
      rings.position.y = 3.3 + Math.sin(t * .5) * .2;
    }

    const ang = (home ? .82 : .5) + mouse.x * .5 + t * .018 + scroll * .7;
    const rad = (home ? (wide ? 17.5 : 23.5) : 15) + (1 - intro) * 9 + scroll * 5;
    const hgt = (home ? (wide ? 6.4 : 7.4) : 5.2) - mouse.y * 2.2 + (1 - intro) * 5 + scroll * 5;
    camera.position.set(Math.sin(ang) * rad, hgt, Math.cos(ang) * rad);
    camera.lookAt(target);
    renderer.render(scene, camera);
  }
  frame();
  return { renderer };
}
