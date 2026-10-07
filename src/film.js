/*
  Procedural hero film: Apollonios of Perga's conic sections.

  render(t) is a pure function of film time t (seconds), so the scroll can
  scrub it forward and backward exactly like a video. The only thing outside
  the timeline is a very slow ambient drift, so the frame never freezes dead.

  Scenes (keep in sync with story.js):
    -1.2 .. 0    a beam of light draws itself
     0   .. 2.4  the beam opens into a double cone of hairlines
     2.6 .. 5.6  a plane descends and cuts it: circle, then ellipse
     5.6 .. 8.4  the plane tilts: parabola, then hyperbola; a spark rides the curve
     8.5 .. 11   orbits of every eccentricity gather around one focus
    11   .. 12   light floods the frame into the page colour
*/

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sm = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Jeksın's sea: aqua -> kelp -> coral, with sunlight from above.
const PAL = [
  [96, 216, 214],
  [124, 196, 106],
  [255, 138, 107],
];
const CREAM = [247, 241, 230];
const YELLOW = [255, 214, 107];
function pal(u) {
  u = clamp(u, 0, 1) * (PAL.length - 1);
  const i = Math.min(PAL.length - 2, Math.floor(u));
  const f = u - i;
  const a = PAL[i];
  const b = PAL[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a, 0, 1).toFixed(3)})`;

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createFilm(canvas, { mobile = false } = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const bg = document.createElement('canvas');
  const bgx = bg.getContext('2d');

  const H = 1.4; // half height of the double cone
  const GEN = mobile ? 30 : 52; // generator lines
  const CURVE_N = mobile ? 160 : 240;
  const ORBIT_N = mobile ? 10 : 16;
  const ORBIT_SEG = mobile ? 72 : 110;
  const DUST_N = mobile ? 50 : 110;

  const rand = rng(1957);
  const orbits = Array.from({ length: ORBIT_N }, (_, i) => {
    const a = lerp(0.55, mobile ? 1.55 : 1.95, i / (ORBIT_N - 1)) * lerp(0.85, 1.1, rand());
    const e = lerp(0.12, 0.78, rand());
    return {
      a,
      b: a * Math.sqrt(1 - e * e),
      c: a * e, // focus offset: every orbit shares the focus at the origin
      psi: rand() * TAU,
      inc: lerp(-0.55, 0.55, rand()),
      s0: rand() * TAU,
      w: lerp(0.35, 0.95, rand()) * (rand() > 0.5 ? 1 : -1),
      col: pal(i / (ORBIT_N - 1)),
    };
  });
  const dust = Array.from({ length: DUST_N }, () => {
    const r = lerp(1.2, 4.2, Math.sqrt(rand()));
    const th = rand() * TAU;
    const ph = Math.acos(lerp(-1, 1, rand()));
    return [r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.7, r * Math.sin(ph) * Math.sin(th), rand()];
  });

  let w = 1;
  let h = 1;
  let dpr = 1;
  let flood = '#f7f2e9';
  let night = '#123540';

  // camera state, rebuilt each frame
  let cyaw = 1;
  let syaw = 0;
  let cpit = 1;
  let spit = 0;
  let dist = 3.2;
  let fov = 400;
  let ox = 0;
  let oy = 0;
  const P = [0, 0, 0];
  const Q = [0, 0, 0];

  function project(x, y, z, out) {
    const x1 = x * cyaw + z * syaw;
    const z1 = -x * syaw + z * cyaw;
    const y2 = y * cpit - z1 * spit;
    const z2 = y * spit + z1 * cpit;
    const s = fov / (z2 + dist);
    out[0] = ox + x1 * s;
    out[1] = oy - y2 * s;
    out[2] = z2;
    return out;
  }

  function resize() {
    const cs = getComputedStyle(document.documentElement);
    flood = cs.getPropertyValue('--canvas').trim() || flood;
    night = cs.getPropertyValue('--night').trim() || night;
    dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    w = Math.max(1, canvas.clientWidth);
    h = Math.max(1, canvas.clientHeight);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    bg.width = canvas.width;
    bg.height = canvas.height;
    bgx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = bgx.createRadialGradient(w * 0.55, h * 0.45, 0, w * 0.55, h * 0.45, Math.hypot(w, h) * 0.7);
    g.addColorStop(0, '#1f5a63');
    g.addColorStop(0.45, night);
    g.addColorStop(1, '#0a2027');
    bgx.fillStyle = g;
    bgx.fillRect(0, 0, w, h);
  }

  function conePoint(k, y, th, out) {
    return project(k * y * Math.cos(th), y, k * y * Math.sin(th), out);
  }

  function render(t, ambient = 0) {
    // ---- camera ---------------------------------------------------------
    const k = lerp(0.045, 0.56, easeInOut(sm(0.0, 2.5, t)));
    const yaw = 0.6 + t * 0.2 + ambient * 0.05;
    const pitch = lerp(0.2, 0.34, sm(0, 3, t)) + 0.28 * sm(8.2, 10.4, t);
    cyaw = Math.cos(yaw);
    syaw = Math.sin(yaw);
    cpit = Math.cos(pitch);
    spit = Math.sin(pitch);
    dist = lerp(3.3, 3.0, sm(2.4, 6, t)) + 1.5 * sm(8.2, 10.6, t);

    let cxr;
    let cyr;
    if (mobile) {
      cxr = 0.5;
      cyr = 0.36 + 0.2 * sm(2.3, 3.8, t) - 0.1 * sm(5.6, 6.8, t) + 0.12 * sm(8.3, 9.8, t);
      fov = Math.min(w * 1.25, h * 0.62) * 3.3 * 0.36;
    } else {
      cxr = 0.7 - 0.3 * sm(2.3, 3.8, t) + 0.1 * sm(5.6, 6.8, t) + 0.16 * sm(8.4, 9.8, t);
      cyr = 0.47 + 0.04 * sm(2.3, 3.8, t) - 0.03 * sm(5.6, 6.8, t);
      fov = Math.min(w * 0.62, h * 0.86) * 3.3 * 0.29;
    }
    ox = w * cxr;
    oy = h * cyr;

    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(bg, 0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    // ---- dust (depth cue) ---------------------------------------------
    const dustA = 0.5 * sm(-1.2, 0.4, t) * (1 - sm(11.2, 11.9, t));
    if (dustA > 0.002) {
      for (let i = 0; i < dust.length; i++) {
        const d = dust[i];
        project(d[0], d[1], d[2], P);
        if (P[2] + dist < 0.3) continue;
        const near = clamp(1 - (P[2] + 2) / 6, 0.15, 1);
        const tw = 0.6 + 0.4 * Math.sin(ambient * 0.8 + d[3] * 40);
        ctx.fillStyle = rgba(CREAM, dustA * near * tw * 0.7);
        const r = 0.6 + near * 1.1;
        ctx.fillRect(P[0] - r / 2, P[1] - r / 2, r, r);
      }
    }

    // ---- cone generators -----------------------------------------------
    const grow = sm(-1.15, 0.15, t);
    const coneA = sm(-1.2, -0.3, t) * (1 - 0.82 * sm(8.3, 9.6, t)) * (1 - sm(11, 11.6, t));
    if (coneA > 0.002) {
      const yEnd = H * lerp(0.02, 1, grow);
      ctx.lineWidth = mobile ? 0.9 : 1;
      for (let i = 0; i < GEN; i++) {
        const th = (i / GEN) * TAU;
        conePoint(k, yEnd, th, P);
        conePoint(k, -yEnd, th, Q);
        const depth = clamp(1 - (P[2] + 1) / 2.2, 0.18, 1);
        const c = pal(i / GEN);
        const g = ctx.createLinearGradient(P[0], P[1], Q[0], Q[1]);
        const a = coneA * depth * 0.55;
        g.addColorStop(0, rgba(c, 0));
        g.addColorStop(0.5, rgba(c, a));
        g.addColorStop(1, rgba(c, 0));
        ctx.strokeStyle = g;
        ctx.beginPath();
        ctx.moveTo(P[0], P[1]);
        ctx.lineTo(Q[0], Q[1]);
        ctx.stroke();
      }
      // rims
      const rimA = coneA * 0.35 * sm(0.4, 2.2, t);
      if (rimA > 0.002) {
        for (const s of [1, -1]) {
          ctx.strokeStyle = rgba(CREAM, rimA * 0.8);
          ctx.beginPath();
          for (let j = 0; j <= 72; j++) {
            conePoint(k, s * H, (j / 72) * TAU, P);
            j ? ctx.lineTo(P[0], P[1]) : ctx.moveTo(P[0], P[1]);
          }
          ctx.stroke();
        }
      }
    }

    // ---- apex glow ------------------------------------------------------
    project(0, 0, 0, P);
    const apexX = P[0];
    const apexY = P[1];
    const glowA = 0.55 * sm(-1.0, 0, t) * (1 - 0.6 * sm(1, 3, t)) + 0.9 * sm(9.2, 11, t);
    if (glowA > 0.002) {
      const r = (mobile ? 120 : 190) * (1 + 1.4 * sm(9.5, 11.2, t));
      const g = ctx.createRadialGradient(apexX, apexY, 0, apexX, apexY, r);
      g.addColorStop(0, rgba([255, 252, 238], glowA * 0.9));
      g.addColorStop(0.18, rgba(YELLOW, glowA * 0.28));
      g.addColorStop(1, rgba(PAL[0], 0));
      ctx.fillStyle = g;
      ctx.fillRect(apexX - r, apexY - r, r * 2, r * 2);
    }

    // ---- cutting plane --------------------------------------------------
    const planeA = sm(2.55, 3.4, t) * (1 - sm(8.2, 9.0, t));
    const phiC = Math.atan(1 / k); // plane parallel to a generator: parabola
    const phi = 0.8 * sm(3.9, 5.4, t) + (phiC - 0.8) * sm(5.6, 7.0, t) + 0.3 * sm(7.2, 8.3, t);
    const y0 = lerp(1.6, 0.55, sm(2.55, 3.8, t));
    const sp = Math.sin(phi);
    const cp = Math.cos(phi);
    if (planeA > 0.002) {
      const A = 1.65;
      const B = 1.35;
      // basis: u along the tilt, v along z
      const ux = cp;
      const uy = -sp;
      const corner = (a, b, out) => project(a * ux, y0 + a * uy, b, out);
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(PAL[1], planeA * 0.16);
      for (let j = -4; j <= 4; j++) {
        corner(-A, (j / 4) * B, P);
        corner(A, (j / 4) * B, Q);
        ctx.beginPath();
        ctx.moveTo(P[0], P[1]);
        ctx.lineTo(Q[0], Q[1]);
        ctx.stroke();
        corner((j / 4) * A, -B, P);
        corner((j / 4) * A, B, Q);
        ctx.beginPath();
        ctx.moveTo(P[0], P[1]);
        ctx.lineTo(Q[0], Q[1]);
        ctx.stroke();
      }
      ctx.fillStyle = rgba(PAL[1], planeA * 0.045);
      ctx.beginPath();
      corner(-A, -B, P);
      ctx.moveTo(P[0], P[1]);
      corner(A, -B, P);
      ctx.lineTo(P[0], P[1]);
      corner(A, B, P);
      ctx.lineTo(P[0], P[1]);
      corner(-A, B, P);
      ctx.lineTo(P[0], P[1]);
      ctx.closePath();
      ctx.fill();
    }

    // ---- the conic: plane ∩ cone ---------------------------------------
    // y(θ) = y0 cosφ / (cosφ + k sinφ cosθ); point = (k y cosθ, y, k y sinθ)
    const curveA = sm(2.95, 3.6, t) * (1 - sm(8.3, 9.1, t));
    const drawn = sm(2.95, 4.1, t);
    const curvePts = [];
    if (curveA > 0.002) {
      const th0 = Math.PI * 0.5;
      const span = TAU * drawn;
      let seg = [];
      for (let j = 0; j <= CURVE_N; j++) {
        const th = th0 + (j / CURVE_N) * span;
        const den = cp + k * sp * Math.cos(th);
        const y = Math.abs(den) < 1e-4 ? 1e9 : (y0 * cp) / den;
        if (Math.abs(y) > H) {
          if (seg.length > 1) curvePts.push(seg);
          seg = [];
          continue;
        }
        conePoint(k, y, th, P);
        seg.push([P[0], P[1], th]);
      }
      if (seg.length > 1) curvePts.push(seg);

      const g = ctx.createLinearGradient(ox - w * 0.2, oy - h * 0.3, ox + w * 0.2, oy + h * 0.3);
      g.addColorStop(0, rgba(PAL[0], 1));
      g.addColorStop(0.5, rgba(PAL[1], 1));
      g.addColorStop(1, rgba(PAL[2], 1));
      const passes = mobile
        ? [
            [7, 0.08],
            [1.6, 1],
          ]
        : [
            [10, 0.06],
            [4, 0.16],
            [1.6, 1],
          ];
      ctx.strokeStyle = g;
      for (const [lw, a] of passes) {
        ctx.lineWidth = lw;
        ctx.globalAlpha = curveA * a;
        for (const s of curvePts) {
          ctx.beginPath();
          ctx.moveTo(s[0][0], s[0][1]);
          for (let j = 1; j < s.length; j++) ctx.lineTo(s[j][0], s[j][1]);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    // ---- spark riding the curve ----------------------------------------
    const sparkA = sm(5.7, 6.3, t) * (1 - sm(8.1, 8.7, t));
    if (sparkA > 0.002) {
      const head = Math.PI * 0.5 + (t - 5.7) * 1.35;
      const TRAIL = mobile ? 26 : 44;
      for (let j = TRAIL; j >= 0; j--) {
        const th = head - j * 0.035;
        const den = cp + k * sp * Math.cos(th);
        const y = Math.abs(den) < 1e-4 ? 1e9 : (y0 * cp) / den;
        if (Math.abs(y) > H) continue;
        conePoint(k, y, th, P);
        const f = 1 - j / TRAIL;
        const r = j === 0 ? 4.5 : 1 + f * 2.2;
        ctx.fillStyle = rgba(j === 0 ? [255, 255, 255] : pal(f), sparkA * f * (j === 0 ? 1 : 0.55));
        ctx.beginPath();
        ctx.arc(P[0], P[1], r, 0, TAU);
        ctx.fill();
        if (j === 0) {
          const g = ctx.createRadialGradient(P[0], P[1], 0, P[0], P[1], 46);
          g.addColorStop(0, rgba(YELLOW, sparkA * 0.45));
          g.addColorStop(1, rgba(PAL[2], 0));
          ctx.fillStyle = g;
          ctx.fillRect(P[0] - 46, P[1] - 46, 92, 92);
        }
      }
    }

    // ---- orbits around one focus ---------------------------------------
    const orbBase = sm(8.4, 9.2, t) * (1 - sm(11.1, 11.8, t));
    if (orbBase > 0.002) {
      const nodes = [];
      const scale = mobile ? 0.8 : 1;
      for (let i = 0; i < orbits.length; i++) {
        const o = orbits[i];
        const grow = sm(8.45 + i * 0.07, 9.5 + i * 0.07, t);
        if (grow <= 0.001) continue;
        const cps = Math.cos(o.psi);
        const sps = Math.sin(o.psi);
        const ci = Math.cos(o.inc);
        const si = Math.sin(o.inc);
        const pt = (s, out) => {
          // ellipse in its plane with the focus at the origin
          const ex = (o.a * Math.cos(s) - o.c) * scale;
          const ez = o.b * Math.sin(s) * scale;
          const x = ex * cps - ez * sps;
          const z = ex * sps + ez * cps;
          return project(x, -z * si, z * ci, out);
        };
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(o.col, orbBase * 0.42);
        ctx.beginPath();
        const segs = Math.ceil(ORBIT_SEG * grow);
        for (let j = 0; j <= segs; j++) {
          pt(o.s0 + (j / ORBIT_SEG) * TAU, P);
          j ? ctx.lineTo(P[0], P[1]) : ctx.moveTo(P[0], P[1]);
        }
        ctx.stroke();
        if (grow > 0.6) {
          pt(o.s0 + (t - 8.4) * o.w + ambient * 0.03 * o.w, P);
          nodes.push([P[0], P[1], o.col, orbBase * sm(0.6, 1, grow)]);
        }
      }
      // constellation: each node links to its two nearest neighbours
      ctx.lineWidth = 0.8;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        let b1 = -1;
        let b2 = -1;
        let d1 = 1e9;
        let d2 = 1e9;
        for (let j = 0; j < nodes.length; j++) {
          if (j === i) continue;
          const d = Math.hypot(nodes[j][0] - n[0], nodes[j][1] - n[1]);
          if (d < d1) {
            d2 = d1;
            b2 = b1;
            d1 = d;
            b1 = j;
          } else if (d < d2) {
            d2 = d;
            b2 = j;
          }
        }
        for (const [j, d] of [
          [b1, d1],
          [b2, d2],
        ]) {
          if (j < 0 || j < i) continue;
          const m = nodes[j];
          const fade = clamp(1 - d / (Math.min(w, h) * 0.55), 0, 1);
          ctx.strokeStyle = rgba(CREAM, Math.min(n[3], m[3]) * 0.3 * fade);
          ctx.beginPath();
          ctx.moveTo(n[0], n[1]);
          ctx.lineTo(m[0], m[1]);
          ctx.stroke();
        }
      }
      for (const n of nodes) {
        ctx.fillStyle = rgba([255, 255, 255], n[3]);
        ctx.beginPath();
        ctx.arc(n[0], n[1], 2.2, 0, TAU);
        ctx.fill();
        ctx.fillStyle = rgba(n[2], n[3] * 0.25);
        ctx.beginPath();
        ctx.arc(n[0], n[1], 7, 0, TAU);
        ctx.fill();
      }
    }

    // ---- flood: light becomes the page ---------------------------------
    ctx.globalCompositeOperation = 'source-over';
    const fl = sm(11.0, 11.92, t);
    if (fl > 0.001) {
      const R = fl * Math.hypot(Math.max(apexX, w - apexX), Math.max(apexY, h - apexY)) * 1.08;
      if (fl >= 0.999) {
        ctx.fillStyle = flood;
        ctx.fillRect(0, 0, w, h);
      } else {
        const g = ctx.createRadialGradient(apexX, apexY, R * 0.5, apexX, apexY, R + 1);
        g.addColorStop(0, flood);
        g.addColorStop(1, flood + '00');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
    }
  }

  return { resize, render };
}
