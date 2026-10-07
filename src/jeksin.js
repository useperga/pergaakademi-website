/*
  Otter Jeksın: the guide who swims through the page.

  Layout gives him a spot in every section ([data-jx-spot]); one fixed 3D otter
  tracks the spot of the section you are reading and swims (spring motion)
  whenever that changes, leaving a trail of bubbles. He talks in a speech
  bubble, asks the reader questions with tappable answers, and opens a chat
  ("Otter Jeksın'a sor") that answers from the site's own content.

  Nothing here is a language model: answers are matched from a small, honest
  knowledge base, and anything it does not know is routed to the form.
*/

// ------------------------------------------------------------------ copy
const LINES = {
  intro: { text: 'Merhaba, ben Otter Jeksın! Bu sayfada sana ben eşlik edeceğim.' },
  hedef: {
    text: 'Otter Jeksın merak ediyor: sen kimsin?',
    chips: [
      { label: 'Öğretmenim', go: 'track:ogretmen', role: 'ogretmen', reply: 'Harika! Seni öğretmen programlarına götürüyorum.' },
      { label: 'Öğrenci ya da veliyim', go: 'track:ogrenci', role: 'veli', reply: 'Süper! Öğrenci programlarına yüzüyoruz.' },
      { label: 'Kurumum', go: '#kurumsal', role: 'kurum', reply: 'Anladım, kurumsal plana geçiyoruz.' },
    ],
  },
  hedefAfterGate: { text: 'Her grup için ne olduğunu burada görebilirsin. Bir satıra dokun, seni oraya götüreyim.' },
  egitimler: { text: 'Otter Jeksın senin için çalışıyor: programları kolaydan zora dizdim.' },
  seminerler: { text: 'Kısa bir başlangıç mı? Bir etkinliğe dokun, formu ben doldurayım.' },
  kurumsal: { text: 'Ekibin için mi bakıyorsun? Planı birlikte kuralım.' },
  yontem: { text: 'Ben öneririm, kararı sen verirsin. Yapay zekâ da böyle çalışmalı.' },
  egitmenler: { text: 'Bunlar programları yürüten eğitmen arkadaşlarım.' },
  iletisim: {
    text: "Otter Jeksın'a sormak istediğin bir şey var mı? Ya da formu doldur, ekibim sana dönsün.",
    chips: [{ label: "Jeksın'a sor", chat: true }],
  },
  footer: { text: 'Görüşmek üzere! Otter Jeksın hep burada.' },
};

const QUICK = [
  { label: 'Bana uygun programı bul', intent: 'finder' },
  { label: 'Programlar ne kadar sürüyor?', intent: 'sure' },
  { label: 'Kodlama bilmem gerekiyor mu?', intent: 'kodlama' },
  { label: 'Ücretler ne kadar?', intent: 'ucret' },
  { label: 'Kurumlar için ne var?', intent: 'kurum' },
  { label: 'Sen kimsin?', intent: 'jeksin' },
  { label: 'Bir numara yap!', intent: 'numara' },
];

// Everything Jeksın says comes from the page content.
const KB = {
  merhaba: { keys: ['merhaba', 'selam', 'hey', 'gunaydin', 'iyi gunler'], say: 'Merhaba! Ben Otter Jeksın. Programlar, süreler ya da başvuru hakkında ne sormak istersin?' },
  tesekkur: { keys: ['tesekkur', 'sagol', 'eyvallah', 'mersi'], say: 'Rica ederim! Başka bir sorun olursa buradayım.' },
  jeksin: {
    keys: ['kimsin', 'jeksin', 'samur', 'otter', 'adin', 'sen ne'],
    say: "Ben Otter Jeksın, Perga Tech Akademi'nin su samuru rehberiyim. Su samurları alet kullanabilen nadir hayvanlardan; benim aletim de bu tablet.",
  },
  sure: {
    keys: ['sure', 'saat', 'ne kadar sur', 'kac saat', 'kac hafta', 'uzun'],
    say: 'Öğretmen programları: AI Teacher 8 saat, AI Teacher Pro 16 saat, AI Teacher Lab 24 saat. Öğrenci programları: AI Start 16 saat, AI Creator 20 saat, AI Builder 36 saat.',
    act: [{ label: 'Programları göster', go: '#egitimler' }],
  },
  kodlama: {
    keys: ['kodlama', 'kod ', 'kod?', 'yazilim', 'programlama', 'teknik bilgi', 'bilgisayar bil'],
    say: 'Gerek yok. AI Teacher Lab ve AI Builder bile kodlama geçmişi istemiyor; uygulamayı yapay zekâ desteğiyle birlikte geliştiriyoruz.',
  },
  ucret: {
    keys: ['ucret', 'fiyat', 'para', 'odeme', 'indirim', 'kac tl', 'maliyet', 'ne kadar tutar'],
    say: 'Tarih, ücret ve katılım koşulları dönem bazında paylaşılıyor. Formu doldurursan güncel bilgiyi ekibim sana iletir.',
    act: [{ label: 'Formu aç', go: '#iletisim' }],
  },
  tarih: {
    keys: ['tarih', 'ne zaman', 'baslangic', 'takvim', 'donem', 'basliyor'],
    say: 'Tarihler dönem bazında açıklanıyor. Formu doldur, bir sonraki dönem açıldığında ekibim haber versin.',
    act: [{ label: 'Formu aç', go: '#iletisim' }],
  },
  ogretmen: {
    keys: ['ogretmen', 'ders plan', 'materyal', 'calisma kagidi'],
    say: 'Öğretmenler için üç adım var: AI Teacher (8 saat, başlangıç), AI Teacher Pro (16 saat, iş akışları), AI Teacher Lab (24 saat, kendi eğitim uygulamanı geliştirme).',
    act: [{ label: 'Öğretmen programları', go: 'track:ogretmen' }],
  },
  ogrenci: {
    keys: ['ogrenci', 'cocuk', 'veli', 'sinif', 'lise', 'ortaokul', 'genc'],
    say: 'Öğrenciler için: AI Start (5-8. sınıf, 16 saat), AI Creator (7-12. sınıf, 20 saat), AI Builder (lise, 36 saat). Gruplar yaşa ve seviyeye göre kuruluyor.',
    act: [{ label: 'Öğrenci programları', go: 'track:ogrenci' }],
  },
  kurum: {
    keys: ['kurum', 'okul', 'sirket', 'ekip', 'kurumsal', 'personel', 'calisan'],
    say: 'Kurumuna özel bir plan kuruyoruz: farkındalık seminerleri, uygulamalı eğitimler ve iş akışı geliştirme programları.',
    act: [{ label: 'Kurumsal eğitim', go: '#kurumsal' }],
  },
  seminer: {
    keys: ['seminer', 'workshop', 'atolye', 'etkinlik', 'kisa'],
    say: 'Seminerler: Yapay Zekâya İlk Adım, Eğitimde AI Kullanımı, Veliler için AI Rehberi, Bilgi Doğrulama. Workshoplar: Ders Paketi Hazırla, Etkili Prompt Yazımı, Hikâyeden Görsele, Kendi Quiz Uygulamanı Tasarla.',
    act: [{ label: 'Etkinlikleri göster', go: '#seminerler' }],
  },
  yontem: {
    keys: ['nasil ogren', 'yontem', 'uygulama', 'proje', 'cikti', 'ne yapacag'],
    say: 'Gerçek bir görevle başlıyoruz, eğitmen rehberliğinde üretiyoruz. Sonunda ders paketi, portfolyo, iş akışı ya da çalışan bir ürün çıkıyor. Kural basit: AI önerir, insan karar verir.',
  },
  kayit: {
    keys: ['kayit', 'basvur', 'nasil katil', 'katilmak', 'yazil'],
    say: 'Formu doldurman yeterli. Bilgi talebi kesin kayıt oluşturmaz; ekibim seninle konuşup sana uygun programı birlikte seçer.',
    act: [{ label: 'Formu aç', go: '#iletisim' }],
  },
};

const TRICK_LINES = {
  jump: 'Hop! Otter Jeksın formda.',
  spin: 'Bir tur attım, başım döndü!',
  flip: 'Geriye takla! Bunu sınıfta denemeyin.',
  dance: 'Biraz dans, öğrenmeye enerji!',
};

KB.iletisim = {
  keys: ['adres', 'nerede', 'iletisim', 'e-posta', 'eposta', 'mail', 'telefon', 'ulas', 'konum'],
  say: 'Bize hello@pergaakademi.com adresinden yazabilirsin. Adresimiz: Maslak Mah. Eski Büyükdere Cad. No: 21 İç Kapı No: 1 Sarıyer / İstanbul.',
  act: [{ label: 'Formu aç', go: '#iletisim' }],
};
KB.kvkk = {
  keys: ['kvkk', 'gizlilik', 'kisisel veri', 'verilerim', 'cerez', 'aydinlatma'],
  say: 'Kişisel verilerin KVKK Aydınlatma Metni kapsamında işleniyor. Benimle yaptığın sohbet ise cihazında kalıyor, hiçbir yere gönderilmiyor.',
  act: [{ label: 'KVKK metnini aç', go: '/kvkk.html' }],
};

const FALLBACK = {
  say: 'Bunu tam bilemedim. Sorunu ekibime iletmem için formu doldurabilirsin; sana kendileri dönerler.',
  act: [{ label: 'Formu aç', go: '#iletisim' }],
};

// program finder: a two-step conversation
const FINDER = {
  start: {
    say: 'Hemen bulalım. Sen kimsin?',
    opts: [
      { label: 'Öğretmenim', next: 'teacher' },
      { label: 'Öğrenciyim ya da veliyim', next: 'student' },
      { label: 'Kurum temsilcisiyim', result: { name: 'Kurumsal eğitim programı', role: 'kurum', interest: 'Kurumsal eğitim programı', go: '#kurumsal' } },
    ],
  },
  teacher: {
    say: 'Yapay zekâyla ne kadar tanışıksın?',
    opts: [
      { label: 'Yeni başlıyorum', result: { name: 'AI Teacher (8 saat)', role: 'ogretmen', interest: 'AI Teacher' } },
      { label: 'Kullanıyorum, iş akışı kurmak istiyorum', result: { name: 'AI Teacher Pro (16 saat)', role: 'ogretmen', interest: 'AI Teacher Pro' } },
      { label: 'Kendi eğitim uygulamamı yapmak istiyorum', result: { name: 'AI Teacher Lab (24 saat)', role: 'ogretmen', interest: 'AI Teacher Lab' } },
    ],
  },
  student: {
    say: 'Öğrenci kaçıncı sınıfta, ne yapmak istiyor?',
    opts: [
      { label: '5-8. sınıf, ilk adım', result: { name: 'AI Start (16 saat)', role: 'veli', interest: 'AI Start' } },
      { label: '7-12. sınıf, hikâye ve video üretmek', result: { name: 'AI Creator (20 saat)', role: 'veli', interest: 'AI Creator' } },
      { label: 'Lise, çalışan bir ürün geliştirmek', result: { name: 'AI Builder (36 saat)', role: 'veli', interest: 'AI Builder' } },
    ],
  },
};

const norm = (s) =>
  s
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşüâîû]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' })[c])
    .replace(/[^\w\s?]/g, ' ');

function answer(q) {
  const n = ` ${norm(q)} `;
  let best = null;
  let score = 0;
  for (const [id, item] of Object.entries(KB)) {
    const hits = item.keys.filter((k) => n.includes(k)).length;
    if (hits > score) {
      score = hits;
      best = id;
    }
  }
  return best ? { id: best, ...KB[best] } : FALLBACK;
}

// ------------------------------------------------------------------ store
const STORE = 'perga-jeksin-off';
const store = {
  get: () => {
    try {
      return localStorage.getItem(STORE) === '1';
    } catch {
      return false;
    }
  },
  set: (v) => {
    try {
      v ? localStorage.setItem(STORE, '1') : localStorage.removeItem(STORE);
    } catch {
      /* private mode: lasts for this visit */
    }
  },
};

// ------------------------------------------------------------------ main
export function createJeksin({ engine, reduce, mobile, navigate, prefill }) {
  const root = document.querySelector('[data-jx]');
  const btn = root.querySelector('.jx__otter');
  const canvas = btn.querySelector('canvas');
  const say = root.querySelector('.jx__say');
  const line = root.querySelector('.jx__line');
  const chips = root.querySelector('.jx__chips');
  const trail = document.querySelector('.jx__trail');
  const back = document.querySelector('.jx-return');
  const chat = document.getElementById('jx-chat');
  const log = chat.querySelector('.jx-chat__log');
  const chatChips = chat.querySelector('.jx-chat__chips');
  const ask = chat.querySelector('.jx-chat__ask');
  const nav = document.querySelector('[data-nav]');
  const spots = Object.fromEntries([...document.querySelectorAll('[data-jx-spot]')].map((el) => [el.dataset.jxSpot, el]));

  const api = { otter: null };
  let pinned = null; // where the reader dropped him
  let arrival = null; // trick to play when he reaches his spot
  let nextTrick = performance.now() + 18000;
  let lastWave = 0;
  let sayShift = 0;
  let off = store.get();
  let afterHero = false;
  let section = null;
  let talkTimer = 0;
  let chatOpen = false;
  let loading = false;
  let introduced = false;

  // ---- 3D otter -------------------------------------------------------
  function load() {
    if (api.otter || loading) return;
    loading = true;
    import('./otter.js')
      .then(({ createOtter }) => {
        api.otter = createOtter(canvas, { reduce, facing: -0.3 });
      })
      .catch(() => {
        off = true; // no WebGL: Jeksın stays home, the page is complete without him
        render();
        back.hidden = true;
      });
  }

  // ---- speech bubble ----------------------------------------------------
  function speak(entry, { hold = false, ms = mobile ? 3800 : 5600 } = {}) {
    clearTimeout(talkTimer);
    line.textContent = entry.text;
    chips.replaceChildren();
    for (const c of entry.chips || []) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'jx-chip';
      b.textContent = c.label;
      b.addEventListener('click', () => {
        if (c.chat) return openChat();
        if (c.role) prefill({ role: c.role });
        speak({ text: c.reply || 'Tamam!' }, { ms: 2600 });
        api.otter?.cheer();
        setTimeout(() => navigate(c.go), 450);
      });
      chips.append(b);
    }
    const interactive = !!(entry.chips && entry.chips.length);
    say.setAttribute('aria-hidden', interactive ? 'false' : 'true');
    say.inert = !interactive;
    root.classList.add('talking');
    api.otter?.talk(true);
    setTimeout(() => api.otter?.talk(false), Math.min(2600, entry.text.length * 55));
    // questions wait longer, but never sit on the content forever
    if (!hold) talkTimer = setTimeout(quiet, interactive ? 9000 : ms);
  }
  function quiet() {
    root.classList.remove('talking');
    say.inert = true;
    say.setAttribute('aria-hidden', 'true');
  }

  // ---- chat ----------------------------------------------------------------
  function bubble(who, text, actions = []) {
    const row = document.createElement('div');
    row.className = `jx-msg jx-msg--${who}`;
    const p = document.createElement('p');
    p.textContent = text;
    row.append(p);
    if (actions.length) {
      const a = document.createElement('div');
      a.className = 'jx-msg__acts';
      for (const act of actions) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'jx-chip jx-chip--act';
        b.textContent = act.label;
        b.addEventListener('click', () => {
          if (act.result || act.next) {
            // answer chosen: show it as the reader's reply, retire the options
            a.querySelectorAll('button').forEach((x) => (x.disabled = true));
            bubble('me', act.label);
          }
          if (act.result) return setTimeout(() => finish(act.result), reduce ? 0 : 300);
          if (act.next) return setTimeout(() => step(act.next), reduce ? 0 : 300);
          closeChat();
          navigate(act.go);
        });
        a.append(b);
      }
      row.append(a);
    }
    log.append(row);
    log.scrollTop = log.scrollHeight;
    if (who === 'jx') {
      api.otter?.talk(true);
      setTimeout(() => api.otter?.talk(false), Math.min(2400, text.length * 45));
    }
  }
  function step(id) {
    const s = FINDER[id];
    bubble('jx', s.say, s.opts.map((o) => ({ label: o.label, next: o.next, result: o.result })));
  }
  function finish(r) {
    prefill({ role: r.role, interest: r.interest });
    api.otter?.cheer();
    bubble('jx', `Sana önerim: ${r.name}. Formu senin için hazırladım; adını ve iletişim bilgini yazman yeterli.`, [{ label: 'Forma git', go: '#iletisim' }, ...(r.go ? [{ label: 'Önce programa bak', go: r.go }] : [])]);
  }
  function handle(text, intent) {
    if (text) bubble('me', text);
    const id = intent || answer(text).id;
    if (id === 'finder') return step('start');
    if (id === 'numara') {
      const name = api.otter?.trick();
      sparkle();
      return setTimeout(() => bubble('jx', TRICK_LINES[name] || 'Hareketli numaralarımı görmek için hareketi azaltma ayarını kapatman gerek.'), reduce ? 0 : 350);
    }
    const a = intent ? KB[intent] : answer(text);
    setTimeout(() => bubble('jx', a.say, a.act || []), reduce ? 0 : 350);
  }
  function renderQuick() {
    chatChips.replaceChildren();
    for (const q of QUICK) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'jx-chip';
      b.textContent = q.label;
      b.addEventListener('click', () => handle(q.label, q.intent));
      chatChips.append(b);
    }
  }
  ask.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = ask.q.value.trim();
    if (!q) return;
    ask.q.value = '';
    handle(q);
  });

  function openChat() {
    if (chatOpen) return;
    chatOpen = true;
    quiet();
    chat.hidden = false;
    root.classList.add('chatting');
    btn.setAttribute('aria-expanded', 'true');
    if (!log.children.length) {
      bubble('jx', "Otter Jeksın'a sormak istediğin bir şey var mı? Aşağıdan seçebilir ya da yazabilirsin.");
      renderQuick();
    }
    api.otter?.wave();
    requestAnimationFrame(() => chat.classList.add('open'));
    setTimeout(() => (mobile ? chat.querySelector('.jx-chip') : ask.q)?.focus({ preventScroll: true }), 60);
  }
  function closeChat({ restore = true } = {}) {
    if (!chatOpen) return;
    chatOpen = false;
    chat.classList.remove('open');
    root.classList.remove('chatting');
    btn.setAttribute('aria-expanded', 'false');
    setTimeout(() => !chatOpen && (chat.hidden = true), 300);
    if (restore) btn.focus({ preventScroll: true });
  }
  btn.addEventListener('click', () => (chatOpen ? closeChat() : openChat()));
  chat.querySelector('.jx-chat__close').addEventListener('click', () => closeChat());
  document.addEventListener('keydown', (e) => e.key === 'Escape' && chatOpen && closeChat());
  chat.querySelector('.jx-chat__hide').addEventListener('click', () => {
    closeChat({ restore: false });
    off = true;
    store.set(true);
    render();
    back.focus();
  });
  back.addEventListener('click', () => {
    off = false;
    store.set(false);
    render();
    speak({ text: 'Geri döndüm! Otter Jeksın senin için çalışıyor.' });
    btn.focus({ preventScroll: true });
  });

  // ---- welcome gate: the page waits for one answer --------------------------------
  const gate = document.getElementById('jx-gate');
  const gateCard = gate.querySelector('.jx-gate__card');
  const hero = document.getElementById('hero');
  const pageRegions = [document.getElementById('icerik'), document.querySelector('.foot'), document.querySelector('.nav')];
  let gateActive = false;
  let gatePassed = false;
  let gateArmed = false; // set once the reader is above the gate line
  const GATE_REPLIES = {
    ogretmen: { role: 'ogretmen', go: 'track:ogretmen', text: 'Harika! Seni öğretmen programlarına götürüyorum.' },
    ogrenci: { role: 'veli', go: 'track:ogrenci', text: 'Süper! Öğrenci programlarına yüzüyoruz.' },
    kurum: { role: 'kurum', go: '#kurumsal', text: 'Anladım, kurumsal plana geçiyoruz.' },
    kesif: { text: 'Harika, birlikte keşfedelim! Ben hep yanında olacağım.' },
  };
  const gateY = () => hero.offsetTop + hero.offsetHeight - innerHeight; // the hero's last frame
  // Decide once the page has settled (scroll restoration done): readers who
  // start above the gate get the question; deep links and mid-page reloads don't.
  const decideGate = () =>
    setTimeout(() => {
      if (gatePassed) return;
      if (!location.hash && window.scrollY < gateY() - 4) gateArmed = true;
      else gatePassed = true;
    }, 60);
  document.readyState === 'complete' ? decideGate() : window.addEventListener('load', decideGate, { once: true });

  const blockScroll = (e) => {
    if (gateActive && !gateCard.contains(e.target)) e.preventDefault();
  };
  const blockKeys = (e) => {
    if (!gateActive) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      return choose('kesif'); // an escape route that equals the free option
    }
    if (e.key === 'Tab') {
      // keep focus inside the question
      const opts = [...gate.querySelectorAll('button')];
      const i = opts.indexOf(document.activeElement);
      e.preventDefault();
      opts[(i + (e.shiftKey ? -1 : 1) + opts.length) % opts.length].focus();
      return;
    }
    if ([' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key) && !e.target.closest('.jx-gate__opt')) e.preventDefault();
  };

  function openGate() {
    gateActive = true;
    engine.scrollTo(gateY(), { immediate: true });
    engine.lenis?.stop();
    document.documentElement.classList.add('gate-open');
    window.addEventListener('wheel', blockScroll, { passive: false });
    window.addEventListener('touchmove', blockScroll, { passive: false });
    window.addEventListener('keydown', blockKeys, true);
    pageRegions.forEach((r) => r && (r.inert = true));
    if (chatOpen) closeChat({ restore: false });
    quiet();
    gate.hidden = false;
    requestAnimationFrame(() => gate.classList.add('open'));
    render();
    // he surfaces from below, big, in the middle
    pos.x = innerWidth / 2 - BASE() * 0.4;
    pos.y = innerHeight;
    pos.s = 0.5;
    setTimeout(() => {
      api.otter?.wave();
      api.otter?.talk(true);
      setTimeout(() => api.otter?.talk(false), 2200);
    }, reduce ? 0 : 500);
    setTimeout(() => gate.querySelector('.jx-gate__opt')?.focus({ preventScroll: true }), reduce ? 0 : 450);
  }
  function choose(choice) {
    if (!gateActive) return;
    const r = GATE_REPLIES[choice];
    gateActive = false;
    gatePassed = true;
    introduced = true;
    gate.classList.remove('open');
    document.documentElement.classList.remove('gate-open');
    window.removeEventListener('wheel', blockScroll);
    window.removeEventListener('touchmove', blockScroll);
    window.removeEventListener('keydown', blockKeys, true);
    pageRegions.forEach((x) => x && (x.inert = false));
    engine.lenis?.start();
    setTimeout(() => (gate.hidden = true), 400);
    if (r.role) prefill({ role: r.role });
    api.otter?.trick(choice === 'kesif' ? 'spin' : 'jump');
    speak({ text: r.text }, { ms: 3200 });
    if (r.go) setTimeout(() => navigate(r.go), reduce ? 0 : 500);
    render(); // if the reader had hidden him before, he leaves again
    if (!root.hidden) btn.focus({ preventScroll: true });
  }
  gate.querySelectorAll('[data-choice]').forEach((b) => b.addEventListener('click', () => choose(b.dataset.choice)));
  // links (nav, hero buttons, deep links) are a choice too: no gate after them
  api.gateState = () => ({ gateArmed, gatePassed, gateActive });
  api.passGate = () => {
    if (gateActive) return;
    gatePassed = true;
  };

  // ---- which section is being read ---------------------------------------------
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const id = e.target.id || 'footer';
        if (id === section) continue;
        section = id;
        pinned = null;
        arrival = ['jump', 'spin', 'wave', 'jump'][Math.floor(Math.random() * 4)];
        if (!root.hidden && introduced && !chatOpen) {
          speak((id === 'hedef' && gatePassed && LINES.hedefAfterGate) || LINES[id] || { text: '' });
          if (id === 'footer') api.otter?.wave();
        }
      }
    },
    { rootMargin: '-50% 0px -49% 0px' }
  );
  document.querySelectorAll('main > section[id]:not(#hero), footer').forEach((s) => io.observe(s));

  if (mobile) {
    document.addEventListener('focusin', (e) => e.target.matches('.form input, .form select') && root.classList.add('typing'));
    document.addEventListener('focusout', () => root.classList.remove('typing'));
  }

  function render() {
    const show = gateActive || (afterHero && !off);
    root.hidden = !show;
    back.hidden = !(afterHero && off);
    if (!show && chatOpen) closeChat({ restore: false });
    if (show) load();
  }

  // ---- motion: spring towards the active spot, bubbles while swimming ---------
  const BASE = () => btn.offsetWidth || 288; // canvas box in CSS px, scaled per spot
  const pos = { x: innerWidth * 0.5, y: innerHeight, s: 0.2 };
  const vel = { x: 0, y: 0, s: 0 };
  let lastBubble = 0;
  let idle = 0;
  let floating = false;
  let lastY = scrollY;

  function target(vw, vh) {
    const base = BASE();
    const m = 12;
    if (gateActive) {
      const r = gateCard.getBoundingClientRect();
      const s = Math.min(Math.max((r.top - 64) / (base * 0.9), 0.38), mobile ? 0.72 : 1.05);
      const w = base * s;
      return { x: vw / 2 - w / 2, y: r.top - w * 0.9, s };
    }
    if (chatOpen) {
      const r = chat.getBoundingClientRect();
      const s = mobile ? 0.36 : 0.5;
      const w = base * s;
      return mobile ? { x: vw - w - m, y: r.top - w * 0.92, s } : { x: r.left - w * 0.78, y: r.top + 8, s };
    }
    // the hello happens low on the screen, never over a heading
    if (!introduced) return { x: vw / 2 - base * 0.3, y: vh - base * 0.6 - 16, s: 0.6 };
    if (pinned) {
      const w = base * pinned.s;
      return { x: Math.min(Math.max(pinned.x, m), vw - w - m), y: Math.min(Math.max(pinned.y, 76), vh - w - m), s: pinned.s };
    }
    const park = () => {
      // his spot is off screen: wait in the bottom corner, out of the reading line
      const s = mobile ? 0.36 : 0.5;
      const w = base * s;
      return { x: vw - w - m, y: vh - w - m, s };
    };
    const spot = spots[section];
    if (!spot) return park();
    const r = spot.getBoundingClientRect();
    if (r.bottom < 76 + r.height * 0.35 || r.top > vh - r.height * 0.35) return park();
    const s = Math.max(0.3, r.width / base);
    const w = base * s;
    return {
      x: Math.min(Math.max(r.left, m), vw - w - m),
      y: Math.min(Math.max(r.top, 76), vh - w - m),
      s,
    };
  }

  // ---- effects -------------------------------------------------------------
  const COLORS = ['var(--green)', 'var(--blue)', 'var(--coral)', 'var(--yellow)'];
  function sparkle(n = 14) {
    if (reduce) return;
    const w = BASE() * pos.s;
    const cx = pos.x + w / 2;
    const cy = pos.y + w * 0.45;
    for (let i = 0; i < n; i++) {
      const d = document.createElement('span');
      d.className = 'jx-spark';
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const r = w * (0.45 + Math.random() * 0.35);
      d.style.cssText = `left:${cx}px;top:${cy}px;--dx:${(Math.cos(a) * r).toFixed(0)}px;--dy:${(Math.sin(a) * r).toFixed(0)}px;background:${COLORS[i % 4]}`;
      trail.append(d);
      setTimeout(() => d.remove(), 900);
    }
  }
  function splash() {
    if (reduce) return;
    const w = BASE() * pos.s;
    const d = document.createElement('span');
    d.className = 'jx-splash';
    d.style.cssText = `left:${pos.x + w / 2}px;top:${pos.y + w * 0.86}px;width:${w * 0.9}px;height:${w * 0.22}px`;
    trail.append(d);
    setTimeout(() => d.remove(), 800);
  }
  api.celebrate = () => {
    api.otter?.trick('flip');
    setTimeout(sparkle, 450);
  };

  // hover: he waves back (mouse only, not more than every few seconds)
  btn.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse' || dragging || performance.now() - lastWave < 4000) return;
    lastWave = performance.now();
    api.otter?.wave();
  });

  // ---- drag him anywhere; a click still opens the chat ------------------------
  let press = null;
  let dragging = false;
  let suppressClick = false;
  let lastPointer = null;
  btn.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    press = { x: e.clientX, y: e.clientY, ox: e.clientX - pos.x, oy: e.clientY - pos.y, id: e.pointerId };
  });
  btn.addEventListener('pointermove', (e) => {
    if (!press || e.pointerId !== press.id) return;
    if (!dragging && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 6) {
      dragging = true;
      try {
        btn.setPointerCapture(e.pointerId);
      } catch {
        /* capture is a nicety; dragging still works without it */
      }
      root.classList.add('held');
      if (chatOpen) closeChat({ restore: false });
      api.otter?.setHeld(true);
      speak({ text: 'Hey! Beni nereye götürüyorsun?' }, { ms: 2200 });
    }
    if (dragging) {
      const now = performance.now();
      if (lastPointer) {
        const dt = Math.max(1, now - lastPointer.t) / 1000;
        vel.x = (e.clientX - lastPointer.x) / dt;
        vel.y = (e.clientY - lastPointer.y) / dt;
      }
      lastPointer = { x: e.clientX, y: e.clientY, t: now };
      pos.x = e.clientX - press.ox;
      pos.y = e.clientY - press.oy;
    }
  });
  const release = (e) => {
    if (!press || (e && e.pointerId !== press.id)) return;
    if (dragging) {
      dragging = false;
      suppressClick = true;
      root.classList.remove('held');
      pinned = { x: pos.x, y: pos.y, s: pos.s };
      vel.x = vel.y = 0;
      api.otter?.setHeld(false);
      splash();
      sparkle(8);
      const lines = ['Burası da güzelmiş!', 'Hop, indim! Buradan izliyorum.', 'Yeni yerim burası mı? Olur!'];
      speak({ text: lines[Math.floor(Math.random() * lines.length)] }, { ms: 2600 });
    }
    press = null;
    lastPointer = null;
  };
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
  btn.addEventListener(
    'click',
    (e) => {
      if (suppressClick) {
        suppressClick = false;
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true
  );
  // keyboard alternative to dragging: arrow keys move him
  btn.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 120 : 40;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    pinned = { x: (pinned?.x ?? pos.x) + d[0], y: (pinned?.y ?? pos.y) + d[1], s: pos.s };
  });

  engine.onFrame((y, vh, dt) => {
    if (gateArmed && !gatePassed && !gateActive && y >= gateY() - 4) openGate();
    const past = nav.dataset.theme === 'day';
    if (past !== afterHero) {
      afterHero = past;
      render();
      if (past && !off && !introduced && gatePassed && !gateActive) {
        // surfacing from the hero's water, then a hello
        pos.x = innerWidth / 2 - BASE() * 0.35;
        pos.y = vh * 0.9;
        pos.s = 0.3;
        speak(LINES.intro, { ms: 4200 });
        setTimeout(() => api.otter?.wave(), 300);
        setTimeout(() => {
          introduced = true;
          if (section) speak(LINES[section] || LINES.intro);
        }, reduce ? 0 : 3200);
      }
    }
    if (root.hidden) {
      lastY = y;
      return;
    }
    const vw = innerWidth;
    const t = target(vw, vh);
    if (dragging) {
      // he hangs from the pointer; velocity decays so he settles when the hand stops
      vel.x *= 0.85;
      vel.y *= 0.85;
    } else if (reduce) {
      Object.assign(pos, t);
    } else {
      // critically damped spring
      const k = 26;
      const d = 2 * Math.sqrt(k) * 0.92;
      for (const key of ['x', 'y', 's']) {
        const scale = key === 's' ? 1 : 1;
        vel[key] += ((t[key] - pos[key]) * k - vel[key] * d) * dt * scale;
        pos[key] += vel[key] * dt;
      }
    }
    const w = BASE() * pos.s;
    root.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`;
    root.style.setProperty('--jx-s', pos.s.toFixed(4));
    root.style.setProperty('--jx-w', `${w.toFixed(1)}px`);
    root.classList.toggle('on-left', pos.x + w / 2 < vw / 2);
    root.classList.toggle('say-below', pos.y < vh * 0.34); // no room above: talk from below
    // keep the speech bubble inside the screen
    if (root.classList.contains('talking') || root.classList.contains('held')) {
      const r = say.getBoundingClientRect();
      const natural = r.left - sayShift;
      const want = Math.min(Math.max(natural, 8), vw - 8 - r.width) - natural;
      if (Math.abs(want - sayShift) > 0.5) {
        sayShift = want;
        say.style.translate = `${sayShift.toFixed(1)}px 0`;
      }
    }

    if (floating && api.otter && !api.otter.isFloating()) {
      floating = false; // a trick or a reply woke him up
      root.classList.remove('floating');
    }
    const speed = Math.hypot(vel.x, vel.y);
    const dist = Math.hypot(t.x - pos.x, t.y - pos.y);
    if (api.otter && !dragging) {
      if (arrival && dist < 24 && speed < 120) {
        arrival === 'wave' ? api.otter.wave() : api.otter.trick(arrival);
        arrival = null;
        nextTrick = performance.now() + 15000 + Math.random() * 10000;
      } else if (performance.now() > nextTrick && !chatOpen && dist < 24) {
        // every so often, a little show
        const name = api.otter.trick();
        if (name && Math.random() < 0.5 && !root.classList.contains('talking')) speak({ text: TRICK_LINES[name] }, { ms: 2400 });
        nextTrick = performance.now() + 15000 + Math.random() * 10000;
      }
    }
    if (api.otter) {
      api.otter.setTravel(vel.x / (dragging ? 2200 : 1600), vel.y / (dragging ? 2200 : 1600));
      api.otter.face(pos.x + w / 2 > vw / 2 ? -0.35 : 0.35);
      const sv = dt > 0 ? (y - lastY) / dt : 0;
      if (Math.abs(sv) > 30) {
        api.otter.setVelocity(sv / 2400);
        idle = 0;
        if (floating) {
          floating = false;
          root.classList.remove('floating');
          api.otter.setFloat(false);
        }
      } else if (!reduce && speed < 20) {
        idle += dt;
        if (idle > 3.2 && !floating && !chatOpen && !root.classList.contains('talking')) {
          floating = true;
          root.classList.add('floating');
          api.otter.setFloat(true);
        }
      }
    }
    lastY = y;

    // bubbles behind him while he swims
    if (!reduce && speed > 260 && performance.now() - lastBubble > 90) {
      lastBubble = performance.now();
      const b = document.createElement('span');
      b.className = 'jx-bub';
      const size = 6 + Math.random() * 10;
      b.style.cssText = `left:${(pos.x + w * (0.3 + Math.random() * 0.4)).toFixed(0)}px;top:${(pos.y + w * 0.6).toFixed(0)}px;width:${size}px;height:${size}px`;
      trail.append(b);
      setTimeout(() => b.remove(), 1400);
    }
  });

  render();
  return api;
}
