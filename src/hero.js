/*
  Hero controller.

  scroll position -> target film time -> smoothed film time (filmT)
  filmT drives BOTH the picture (canvas film or video) and every text cue,
  so picture and typography are one timeline and can never drift apart.
*/
import { STORY } from './story.js';
import { createFilm } from './film.js';
import { loadScrubVideo } from './video.js';
import { clamp, docTop } from './engine.js';

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const lin = (a, b, x) => clamp((x - a) / (b - a), 0, 1);

export function createHero(root, engine, { mobile, reduce }) {
  const canvas = root.querySelector('.hero__film');
  const videoEl = root.querySelector('.hero__video');
  const film = createFilm(canvas, { mobile });
  let video = null;
  let duration = STORY.duration;

  // ---- cues ---------------------------------------------------------------
  // Each [data-cue] holds parts marked [data-k="n"]; part n is offset by
  // n * stagger. The cue's own progress is written to the container as well.
  const cues = [];
  root.querySelectorAll('[data-cue]').forEach((el) => {
    const def = STORY.cues[el.dataset.cue];
    if (!def) return;
    const parts = el.querySelectorAll('[data-k]');
    const targets = parts.length ? [...parts] : [];
    const entry = { el, def, interactive: el.hasAttribute('data-interactive'), parts: [], last: -1 };
    for (const p of [el, ...targets]) {
      const n = p === el ? 0 : Number(p.dataset.k) || 0;
      const off = n * (def.stagger || 0);
      const offOut = n * (def.outStagger ?? def.stagger ?? 0);
      entry.parts.push({ el: p, i0: def.in[0] + off, i1: def.in[1] + off, o0: def.out[0] + offOut, o1: def.out[1] + offOut, li: -1, lo: -1 });
    }
    cues.push(entry);
  });

  function applyCues(t) {
    for (const c of cues) {
      for (const p of c.parts) {
        const i = easeOut(lin(p.i0, p.i1, t));
        const o = easeIn(lin(p.o0, p.o1, t));
        if (Math.abs(i - p.li) > 0.0008 || Math.abs(o - p.lo) > 0.0008 || p.li < 0) {
          p.li = i;
          p.lo = o;
          p.el.style.setProperty('--i', i.toFixed(4));
          p.el.style.setProperty('--o', o.toFixed(4));
        }
      }
      const head = c.parts[0];
      const visible = head.li > 0.001 && head.lo < 0.999;
      // the container itself has no stagger, so judge visibility on its parts
      const anyVisible = visible || c.parts.some((p) => p.li > 0.001 && p.lo < 0.999);
      if (anyVisible !== c.last) {
        c.last = anyVisible;
        c.el.style.visibility = anyVisible ? 'visible' : 'hidden';
        if (c.interactive) c.el.inert = !anyVisible;
      }
    }
  }

  // ---- layout -------------------------------------------------------------
  let filmDirty = true;
  let top = 0;
  let span = 1;
  engine.onMeasure((vw, vh) => {
    top = docTop(root);
    span = Math.max(1, root.offsetHeight - vh);
    film.resize();
    filmDirty = true;
  });

  // ---- clock --------------------------------------------------------------
  const INTRO = -1.25;
  const STILL = 10.6; // reduced motion: the resolved composition, held
  let filmT = reduce ? STILL : INTRO;
  let introStart = null;
  let lastRendered = NaN;
  let lastAmbient = 0;
  let lastProg = -1;
  let lastFlood = -1;
  let onTheme = () => {};
  let night = true;

  const rate = mobile ? 6 : 7.5;

  function frame(y, vh, dt, now) {
    const p = clamp((y - top) / span, 0, 1);
    let target;
    if (reduce) {
      target = STILL;
      filmT = STILL;
    } else {
      if (introStart === null) introStart = now;
      const intro = INTRO * (1 - easeOut(clamp((now - introStart) / 1900, 0, 1)));
      target = p * duration + intro;
      const k = 1 - Math.exp(-rate * dt);
      filmT += (target - filmT) * k;
      if (Math.abs(target - filmT) < 0.0004) filmT = target;
    }

    const onScreen = y < top + span + vh;
    if (onScreen) {
      // the night sky thins out at the end so the coloured sea behind the page shows through
      const fl = reduce ? 0 : lin(STORY.flood[0], STORY.flood[1], filmT);
      if (Math.abs(fl - lastFlood) > 0.001) {
        lastFlood = fl;
        root.style.setProperty('--flood', fl.toFixed(3));
      }
      if (video) {
        video.seek(filmT);
      } else {
        // Full rate while the film is moving; once it settles only the
        // ambient drift remains, which reads the same at ~30fps and halves
        // the GPU work while someone is reading.
        const moving = filmDirty || filmT !== lastRendered;
        if (moving || (!reduce && now - lastAmbient > 32)) {
          film.render(filmT, reduce ? 0 : now / 1000);
          lastRendered = filmT;
          lastAmbient = now;
          filmDirty = false;
        }
      }
      applyCues(filmT);
      const prog = clamp(filmT / duration, 0, 1);
      if (Math.abs(prog - lastProg) > 0.0005) {
        lastProg = prog;
        root.style.setProperty('--prog', prog.toFixed(4));
      }
    }

    const nightEdge = reduce ? top + vh - 72 : top + span + vh * 0.1;
    const isNight = y < nightEdge && (reduce || filmT < STORY.flood[0] + (STORY.flood[1] - STORY.flood[0]) * 0.55);
    if (isNight !== night) {
      night = isNight;
      onTheme(night);
    }
  }

  engine.onFrame(frame);

  // A real clip, if one has been dropped in, replaces the procedural film.
  if (!reduce) {
    loadScrubVideo(videoEl, { ...STORY.video, mobile }).then((v) => {
      if (!v) return;
      video = v;
      duration = v.duration;
      canvas.hidden = true;
      root.classList.add('hero--video');
    });
  }

  return {
    onTheme(fn) {
      onTheme = fn;
      fn(night);
    },
    get time() {
      return filmT;
    },
  };
}
