import '@fontsource-variable/nunito/wght.css';
import './styles.css';

import iconArrow from '@phosphor-icons/core/assets/regular/arrow-up-right.svg?raw';
import iconList from '@phosphor-icons/core/assets/regular/list.svg?raw';
import iconX from '@phosphor-icons/core/assets/regular/x.svg?raw';
import iconCheck from '@phosphor-icons/core/assets/regular/check.svg?raw';
import iconCaret from '@phosphor-icons/core/assets/regular/caret-down.svg?raw';

import { createEngine, clamp, docTop } from './engine.js';
import { createHero } from './hero.js';
import { createJeksin } from './jeksin.js';
import { send, mailtoFor } from './company.js';
import { setupCookiePrefs } from './cookies.js';

const ICONS = { 'arrow-up-right': iconArrow, list: iconList, x: iconX, check: iconCheck, 'caret-down': iconCaret };
// Icons always sit beside a visible label or inside a named control, so they
// are decorative: hidden from the accessibility tree.
document.querySelectorAll('[data-icon]').forEach((el) => {
  el.innerHTML = ICONS[el.dataset.icon] || '';
  el.classList.add('icon');
  el.setAttribute('aria-hidden', 'true');
  el.querySelector('svg')?.setAttribute('focusable', 'false');
});

const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
const reduce = mqReduce.matches;
const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
// the hero uses its tall, thumb-first composition on phones and portrait tablets
const mobile = matchMedia('(max-width: 767px), (max-width: 1023px) and (orientation: portrait)').matches;
const desktopPaths = () => matchMedia('(min-width: 1024px)').matches;

if (reduce) document.documentElement.classList.add('reduce');

const engine = createEngine({ smooth: !touch && !reduce });

// ---- hero ---------------------------------------------------------------
const nav = document.querySelector('[data-nav]');
const hero = createHero(document.getElementById('hero'), engine, { mobile, reduce });
hero.onTheme((night) => {
  nav.dataset.theme = night ? 'night' : 'day';
  document.querySelector('meta[name="theme-color"]').content = night ? '#123540' : getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim();
});

// ---- generic scrubbed sections: writes --p (0..1) on the element ---------
// sticky: progress while the element's sticky child is pinned
// view:   progress from entering the bottom edge to leaving the top edge
const scrubs = [...document.querySelectorAll('[data-scrub]')].map((el) => ({ el, mode: el.dataset.scrub, top: 0, h: 0, last: -1 }));
engine.onMeasure(() => {
  for (const s of scrubs) {
    s.top = docTop(s.el);
    s.h = s.el.offsetHeight;
  }
});
engine.onFrame((y, vh) => {
  for (const s of scrubs) {
    const p = s.mode === 'sticky' ? clamp((y - s.top) / Math.max(1, s.h - vh), 0, 1) : clamp((y + vh - s.top) / (s.h + vh), 0, 1);
    if (Math.abs(p - s.last) > 0.0004) {
      s.last = p;
      s.el.style.setProperty('--p', p.toFixed(4));
    }
  }
});

// ---- creed: words light up one by one ------------------------------------
document.querySelectorAll('[data-words]').forEach((el) => {
  let n = 0;
  el.querySelectorAll(':scope > span').forEach((group) => {
    const words = group.textContent.trim().split(/\s+/);
    group.textContent = '';
    words.forEach((w, i) => {
      const s = document.createElement('span');
      s.className = 'w';
      s.style.setProperty('--w', n++);
      s.textContent = w;
      group.append(s);
      if (i < words.length - 1) group.append(' ');
    });
  });
  el.style.setProperty('--n', n);
});

// ---- entrance reveals ------------------------------------------------------
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    }
  },
  { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
);
document.querySelectorAll('.rv, .station, .track__head').forEach((el) => io.observe(el));

// ---- program paths ---------------------------------------------------------
// Desktop: the section pins and the track pans sideways; each track's curve
// draws itself up through the stations as they arrive. Mobile: a vertical
// thread that fills as you read.
const paths = document.querySelector('.paths');
const pathsTrack = paths.querySelector('.paths__track');
const tracks = [...paths.querySelectorAll('.track')].map((el) => ({
  el,
  svg: el.querySelector('.track__curve'),
  paths: [...el.querySelectorAll('.track__curve path')],
  stations: [...el.querySelectorAll('.station')],
  x0: 0,
  w: 0,
  dots: [],
}));
let pathsTop = 0;
let pathsDist = 0;
let pathsHorizontal = false;
let lastPathsP = -1;

function buildCurve(t) {
  const box = t.el.getBoundingClientRect();
  t.svg.setAttribute('width', box.width);
  t.svg.setAttribute('height', box.height);
  t.svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  const pts = t.stations.map((s) => {
    const d = s.querySelector('.station__dot').getBoundingClientRect();
    return [d.left + d.width / 2 - box.left, d.top + d.height / 2 - box.top];
  });
  t.dots = pts.map((p) => p[0]);
  if (pathsHorizontal) {
    // enter low from the track heading, rise through every station, carry on out
    const head = t.el.querySelector('.track__head').getBoundingClientRect();
    const cta = t.el.querySelector('.track__end .btn').getBoundingClientRect();
    const start = [head.right - box.left - head.width * 0.12, pts[0][1] + box.height * 0.12];
    const end = [cta.left - box.left - 14, cta.top + cta.height / 2 - box.top];
    const all = [start, ...pts, end];
    let d = `M ${all[0][0]} ${all[0][1]}`;
    for (let i = 1; i < all.length; i++) {
      const [x0, y0] = all[i - 1];
      const [x1, y1] = all[i];
      const mx = (x1 - x0) * 0.5;
      d += ` C ${x0 + mx} ${y0}, ${x1 - mx} ${y1}, ${x1} ${y1}`;
    }
    t.paths.forEach((pa) => pa.setAttribute('d', d));
  } else {
    const x = pts[0][0];
    const d = `M ${x} ${pts[0][1] - 40} L ${x} ${pts[pts.length - 1][1] + box.height * 0.04}`;
    t.paths.forEach((pa) => pa.setAttribute('d', d));
  }
}

engine.onMeasure((vw, vh) => {
  pathsHorizontal = desktopPaths() && !reduce;
  paths.classList.toggle('paths--h', pathsHorizontal);
  if (pathsHorizontal) {
    const trackW = pathsTrack.scrollWidth;
    pathsDist = Math.max(0, trackW - vw);
    paths.style.height = `${pathsDist + vh}px`;
    pathsTrack.style.setProperty('--dist', pathsDist);
  } else {
    paths.style.height = '';
    pathsDist = 0;
  }
  pathsTop = docTop(paths);
  // measure tracks unpanned
  pathsTrack.style.setProperty('--p', 0);
  for (const t of tracks) {
    t.x0 = t.el.offsetLeft;
    t.w = t.el.offsetWidth;
    t.top = docTop(t.el);
    t.h = t.el.offsetHeight;
    buildCurve(t);
  }
  lastPathsP = -1;
});

engine.onFrame((y, vh) => {
  const vw = engine.vw;
  if (pathsHorizontal) {
    const p = clamp((y - pathsTop) / Math.max(1, pathsDist), 0, 1);
    if (Math.abs(p - lastPathsP) < 0.0002) return;
    lastPathsP = p;
    pathsTrack.style.setProperty('--p', p.toFixed(5));
    const scrollX = p * pathsDist;
    const lead = scrollX + vw * 0.78; // the curve's tip runs ahead of centre
    for (const t of tracks) {
      const f = clamp((lead - t.x0) / t.w, 0, 1);
      t.el.style.setProperty('--draw', f.toFixed(4));
      t.stations.forEach((s, i) => s.classList.toggle('lit', lead - t.x0 >= t.dots[i]));
    }
  } else {
    for (const t of tracks) {
      const lead = y + vh * 0.62 - t.top;
      const f = clamp(lead / t.h, 0, 1);
      t.el.style.setProperty('--draw', f.toFixed(4));
    }
  }
});

// ---- anchors (Lenis-aware) & audience shortcuts ---------------------------
const menu = document.getElementById('menu');
const menuBtn = document.querySelector('.nav__menu');
const pageRegions = [document.getElementById('icerik'), document.querySelector('.foot')];
function setMenu(open, { restoreFocus = true } = {}) {
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
  menuBtn.querySelector('.icon').innerHTML = open ? iconX : iconList;
  document.documentElement.classList.toggle('menu-open', open);
  // keyboard and screen-reader focus stay inside the header + menu while open
  pageRegions.forEach((r) => r && (r.inert = open));
  if (open) {
    menu.hidden = false;
    requestAnimationFrame(() => {
      menu.classList.add('open');
      menu.querySelector('a')?.focus({ preventScroll: true });
    });
    engine.lenis?.stop();
  } else {
    menu.classList.remove('open');
    engine.lenis?.start();
    if (restoreFocus) menuBtn.focus({ preventScroll: true });
    setTimeout(() => {
      if (!menu.classList.contains('open')) menu.hidden = true;
    }, 450);
  }
}
menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false);
});

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href').slice(1);
  if (!id) {
    e.preventDefault();
    return;
  }
  const target = document.getElementById(id);
  if (!target) return;
  e.preventDefault();
  jeksin?.passGate?.(); // a link is already a choice: Jeksın will not stop the page after it
  const fromMenu = menuBtn.getAttribute('aria-expanded') === 'true';
  if (fromMenu) setMenu(false, { restoreFocus: false });
  if (a.dataset.role) setRole(a.dataset.role);
  if (a.dataset.interest) setInterest(a.dataset.interest);
  if (a.dataset.event) setEvent(a.dataset.event);
  else if (a.dataset.role || a.dataset.interest) setEvent('');

  let dest = target;
  // The hero is a long scrubbed timeline. "Home" means its first frame.
  if (id === 'hero') dest = 0;
  // Audience rows jump to their own track inside the program paths.
  if (a.dataset.track) {
    const t = tracks.find((tr) => tr.el.dataset.trackId === a.dataset.track);
    if (t) dest = pathsHorizontal ? pathsTop + Math.min(pathsDist, t.x0) : t.el;
  }
  const go = () => engine.scrollTo(dest, { offset: typeof dest === 'number' ? 0 : -72 });
  // the menu's scroll lock has to be released for a frame before scrolling
  fromMenu ? requestAnimationFrame(() => requestAnimationFrame(go)) : go();
  history.replaceState(null, '', `#${id}`);
  if (id === 'iletisim') setTimeout(() => document.getElementById('f-name').focus({ preventScroll: true }), reduce ? 0 : 1400);
});

// ---- enquiry form ------------------------------------------------------------
const OPTIONS = {
  ogretmen: ['AI Teacher', 'AI Teacher Pro', 'AI Teacher Lab', 'Seminer / Workshop', 'Henüz karar vermedim'],
  veli: ['AI Start', 'AI Creator', 'AI Builder', 'Veliler için AI Rehberi', 'Seminer / Workshop', 'Henüz karar vermedim'],
  kurum: ['Kurumsal eğitim programı', 'Seminer / Workshop', 'Henüz karar vermedim'],
};
const form = document.querySelector('[data-form]');
const select = form.querySelector('select');

function fillOptions(role, keep) {
  const prev = keep ?? select.value;
  select.innerHTML = '<option value="" disabled selected>Bir eğitim seçin</option>';
  for (const o of OPTIONS[role]) {
    const opt = document.createElement('option');
    opt.value = opt.textContent = o;
    select.append(opt);
  }
  if (OPTIONS[role].includes(prev)) select.value = prev;
}
function setRole(role) {
  const r = form.querySelector(`input[name="rol"][value="${role}"]`);
  if (r) {
    r.checked = true;
    fillOptions(role);
  }
}
function setInterest(v) {
  const role = form.rol.value;
  if (!OPTIONS[role].includes(v)) setRole('ogretmen');
  select.value = v;
}
form.addEventListener('change', (e) => {
  if (e.target.name === 'rol') fillOptions(e.target.value);
});
fillOptions('ogretmen');

// a seminar/workshop picked from the events list travels with the request
const pick = document.getElementById('f-event');
function setEvent(name) {
  if (!name && !form.etkinlik.value) return;
  form.etkinlik.value = name;
  pick.hidden = !name;
  pick.querySelector('b').textContent = name;
}
pick.querySelector('.field__clear').addEventListener('click', () => {
  setEvent('');
  select.focus();
});

const rules = {
  ad: (v) => (v.trim().length >= 2 ? '' : 'Adınızı ve soyadınızı yazın (en az 2 karakter).'),
  iletisim: (v) => {
    const s = v.trim();
    if (!s) return 'Size ulaşabilmemiz için e-posta adresinizi veya telefon numaranızı yazın.';
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
    const phone = s.replace(/[^\d]/g, '').length >= 10 && /^[+\d\s()-]+$/.test(s);
    if (email || phone) return '';
    return s.includes('@')
      ? 'E-posta adresi eksik görünüyor. Örnek: ornek@okul.com'
      : 'Telefon numarası en az 10 haneli olmalı. Örnek: 0532 123 45 67';
  },
  egitim: (v) => (v ? '' : 'Listeden ilgilendiğiniz eğitimi seçin. Emin değilseniz “Henüz karar vermedim”i seçebilirsiniz.'),
  riza: (v, f) => (f.checked ? '' : 'Talebinizi iletebilmemiz için açık rıza kutusunu işaretleyin.'),
};
function check(field) {
  const msg = rules[field.name]?.(field.value, field) ?? '';
  const err = document.getElementById(field.dataset.err);
  field.setAttribute('aria-invalid', msg ? 'true' : 'false');
  field.closest('.field').classList.toggle('field--bad', !!msg);
  if (err) err.textContent = msg;
  if (!form.querySelector('[aria-invalid="true"]')) jeksin.otter?.worry(false);
  return !msg;
}
form.querySelectorAll('input[type="text"]:not([name="_honey"]), select, input[type="checkbox"][name="riza"]').forEach((f) => {
  f.addEventListener('blur', () => f.type !== 'checkbox' && f.value && check(f));
  f.addEventListener('input', () => f.getAttribute('aria-invalid') === 'true' && check(f));
  f.addEventListener('change', () => f.getAttribute('aria-invalid') === 'true' && check(f));
});

// Requests go to hello@pergaakademi.com through the relay in company.js.
async function sendEnquiry(data) {
  if (data._honey) return; // a bot filled the hidden field: pretend success, send nothing
  return send(data);
}

const submitBtn = form.querySelector('.btn--submit');
const done = form.querySelector('.form__done');
const fail = form.querySelector('.form__fail');
const summary = form.querySelector('.form__summary');
const controls = () => form.querySelectorAll('input, select, .field__clear');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (form.classList.contains('form--busy')) return;
  fail.hidden = true;
  const fields = [form.ad, form.iletisim, form.egitim, form.riza];
  const ok = fields.map(check).every(Boolean);
  const bad = fields.filter((f) => f.getAttribute('aria-invalid') === 'true');
  summary.hidden = bad.length < 2;
  if (!ok) {
    jeksin.otter?.worry(true);
    if (bad.length >= 2) {
      // several problems: a linked summary first, inline errors stay in place
      const list = summary.querySelector('ul');
      list.innerHTML = '';
      for (const f of bad) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${f.id}`;
        a.textContent = document.getElementById(f.dataset.err).textContent;
        a.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          f.focus();
        });
        li.append(a);
        list.append(li);
      }
      summary.focus();
    } else {
      bad[0]?.focus();
    }
    return;
  }
  form.classList.add('form--busy');
  submitBtn.disabled = true;
  submitBtn.setAttribute('aria-busy', 'true');
  submitBtn.querySelector('.btn__label').textContent = 'Gönderiliyor';
  try {
    await sendEnquiry(Object.fromEntries(new FormData(form)));
    form.classList.add('form--sent');
    jeksin.otter?.cheer();
    jeksin.celebrate?.();
    controls().forEach((c) => (c.disabled = true));
    done.hidden = false;
    done.focus({ preventScroll: true });
    submitBtn.querySelector('.btn__label').textContent = 'Gönderildi';
  } catch {
    fail.querySelector('.form__mail').href = mailtoFor(Object.fromEntries(new FormData(form)));
    fail.hidden = false;
    submitBtn.disabled = false;
    submitBtn.querySelector('.btn__label').textContent = 'Tekrar Dene';
  } finally {
    form.classList.remove('form--busy');
    submitBtn.removeAttribute('aria-busy');
  }
});

form.querySelector('.form__again').addEventListener('click', () => {
  form.reset();
  form.classList.remove('form--sent');
  controls().forEach((c) => (c.disabled = false));
  fillOptions('ogretmen');
  setEvent('');
  done.hidden = true;
  submitBtn.disabled = false;
  submitBtn.querySelector('.btn__label').textContent = 'Program Bilgisi Al';
  form.querySelectorAll('[aria-invalid]').forEach((f) => f.removeAttribute('aria-invalid'));
  form.ad.focus();
});

// ---- current section in the navigation -------------------------------------
const spyLinks = [...document.querySelectorAll('.nav__links a, .menu nav a')];
// Every top-level section is watched; when the reading line sits in one that
// has no menu entry (hero, audiences, method, trainers) nothing is current.
const onLine = new Set();
const spy = new IntersectionObserver(
  (entries) => {
    // entries can arrive batched and out of order after a jump: track what is
    // actually on the reading line, then mark only that.
    for (const e of entries) e.isIntersecting ? onLine.add(e.target) : onLine.delete(e.target);
    const current = [...onLine].sort((a, b) => (a.compareDocumentPosition(b) & 4 ? -1 : 1)).pop();
    spyLinks.forEach((a) => {
      if (current && a.getAttribute('href') === `#${current.id}`) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  },
  { rootMargin: '-45% 0px -54% 0px' }
);
document.querySelectorAll('main > section[id]').forEach((sec) => spy.observe(sec));

// ---- keyboard inside the pinned program track -------------------------------
// Focus moving to a station or CTA that is panned off-screen scrolls the page
// to the point where that element is in view.
pathsTrack.addEventListener('focusin', (e) => {
  if (!pathsHorizontal) return;
  const x = e.target.getBoundingClientRect().left - pathsTrack.getBoundingClientRect().left;
  const want = clamp(x - engine.vw * 0.35, 0, pathsDist);
  engine.scrollTo(pathsTop + want, { immediate: true });
});

// ---- deep links: honour #section on first load ------------------------------
if (location.hash.length > 1) {
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target && target.id !== 'hero') {
    history.scrollRestoration = 'manual';
    window.addEventListener('load', () =>
      requestAnimationFrame(() => {
        jeksin.passGate?.(); // arriving by link is a choice already
        engine.scrollTo(target, { offset: -72, immediate: true });
      })
    );
  }
}

// ---- Otter Jeksın ----------------------------------------------------------------
// He navigates with the page's own anchor logic (track jumps, Lenis, menu) by
// clicking a throwaway link, and prepares the form through the same helpers.
function navigate(go) {
  if (!go) return;
  const a = document.createElement('a');
  if (go.startsWith('track:')) {
    a.href = '#egitimler';
    a.dataset.track = go.slice(6);
  } else a.href = go;
  a.hidden = true;
  document.body.append(a);
  a.click();
  a.remove();
}
function prefill({ role, interest } = {}) {
  if (role) setRole(role);
  if (interest) setInterest(interest);
  setEvent('');
}
const jeksin = createJeksin({ engine, reduce, mobile: touch, navigate, prefill });
// Jeksın watches the field you are filling in
form.addEventListener('focusin', (e) => {
  const r = e.target.getBoundingClientRect();
  jeksin.otter?.lookAt(r.left + r.width / 2, r.top + r.height / 2);
});

// ---- soft page colour that flows from section to section ------------------------
const tintSections = [...document.querySelectorAll('[data-bg]')];
const tintIO = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      document.documentElement.dataset.bg = e.target.dataset.bg;
      document.documentElement.dataset.sea = e.target.id;
    }
  },
  { rootMargin: '-50% 0px -49% 0px' }
);
tintSections.forEach((sec) => tintIO.observe(sec));
let firstTint = 0;
engine.onMeasure((vw, vh) => (firstTint = tintSections[0].getBoundingClientRect().top + scrollY - vh * 0.5));
engine.onFrame((y) => {
  if (y < firstTint && document.documentElement.dataset.sea) {
    delete document.documentElement.dataset.sea;
  }
});

setupCookiePrefs();
engine.start();
if (import.meta.env.DEV) window.__perga = { engine, hero, jeksin };
