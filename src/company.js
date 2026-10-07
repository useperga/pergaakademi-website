// One place for the company's legal identity. Used by the form, the footer
// script and the legal pages, so a change here changes it everywhere.
export const COMPANY = {
  title: 'Perga Tech Yeni Nesil Teknolojiler Anonim Şirketi',
  brand: 'Perga Tech Akademi',
  address: 'Maslak Mah. Eski Büyükdere Cad. No: 21 İç Kapı No: 1 Sarıyer / İstanbul',
  mersis: '0728090143800001',
  registry: '1163174',
  email: 'hello@pergaakademi.com',
};

/*
  Enquiry delivery. The site is static, so a form relay delivers submissions
  to the inbox: FormSubmit (https://formsubmit.co). The very first submission
  triggers a one-time activation e-mail to COMPANY.email; after that click,
  every request arrives as a table-formatted e-mail.

  To switch provider later, change FORM_ENDPOINT and the payload in send().
*/
export const FORM_ENDPOINT = `https://formsubmit.co/ajax/${COMPANY.email}`;

const ROLE_LABEL = { ogretmen: 'Öğretmen', veli: 'Veli / öğrenci', kurum: 'Kurum temsilcisi' };

export function toPayload(data) {
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((data.iletisim || '').trim());
  return {
    _subject: `Program bilgi talebi: ${data.ad} (${ROLE_LABEL[data.rol] || data.rol})`,
    _template: 'table',
    _captcha: 'false',
    _honey: data._honey || '',
    ...(isEmail ? { _replyto: data.iletisim.trim() } : {}),
    'Ad soyad': data.ad,
    'E-posta veya telefon': data.iletisim,
    Rol: ROLE_LABEL[data.rol] || data.rol,
    'İlgilendiği eğitim': data.egitim,
    'Seçtiği etkinlik': data.etkinlik || '-',
    'Yurt dışı aktarım için açık rıza': data.riza ? 'Verildi' : 'Verilmedi',
    Sayfa: location.href,
    'Gönderim zamanı': new Date().toLocaleString('tr-TR'),
  };
}

export async function send(data, { timeout = 15000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(toPayload(data)),
      signal: ctrl.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false || json.success === 'false') throw new Error(json.message || `HTTP ${res.status}`);
    return json;
  } finally {
    clearTimeout(timer);
  }
}

// Fallback when the relay cannot be reached: the reader's own mail app, pre-filled.
export function mailtoFor(data) {
  const body = [
    `Ad soyad: ${data.ad}`,
    `E-posta veya telefon: ${data.iletisim}`,
    `Rol: ${ROLE_LABEL[data.rol] || data.rol}`,
    `İlgilendiğim eğitim: ${data.egitim}`,
    data.etkinlik ? `Seçtiğim etkinlik: ${data.etkinlik}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return `mailto:${COMPANY.email}?subject=${encodeURIComponent('Program bilgi talebi')}&body=${encodeURIComponent(body)}`;
}
