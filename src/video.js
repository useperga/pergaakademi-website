/*
  Scroll-scrubbed <video>. Only used when a real clip exists at STORY.video.src.

  - Blob-loaded, so seeking never depends on HTTP range support.
  - The caller hands it an already-smoothed film time; this module only
    decides WHEN a seek is safe: never queue a seek while the decoder is still
    resolving the last one (a fast flick otherwise freezes the clip on phones),
    but recover from a seek that never completes.
  - iOS will not paint frames for a clip that has never played, so the first
    touch primes it with a muted play/pause.
*/
export async function loadScrubVideo(el, { src, srcMobile, mobile }) {
  const candidates = mobile && srcMobile ? [srcMobile, src] : [src];
  let url = null;
  for (const c of candidates) {
    try {
      const head = await fetch(c, { method: 'HEAD', cache: 'no-store' });
      const type = head.headers.get('content-type') || '';
      if (head.ok && type.startsWith('video')) {
        url = c;
        break;
      }
    } catch {
      /* no clip, fall through to the procedural film */
    }
  }
  if (!url) return null;

  const blob = await (await fetch(url)).blob();
  el.src = URL.createObjectURL(blob);
  el.muted = true;
  el.playsInline = true;
  el.hidden = false;

  await new Promise((resolve, reject) => {
    el.addEventListener('loadeddata', resolve, { once: true });
    el.addEventListener('error', reject, { once: true });
  }).catch(() => null);
  if (!el.duration || !isFinite(el.duration)) return null;

  let seekStarted = 0;
  const prime = () => {
    const p = el.play();
    if (p && p.then) p.then(() => el.pause()).catch(() => {});
    removeEventListener('touchend', prime);
    removeEventListener('click', prime);
  };
  addEventListener('touchend', prime, { passive: true });
  addEventListener('click', prime);

  return {
    duration: el.duration,
    seek(t) {
      const target = Math.min(Math.max(t, 0), el.duration - 0.04);
      if (el.seeking) {
        if (performance.now() - seekStarted < 700) return;
      }
      if (Math.abs(el.currentTime - target) > 1 / 90) {
        seekStarted = performance.now();
        try {
          el.currentTime = target;
        } catch {
          /* decoder not ready yet */
        }
      }
    },
  };
}
