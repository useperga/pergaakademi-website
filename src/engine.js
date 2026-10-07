/*
  One clock for the whole page.

  A single requestAnimationFrame loop drives Lenis (desktop smooth scroll),
  then hands the current scroll position to every subscriber. Nothing listens
  to the scroll event; every scroll-linked value on the page is derived here,
  from cached layout, once per frame.
*/
import Lenis from 'lenis';

export function createEngine({ smooth }) {
  const lenis = smooth
    ? new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true, autoRaf: false })
    : null;
  const subs = [];
  const measures = [];
  let vh = window.innerHeight;
  let vw = window.innerWidth;
  let last = performance.now();

  function measure() {
    vh = window.innerHeight;
    vw = window.innerWidth;
    for (const m of measures) m(vw, vh);
  }

  function tick(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (lenis) lenis.raf(now);
    const y = lenis ? lenis.scroll : window.scrollY;
    for (const s of subs) s(y, vh, dt, now);
    requestAnimationFrame(tick);
  }

  let rt = 0;
  const onResize = () => {
    cancelAnimationFrame(rt);
    rt = requestAnimationFrame(measure);
  };
  window.addEventListener('resize', onResize);
  new ResizeObserver(onResize).observe(document.body);
  document.fonts?.ready.then(onResize);
  window.addEventListener('load', onResize);

  return {
    lenis,
    get vh() {
      return vh;
    },
    get vw() {
      return vw;
    },
    onFrame(fn) {
      subs.push(fn);
    },
    onMeasure(fn) {
      measures.push(fn);
      fn(vw, vh);
    },
    start() {
      measure();
      requestAnimationFrame(tick);
    },
    scrollTo(target, opts = {}) {
      if (lenis) lenis.scrollTo(target, { duration: 1.6, ...opts });
      else {
        const top = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: top + (opts.offset || 0), behavior: opts.immediate ? 'auto' : 'smooth' });
      }
    },
  };
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const docTop = (el) => el.getBoundingClientRect().top + window.scrollY;
