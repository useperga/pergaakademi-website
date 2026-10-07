/*
  "Çerez Tercihleri": an honest preferences dialog. The site sets no
  advertising, analytics or tracking cookies; it only keeps small functional
  preferences in the browser's local storage. The dialog says exactly that and
  lets the visitor clear them.
*/
const LOCAL_KEYS = ['perga-jeksin-off'];

export function setupCookiePrefs() {
  const dlg = document.createElement('dialog');
  dlg.className = 'prefs';
  dlg.setAttribute('aria-labelledby', 'prefs-title');
  dlg.innerHTML = `
    <form method="dialog" class="prefs__card">
      <h2 id="prefs-title">Çerez Tercihleri</h2>
      <p>Bu sitede reklam, analiz ya da takip amaçlı çerez kullanılmıyor. Yalnızca sitenin çalışması için gerekli küçük tercihler (örneğin Otter Jeksın'ı gizleme tercihiniz) tarayıcınızın yerel depolamasında saklanır.</p>
      <label class="prefs__row">
        <input type="checkbox" checked disabled />
        <span><b>Zorunlu ve işlevsel tercihler</b><br />Her zaman açık. Sitenin çalışması için gereklidir.</span>
      </label>
      <label class="prefs__row prefs__row--off">
        <input type="checkbox" disabled />
        <span><b>Analiz ve pazarlama çerezleri</b><br />Kullanılmıyor.</span>
      </label>
      <p class="prefs__status" role="status"></p>
      <div class="prefs__acts">
        <button type="button" class="btn btn--line-ink prefs__clear">Yerel tercihlerimi temizle</button>
        <button class="btn btn--accent" value="close">Kapat</button>
      </div>
      <p class="prefs__more">Ayrıntılar için <a href="/cerez-politikasi.html">Çerez Politikası</a>.</p>
    </form>`;
  document.body.append(dlg);
  const status = dlg.querySelector('.prefs__status');
  dlg.querySelector('.prefs__clear').addEventListener('click', () => {
    try {
      LOCAL_KEYS.forEach((k) => localStorage.removeItem(k));
      status.textContent = 'Yerel tercihleriniz temizlendi.';
    } catch {
      status.textContent = 'Tarayıcınız yerel depolamaya erişime izin vermiyor; saklanan bir tercih yok.';
    }
  });
  dlg.addEventListener('close', () => (status.textContent = ''));
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-cookie-prefs]');
    if (!t) return;
    e.preventDefault();
    dlg.showModal();
  });
}
