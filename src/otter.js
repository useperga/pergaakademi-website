/*
  Otter Jeksın: Perga Tech Akademi's real-time 3D sea otter guide.

  Built from soft primitives so it ships as code (no model download). Fur and
  the cream face/belly are ONE surface each, coloured per vertex, so there is
  no seam where two meshes cut into each other.

  Behaviour: breathes, blinks, follows the pointer, leans into the scroll
  direction like it is swimming, and when the page rests it rolls onto its
  back and floats (what sea otters actually do). Reactions the page can call:
  lookAt(x, y), wave(), cheer(), worry(on), setVelocity(v), setFloat(on).
*/
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Group,
  Mesh,
  SphereGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  TorusGeometry,
  PlaneGeometry,
  BufferAttribute,
  CanvasTexture,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  MeshBasicMaterial,
  HemisphereLight,
  DirectionalLight,
  PMREMGenerator,
  ACESFilmicToneMapping,
  SRGBColorSpace,
  Color,
  Vector3,
  Quaternion,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const PALETTE = {
  fur: '#5c3520',
  furLight: '#8a6146',
  cream: '#f2e2cc',
  dark: '#251b16',
  scarf: '#8ed462',
  stripe: '#2ba0ff',
  screenA: '#8ed462',
  screenB: '#2ba0ff',
};

function screenTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 180;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 256, 180);
  g.addColorStop(0, PALETTE.screenA);
  g.addColorStop(1, PALETTE.screenB);
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 180);
  // no roundRect: older Safari lacks it
  const pill = (px, py, w, h) => {
    const r = h / 2;
    x.beginPath();
    x.moveTo(px + r, py);
    x.lineTo(px + w - r, py);
    x.arc(px + w - r, py + r, r, -Math.PI / 2, Math.PI / 2);
    x.lineTo(px + r, py + h);
    x.arc(px + r, py + r, r, Math.PI / 2, -Math.PI / 2);
    x.fill();
  };
  x.fillStyle = 'rgba(255,255,255,0.92)';
  pill(22, 22, 120, 18);
  x.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 3; i++) pill(22, 62 + i * 26, 160 - i * 34, 12);
  x.fillStyle = '#ffffff';
  x.beginPath();
  x.arc(208, 128, 24, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = PALETTE.screenB;
  x.beginPath();
  x.moveTo(200, 116);
  x.lineTo(200, 140);
  x.lineTo(220, 128);
  x.closePath();
  x.fill();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(44,46,42,0.28)');
  g.addColorStop(1, 'rgba(44,46,42,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

// Paint a geometry per vertex. weight(x, y, z) returns cream amount 0..1, or
// [cream, lighter-fur] for a second soft gradient.
function paint(geo, weight) {
  const pos = geo.attributes.position;
  const a = new Color(PALETTE.fur);
  const light = new Color(PALETTE.furLight);
  const b = new Color(PALETTE.cream);
  const out = new Float32Array(pos.count * 3);
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const r = weight(pos.getX(i), pos.getY(i), pos.getZ(i));
    const [w, l] = Array.isArray(r) ? r : [r, 0];
    c.copy(a).lerp(light, l).lerp(b, w);
    out[i * 3] = c.r;
    out[i * 3 + 1] = c.g;
    out[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new BufferAttribute(out, 3));
  return geo;
}

const UP = new Vector3(0, 1, 0);
const aim = (from, to) => new Quaternion().setFromUnitVectors(UP, to.clone().sub(from).normalize());

function buildOtter() {
  const furOpts = { roughness: 0.78, sheen: 0.45, sheenRoughness: 0.7, sheenColor: new Color('#e2b48c') };
  const skin = new MeshPhysicalMaterial({ vertexColors: true, ...furOpts });
  const furMat = new MeshPhysicalMaterial({ color: PALETTE.fur, ...furOpts });
  const cream = new MeshPhysicalMaterial({ color: PALETTE.cream, roughness: 0.82 });
  const dark = new MeshStandardMaterial({ color: PALETTE.dark, roughness: 0.4 });
  const eyeMat = new MeshPhysicalMaterial({ color: '#100b08', roughness: 0.08, clearcoat: 1 });
  const white = new MeshBasicMaterial({ color: '#ffffff' });
  const scarf = new MeshPhysicalMaterial({ color: PALETTE.scarf, roughness: 0.92, sheen: 0.8, sheenColor: new Color('#ffffff') });
  const stripe = new MeshPhysicalMaterial({ color: PALETTE.stripe, roughness: 0.9 });
  const whisker = new MeshStandardMaterial({ color: '#f7ecdc', roughness: 0.5 });

  const add = (parent, geo, mat, [x, y, z] = [0, 0, 0], [sx, sy, sz] = [1, 1, 1], [rx, ry, rz] = [0, 0, 0]) => {
    const m = new Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.rotation.set(rx, ry, rz);
    parent.add(m);
    return m;
  };
  const sphere = (r, w = 32, h = 24) => new SphereGeometry(r, w, h);

  const root = new Group(); // stays on the ground
  const pivot = new Group(); // leans the otter, or rolls it onto its back
  pivot.position.y = 1.05;
  root.add(pivot);
  const bodyG = new Group();
  bodyG.position.y = -1.05;
  pivot.add(bodyG);

  // body: one capsule with the cream belly painted in
  const bodyGeo = paint(new CapsuleGeometry(0.58, 0.5, 16, 48), (x, y, z) => {
    const e = (x / 0.44) ** 2 + ((y + 0.02) / 0.6) ** 2;
    return smooth(1.05, 0.7, e) * smooth(0.05, 0.35, z / 0.58);
  });
  add(bodyG, bodyGeo, skin, [0, 0.96, 0], [1.1, 1, 0.95]);
  const tail = add(bodyG, new CapsuleGeometry(0.17, 0.72, 10, 24), furMat, [0, 0.32, -0.58], [1, 1, 0.55], [1.25, 0, 0]);
  add(bodyG, sphere(0.2), furMat, [-0.27, 0.16, 0.2], [1, 0.52, 1.45]);
  add(bodyG, sphere(0.2), furMat, [0.27, 0.16, 0.2], [1, 0.52, 1.45]);

  // scarf
  add(bodyG, new TorusGeometry(0.44, 0.12, 20, 56), scarf, [0, 1.5, 0.02], [1.04, 1, 0.94], [Math.PI / 2 - 0.08, 0, 0]);
  const knot = add(bodyG, new RoundedBoxGeometry(0.2, 0.34, 0.08, 3, 0.04), scarf, [-0.27, 1.3, 0.44], [1, 1, 1], [0.25, 0.1, -0.18]);
  add(knot, new RoundedBoxGeometry(0.205, 0.06, 0.085, 2, 0.02), stripe, [0, -0.08, 0]);

  // head: one sphere with the pale face painted in (sea otters have light heads)
  const head = new Group();
  head.position.set(0, 1.94, 0.04);
  bodyG.add(head);
  const headGeo = paint(new SphereGeometry(0.62, 64, 48), (x, y, z) => {
    const e = (x / 0.5) ** 2 + ((y + 0.06) / 0.44) ** 2;
    const face = smooth(1.05, 0.72, e) * smooth(-0.05, 0.3, z / 0.62);
    const lighter = smooth(-0.2, 0.6, z / 0.62) * 0.55;
    return [face, lighter];
  });
  add(head, headGeo, skin, [0, 0, 0], [1.16, 0.92, 1]);
  add(head, sphere(0.19), cream, [-0.15, -0.17, 0.53]);
  add(head, sphere(0.19), cream, [0.15, -0.17, 0.53]);
  add(head, sphere(0.11), dark, [0, -0.06, 0.66], [1.45, 0.92, 0.9]);
  add(head, sphere(0.03, 12, 8), white, [0.04, -0.03, 0.755]);
  add(head, new TorusGeometry(0.065, 0.014, 8, 20, Math.PI), dark, [0, -0.25, 0.665], [1, 1, 1], [-0.3, 0, Math.PI]);
  const mouth = add(head, sphere(0.055, 16, 12), new MeshStandardMaterial({ color: '#5a2a24', roughness: 0.6 }), [0, -0.29, 0.645], [1.2, 0.05, 0.6]);
  add(head, sphere(0.1), furMat, [-0.64, 0.24, -0.06], [1, 0.8, 0.6]);
  add(head, sphere(0.1), furMat, [0.64, 0.24, -0.06], [1, 0.8, 0.6]);
  const eyes = [];
  for (const s of [-1, 1]) {
    const eye = new Group();
    eye.position.set(s * 0.24, 0.1, 0.53);
    head.add(eye);
    add(eye, sphere(0.088), eyeMat, [0, 0, 0], [1, 1.08, 0.8]);
    add(eye, sphere(0.026, 12, 8), white, [0.03, 0.035, 0.065]);
    add(eye, sphere(0.012, 8, 6), white, [-0.025, -0.03, 0.068]);
    eyes.push(eye);
  }
  const brows = [];
  for (const s of [-1, 1]) {
    brows.push(add(head, new CapsuleGeometry(0.016, 0.09, 4, 8), dark, [s * 0.24, 0.25, 0.52], [1, 1, 1], [0, 0, Math.PI / 2 - s * 0.08]));
  }
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      add(head, new CylinderGeometry(0.008, 0.004, 0.36, 6), whisker, [s * 0.36, -0.15 - i * 0.045, 0.56], [1, 1, 1], [0.1, 0, Math.PI / 2 + s * (i - 1) * 0.14]);
    }
  }

  // tablet, held in front of the belly
  const tablet = new Group();
  tablet.position.set(0, 1.04, 0.66);
  tablet.rotation.set(-0.28, 0, 0);
  bodyG.add(tablet);
  add(tablet, new RoundedBoxGeometry(0.64, 0.46, 0.05, 4, 0.05), dark);
  const screen = new Mesh(new PlaneGeometry(0.56, 0.38), new MeshBasicMaterial({ map: screenTexture(), toneMapped: false }));
  screen.position.z = 0.028;
  tablet.add(screen);

  // arms: shoulder pivots aimed by quaternion so poses blend cleanly
  const ARM = 0.3;
  const makeArm = (side) => {
    const g = new Group();
    g.position.set(side * 0.5, 1.4, 0.12);
    bodyG.add(g);
    add(g, new CapsuleGeometry(0.12, ARM, 8, 20), furMat, [0, ARM / 2 + 0.04, 0]);
    add(g, sphere(0.115), dark, [0, ARM + 0.14, 0.02], [1, 0.9, 0.9]);
    const rest = aim(g.position, new Vector3(side * 0.36, 1.08, 0.66)); // paw on the tablet's edge
    g.quaternion.copy(rest);
    return { g, rest };
  };
  const armL = makeArm(1); // viewer's right: always holds
  const armR = makeArm(-1); // viewer's left: lets go to wave
  armR.wave = aim(armR.g.position, new Vector3(-1.3, 1.95, 0.4)); // up and out, clear of the head
  armL.up = aim(armL.g.position, new Vector3(1.3, 1.95, 0.4));

  const shadow = new Mesh(new PlaneGeometry(2.4, 2.4), new MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  root.add(shadow);

  return { root, pivot, bodyG, head, eyes, brows, armL, armR, tablet, tail, shadow, mouth };
}

export function createOtter(canvas, { reduce = false, facing = -0.25 } = {}) {
  // brand colours come from CSS so each site can dress the otter its own way
  const cs = getComputedStyle(canvas);
  for (const [k, v] of [['scarf', '--otter-scarf'], ['stripe', '--otter-stripe'], ['screenA', '--otter-screen-a'], ['screenB', '--otter-screen-b']]) {
    const val = cs.getPropertyValue(v).trim();
    if (val) PALETTE[k] = val;
  }

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  pmrem.dispose();
  scene.add(new HemisphereLight('#fff6e6', '#8a7458', 0.75));
  const key = new DirectionalLight('#fff3e0', 2.0);
  key.position.set(2.5, 4, 4);
  scene.add(key);
  const rim = new DirectionalLight('#9fd3ff', 1.4);
  rim.position.set(-3, 3, -3);
  scene.add(rim);

  const camera = new PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 1.25, 5.7);
  camera.lookAt(0, 1.12, 0);

  const o = buildOtter();
  scene.add(o.root);

  // ---- state -----------------------------------------------------------
  const target = { yaw: 0, pitch: 0 };
  const cur = { yaw: 0, pitch: 0 };
  let waveUntil = 0;
  let nextBlink = 1.5;
  let blinkStart = -1;
  let cheerStart = -10;
  let worry = 0;
  let worryTarget = 0;
  let vel = 0;
  let velTarget = 0;
  let float = 0;
  let floatTarget = 0;
  let waveW = 0;
  let travelX = 0; // horizontal travel velocity, -1..1 (screen space)
  let travelY = 0;
  let travelTX = 0;
  let travelTY = 0;
  let talking = false;
  let talkW = 0;
  let fidget = 0; // which idle action is playing
  let fidgetStart = -10;
  let nextFidget = 6;
  let facingNow = facing;
  // tricks: jump, spin, flip, dance (+ a squash when he lands)
  let trick = null;
  let trickStart = -10;
  let landStart = -10;
  let held = false;
  let heldW = 0;
  const TRICK_DUR = { jump: 0.85, spin: 1.0, flip: 1.05, dance: 2.4 };
  const easeIO = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
  let facingTarget = facing;
  let visible = false;
  let raf = 0;
  let last = performance.now();
  let t = 0;
  const q = new Quaternion();
  const qSwing = new Quaternion();
  const FWD = new Vector3(0, 0, 1);

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!raf) renderer.render(scene, camera);
  }

  function step(dt) {
    t += dt;
    const k = (r) => 1 - Math.exp(-dt * r);
    vel = lerp(vel, velTarget, k(4));
    velTarget = lerp(velTarget, 0, k(2.5));
    float = lerp(float, floatTarget, k(trick || held ? 9 : 1.8)); // tricks spring him upright
    worry = lerp(worry, worryTarget, k(5));

    const breath = Math.sin(t * 1.7);
    o.bodyG.scale.set(1, 1 + breath * 0.012, 1);
    const swell = Math.sin(t * 1.3) * 0.06 * float;

    travelX = lerp(travelX, travelTX, k(5));
    travelY = lerp(travelY, travelTY, k(5));
    travelTX = lerp(travelTX, 0, k(3));
    travelTY = lerp(travelTY, 0, k(3));
    const swim = Math.min(1, Math.hypot(travelX, travelY) * 1.4);
    facingNow = lerp(facingNow, facingTarget, k(3));
    const c = t - cheerStart;
    const hop = c >= 0 && c < 0.9 ? Math.sin((c / 0.9) * Math.PI) : 0;
    let trickY = 0;
    let spinY = 0;
    let flipX = 0;
    let stretch = 0;
    let danceW = 0;
    if (trick) {
      const tp = (t - trickStart) / TRICK_DUR[trick];
      if (tp >= 1) {
        if (trick !== 'dance') landStart = t;
        trick = null;
      } else {
        const arc = Math.sin(tp * Math.PI);
        if (trick === 'jump') {
          trickY = arc * 0.62;
          stretch = arc * 0.14;
        } else if (trick === 'spin') {
          trickY = arc * 0.3;
          spinY = easeIO(tp) * Math.PI * 2;
        } else if (trick === 'flip') {
          trickY = arc * 0.8;
          flipX = -easeIO(tp) * Math.PI * 2;
          stretch = arc * 0.06;
        } else if (trick === 'dance') {
          danceW = Math.sin(Math.min(1, tp * 4) * Math.PI * 0.5) * Math.sin(Math.min(1, (1 - tp) * 4) * Math.PI * 0.5);
          trickY = Math.abs(Math.sin(tp * Math.PI * 8)) * 0.12 * danceW;
        }
      }
    }
    const lp = (t - landStart) / 0.32;
    const squash = lp >= 0 && lp < 1 ? Math.sin(lp * Math.PI) : 0;
    o.root.position.y = Math.max(hop * 0.32, trickY);
    o.bodyG.scale.set(1 + squash * 0.12 - stretch * 0.4, (1 + stretch - squash * 0.18) * (1 + breath * 0.012), 1 + squash * 0.12);

    // idle actions: look around, check the tablet, a happy wiggle
    if (t > nextFidget && float < 0.2 && swim < 0.1 && !talking) {
      fidget = 1 + Math.floor(Math.random() * 3);
      fidgetStart = t;
      nextFidget = t + 6 + Math.random() * 5;
    }
    const fp = (t - fidgetStart) / 1.8;
    const fw = fp > 0 && fp < 1 ? Math.sin(fp * Math.PI) : 0;
    let fYaw = 0;
    let fPitch = 0;
    let fRoll = 0;
    if (fidget === 1) fYaw = Math.sin(fp * Math.PI * 2) * 0.6 * fw; // look around
    if (fidget === 2) fPitch = 0.45 * fw; // glance at the tablet
    if (fidget === 3) fRoll = Math.sin(fp * Math.PI * 6) * 0.12 * fw; // wiggle
    o.bodyG.rotation.z = fRoll + Math.sin(t * 6.5) * 0.2 * danceW;
    o.tablet.rotation.x = -0.28 - (fidget === 2 ? 0.35 * fw : 0);

    // talking: the mouth opens and closes, small nods
    talkW = lerp(talkW, talking ? 1 : 0, k(8));
    const chat = talkW * (0.5 + 0.5 * Math.sin(t * 15) * Math.sin(t * 4.3));
    o.mouth.scale.set(1.2, 0.05 + chat * 0.75, 0.6);

    // lean with the scroll and with travel (swimming); roll onto the back when the page rests
    o.pivot.rotation.z = float * 1.32 + Math.sin(t * 1.1) * 0.05 * float - vel * 0.12 - travelX * 0.55;
    o.pivot.rotation.x = (vel * 0.28 + travelY * 0.35) * (1 - float) + swim * 0.25;
    o.pivot.position.y = 1.05 + breath * 0.012 * (1 - float) + float * 0.12 + swell;
    o.pivot.position.x = float * 0.3; // keep the head in frame when lying down
    o.root.scale.setScalar(1 - float * 0.16);
    o.root.rotation.y = facingNow * (1 - float) + cur.yaw * 0.25 + travelX * 0.6 + spinY;
    o.pivot.rotation.x += flipX;
    o.pivot.position.x += Math.sin(t * 6.5) * 0.14 * danceW;

    o.shadow.scale.setScalar((1 - hop * 0.3) * (1 - float * 0.25));
    o.shadow.material.opacity = 1 - float * 0.7;

    cur.yaw = lerp(cur.yaw, target.yaw, k(6));
    cur.pitch = lerp(cur.pitch, target.pitch + vel * 0.15, k(6));
    o.head.rotation.set(
      cur.pitch * (1 - float * 0.6) + fPitch + Math.sin(t * 7) * 0.04 * talkW,
      cur.yaw + fYaw,
      -float * 1.05 + Math.sin(t * 0.9) * 0.03 + worry * 0.12 + travelX * 0.2
    );

    o.tail.rotation.z = Math.sin(t * (3 + Math.abs(vel) * 9 + swim * 10)) * (0.08 + Math.abs(vel) * 0.25 + swim * 0.35);


    const waving = t < waveUntil && float < 0.5;
    waveW = lerp(waveW, waving ? 1 : 0, k(7));
    q.copy(o.armR.rest).slerp(o.armR.wave, waveW);
    qSwing.setFromAxisAngle(FWD, waving ? Math.sin(t * 9) * 0.35 * waveW : 0);
    o.armR.g.quaternion.copy(qSwing).multiply(q);
    if (swim > 0.02 && !waving) {
      const pad = Math.sin(t * 11) * 0.45 * swim;
      qSwing.setFromAxisAngle(FWD, pad);
      o.armR.g.quaternion.premultiply(qSwing);
      qSwing.setFromAxisAngle(FWD, -pad);
      o.armL.g.quaternion.copy(qSwing).multiply(o.armL.rest);
    } else o.armL.g.quaternion.copy(o.armL.rest);
    heldW = lerp(heldW, held ? 1 : 0, k(10));
    const upW = Math.max(heldW, danceW * (0.5 + 0.5 * Math.sin(t * 6.5)));
    const upR = Math.max(heldW, danceW * (0.5 - 0.5 * Math.sin(t * 6.5)));
    if (upW > 0.01) o.armL.g.quaternion.slerp(o.armL.up, upW);
    if (upR > 0.01) {
      q.copy(o.armR.g.quaternion).slerp(o.armR.wave, upR);
      o.armR.g.quaternion.copy(q);
    }

    if (t > nextBlink && blinkStart < 0) blinkStart = t;
    let lid = 1;
    if (blinkStart >= 0) {
      const b = (t - blinkStart) / 0.14;
      lid = b < 1 ? 1 - Math.sin(b * Math.PI) * 0.92 : 1;
      if (b >= 1) {
        blinkStart = -1;
        nextBlink = t + 2.4 + Math.random() * 3;
      }
    }
    o.eyes.forEach((e) => {
      e.scale.y = lid * (1 - float * 0.55) * (1 + heldW * 0.25); // dozing while it floats, wide when held
      e.scale.x = 1 + heldW * 0.15;
    });
    if (heldW > 0.05) o.mouth.scale.set(0.9, Math.max(o.mouth.scale.y, 0.55 * heldW), 0.6);
    o.brows.forEach((b, i) => {
      const s = i === 0 ? -1 : 1;
      b.rotation.z = Math.PI / 2 + s * (-0.08 - worry * 0.5);
      b.position.y = 0.25 + worry * 0.03;
    });
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    renderer.render(scene, camera);
    raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
  }
  function start() {
    if (raf) return;
    if (reduce) {
      step(0);
      renderer.render(scene, camera);
      return;
    }
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function lookAtClient(x, y) {
    const r = canvas.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height * 0.3;
    target.yaw = clamp((x - cx) / (window.innerWidth * 0.5), -1, 1) * 0.55;
    target.pitch = clamp((y - cy) / (window.innerHeight * 0.6), -1, 1) * 0.3;
  }
  if (!reduce) window.addEventListener('pointermove', (e) => lookAtClient(e.clientX, e.clientY), { passive: true });

  new IntersectionObserver(
    ([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was) start();
    },
    { threshold: 0.05 }
  ).observe(canvas);
  document.addEventListener('visibilitychange', () => !document.hidden && visible && start());
  new ResizeObserver(resize).observe(canvas);
  resize();
  if (reduce) {
    step(0);
    renderer.render(scene, camera);
  }

  return {
    lookAt(x, y) {
      lookAtClient(x, y);
      if (reduce) {
        cur.yaw = target.yaw;
        cur.pitch = target.pitch;
      }
      start();
    },
    wave() {
      waveUntil = t + 2.2;
      start();
    },
    cheer() {
      worryTarget = 0;
      floatTarget = 0;
      cheerStart = t;
      waveUntil = t + 2.4;
      start();
    },
    worry(on = true) {
      worryTarget = on ? 1 : 0;
      if (reduce) worry = worryTarget;
      start();
    },
    setVelocity(v) {
      if (reduce) return;
      velTarget = clamp(v, -1, 1);
      if (Math.abs(v) > 0.05) floatTarget = 0;
      start();
    },
    setFloat(on) {
      if (reduce) return;
      floatTarget = on ? 1 : 0;
      start();
    },
    // screen-space travel velocity (from the page moving the otter around)
    setTravel(vx, vy) {
      if (reduce) return;
      travelTX = clamp(vx, -1, 1);
      travelTY = clamp(vy, -1, 1);
      if (Math.abs(vx) + Math.abs(vy) > 0.05) floatTarget = 0;
      start();
    },
    trick(name) {
      if (reduce || held) return;
      const names = Object.keys(TRICK_DUR);
      trick = names.includes(name) ? name : names[Math.floor(Math.random() * names.length)];
      trickStart = t;
      floatTarget = 0;
      if (trick === 'dance' || trick === 'jump') waveUntil = t + 1.2;
      start();
      return trick;
    },
    isFloating() {
      return floatTarget === 1;
    },
    setHeld(on) {
      held = on;
      if (on) {
        floatTarget = 0;
        trick = null;
      } else if (!reduce) landStart = t;
      start();
    },
    talk(on) {
      talking = on;
      if (on) floatTarget = 0;
      start();
    },
    face(f) {
      facingTarget = f;
      start();
    },
  };
}
