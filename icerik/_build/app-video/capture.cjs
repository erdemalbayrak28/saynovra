// Records each product at phone size as numbered JPEG frames (30 fps timeline) plus a meta.json describing
// the steps (callout title + text), where each step points on screen, the taps and the page cuts.
// Scrolls and taps are driven frame by frame so the result is crisp and repeatable.
// Usage: node capture.cjs <out_dir> [bahce|tercume|crm|muh ...]
const fs = require('fs');
const path = require('path');
const { open, loginCrm, loginMuhasebe, URLS, VIEWPORT } = require('./lib.cjs');

const OUT = process.argv[2];
const ONLY = process.argv.slice(3);
const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
const LEAD = 22;   // frames a new callout is on screen before its tap happens
const READ = 54;   // frames to hold after an action so the callout can be read

class Recorder {
  constructor(page, name) {
    this.page = page;
    this.dir = path.join(OUT, name);
    this.frame = 0;
    this.steps = [];
    this.taps = [];
    this.cuts = [];
    fs.rmSync(this.dir, { recursive: true, force: true });
    fs.mkdirSync(this.dir, { recursive: true });
  }

  file(i) { return path.join(this.dir, `${String(i).padStart(4, '0')}.jpg`); }

  async snap() {
    await this.page.screenshot({ path: this.file(this.frame), type: 'jpeg', quality: 90 });
    this.frame += 1;
  }

  repeat(times) {
    for (let i = 0; i < times; i++) { fs.copyFileSync(this.file(this.frame - 1), this.file(this.frame)); this.frame += 1; }
  }

  // One screenshot repeated: for moments where nothing on screen moves.
  async hold(frames) { await this.snap(); this.repeat(frames - 1); }

  // Live screenshots, each shown for two frames so the app's own transitions play at about real speed.
  async burst(shots) { for (let i = 0; i < shots; i++) { await this.snap(); this.repeat(1); } }

  cut() { this.cuts.push(this.frame); }

  async prepare() {
    await this.page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      if (document.getElementById('__tap')) return;
      const dot = document.createElement('div');
      dot.id = '__tap';
      dot.style.cssText = 'position:fixed;z-index:2147483647;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;' +
        'background:rgba(255,255,255,.38);border:2px solid rgba(255,255,255,.95);box-shadow:0 2px 14px rgba(0,0,0,.45);pointer-events:none;opacity:0;';
      document.body.appendChild(dot);
    });
  }

  // ── steps and anchors ──────────────────────────────
  step(title, text) {
    this.closeAnchor();
    this.steps.push({ frame: this.frame, title, text, anchors: [] });
  }

  anchor(point) {
    const step = this.steps.at(-1);
    if (!step) return;
    this.closeAnchor();
    step.anchors.push({ frame: this.frame, ...point, until: null });
  }

  closeAnchor(at = this.frame) {
    const anchor = this.steps.at(-1)?.anchors.at(-1);
    if (anchor && anchor.until === null) anchor.until = at;
  }

  // A step that points at an element (outlined on screen) instead of tapping it.
  async note(title, text, selector, { pad = 6 } = {}) {
    const box = await this.page.locator(selector).first().boundingBox();
    this.step(title, text);
    if (!box) return;
    const x0 = Math.max(4, box.x - pad), y0 = Math.max(4, box.y - pad);
    const x1 = Math.min(VIEWPORT.width - 4, box.x + box.width + pad), y1 = Math.min(VIEWPORT.height - 4, box.y + box.height + pad);
    if (x1 - x0 < 8 || y1 - y0 < 8) throw new Error(`note target is off screen: ${selector}`);
    this.anchor({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, box: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } });
  }

  // ── motion ─────────────────────────────────────────
  async scrollTo(target, frames) {
    this.closeAnchor();
    const from = await this.page.evaluate(() => window.scrollY);
    for (let i = 1; i <= frames; i++) {
      const y = from + (target - from) * ease(i / frames);
      await this.page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
      await this.snap();
    }
  }

  async scrollToEl(selector, frames, offset = 90) {
    const top = await this.page.locator(selector).first().evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    await this.scrollTo(Math.max(0, top - offset), frames);
  }

  // Brings the element into a comfortable spot, optionally opens a new step, shows a fingertip and runs the action.
  async tap(selector, action, { step = null, after = 6, nav = false } = {}) {
    const locator = this.page.locator(selector).first();
    const where = await locator.evaluate((el) => {
      let pinned = false, scroller = null;
      for (let n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
        const style = getComputedStyle(n);
        if (style.position === 'fixed' || style.position === 'sticky') pinned = true;
        if (!scroller && n !== el && /auto|scroll/.test(style.overflowY) && n.scrollHeight > n.clientHeight + 4) scroller = n;
      }
      let moved = false;
      if (scroller) {
        const r = el.getBoundingClientRect(), frame = scroller.getBoundingClientRect();
        if (r.top < frame.top + 8 || r.bottom > Math.min(frame.bottom, window.innerHeight) - 8) {
          scroller.scrollTop += r.top + r.height / 2 - (frame.top + Math.min(frame.height, window.innerHeight) / 2);
          moved = true;
        }
      }
      return { pinned, moved, scrollY: window.scrollY };
    });
    if (where.moved) { this.closeAnchor(); await this.burst(2); }
    let box = await locator.boundingBox();
    if (!where.pinned && (box.y + box.height > VIEWPORT.height - 100 || (box.y < 100 && where.scrollY > 0))) {
      const top = await locator.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
      await this.scrollTo(Math.max(0, top - VIEWPORT.height * 0.42), 26);
      box = await locator.boundingBox();
    }
    if (box.x + box.width / 2 < 0 || box.x + 12 > VIEWPORT.width) throw new Error(`tap target is off screen sideways: ${selector}`);
    const x = box.x + Math.min(box.width / 2, 150);
    const y = box.y + box.height / 2;

    if (step) this.step(step[0], step[1]);
    this.anchor({ x, y });
    await this.hold(step ? LEAD : 8);

    const dot = (opacity, scale) => this.page.evaluate(([px, py, o, s]) => {
      const el = document.getElementById('__tap');
      el.style.left = `${px}px`; el.style.top = `${py}px`; el.style.opacity = o; el.style.transform = `scale(${s})`;
    }, [x, y, opacity, scale]);
    for (const [o, s] of [[0.45, 1.6], [0.7, 1.35], [0.9, 1.15], [1, 1], [1, 0.82]]) { await dot(o, s); await this.snap(); }
    await this.snap();
    this.taps.push({ frame: this.frame, x, y });
    await action(locator);
    if (nav) { await this.page.waitForLoadState('networkidle'); this.cut(); }
    await this.page.evaluate(() => { if (window.scrollX) window.scrollTo({ left: 0, top: window.scrollY, behavior: 'instant' }); });
    await this.prepare();
    this.closeAnchor(this.frame + 12);
    for (const [o, s] of [[0.6, 1.1], [0.3, 1.45]]) { await dot(o, s); await this.snap(); }
    await dot(0, 1);
    await this.burst(after);
  }

  async type(selector, text, perChar = 3) {
    const locator = this.page.locator(selector).first();
    await locator.evaluate((el) => { el.focus({ preventScroll: true }); el.value = ''; });
    for (const char of text) {
      await locator.evaluate((el, c) => { el.value += c; el.dispatchEvent(new Event('input', { bubbles: true })); }, char);
      await this.hold(perChar);
    }
    await locator.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
  }

  save() {
    this.closeAnchor();
    fs.writeFileSync(path.join(this.dir, 'meta.json'), JSON.stringify({ frames: this.frame, steps: this.steps, taps: this.taps, cuts: this.cuts }));
    console.log(path.basename(this.dir), this.frame, 'frames', `(${(this.frame / 30).toFixed(1)} s),`, this.steps.length, 'steps');
  }
}

const click = (locator) => locator.evaluate((el) => el.click());
const focus = (locator) => locator.evaluate((el) => el.focus({ preventScroll: true }));
const pick = (label) => (locator) => locator.selectOption(label);
const setValue = (value) => (locator) => locator.evaluate((el, v) => {
  el.value = v;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}, value);
const isoDate = (offsetDays) => new Date(Date.now() + offsetDays * 864e5).toISOString().slice(0, 10);

// ── mekân (bahçe) sitesi ─────────────────────────────
async function bahce(page) {
  const rec = new Recorder(page, 'bahce');
  await page.goto(`${URLS.site}/nazaybahce/?lang=tr`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await rec.prepare();
  await rec.hold(26);
  await rec.note('Açılış ekranı', 'Mekânı ilk bakışta anlatan giriş ve tek dokunuşla WhatsApp.', '.hero-buttons .btn-whatsapp');
  await rec.hold(READ + 8);

  await rec.tap('.mobile-toggle', click, { step: ['Mobil menü', 'Tüm bölümler tek dokunuş uzağında.'], after: 6 });
  await rec.hold(44);
  await rec.tap('.nav-links a[href="#hizmetlerimiz"]', async (l) => {
    await click(l);
    await page.evaluate(() => { const icon = document.querySelector('.mobile-toggle i'); icon?.classList.remove('fa-times'); icon?.classList.add('fa-bars'); });
  }, { after: 3 });
  await rec.scrollToEl('#hizmetlerimiz', 54, 60);
  await rec.note('Organizasyon kartları', 'Her etkinlik türü kendi kartında; detay için tek dokunuş.', '#hizmetlerimiz .service-card');
  await rec.hold(READ + 10);

  await rec.scrollToEl('#inquiryForm', 64, 150);
  await rec.hold(6);
  await rec.tap('#eventType', pick('Butik Nişan'), { step: ['Rezervasyon formu', 'Etkinlik türü, kişi sayısı, menü ve tarih seçilir.'], after: 3 });
  await rec.hold(12);
  await rec.tap('#guestCount', pick('60 - 80 Kişi'), { after: 3 });
  await rec.hold(10);
  await rec.tap('#cateringPref', pick('Meze Menü'), { after: 3 });
  await rec.hold(10);
  await rec.tap('#eventDate', setValue(isoDate(20)), { after: 3 });
  await rec.hold(10);
  await rec.tap('#clientName', focus, { after: 1 });
  await rec.type('#clientName', 'Deniz Acar');
  await rec.hold(12);
  await rec.tap('#sendWhatsappBtn', click, { step: ["WhatsApp'a hazır mesaj", 'Form, doldurulmuş bir mesajla WhatsApp sohbetini açar.'], after: 3 });
  await rec.hold(READ + 6);

  await rec.scrollToEl('.space-tabs', 60, 150);
  await rec.hold(6);
  await rec.tap('.space-tabs .tab-btn >> nth=1', click, { step: ['Mekân sekmeleri', 'Bahçe ve gelin odası ayrı sekmelerde, kaydırmalı fotoğraflarla.'], after: 6 });
  await rec.hold(34);
  await rec.tap('.space-content.active .next-btn', click, { after: 6 });
  await rec.hold(26);
  await rec.tap('.space-content.active .next-btn', click, { after: 6 });
  await rec.hold(34);

  await rec.scrollToEl('.gallery-filters', 60, 190);
  await rec.hold(6);
  await rec.tap('.filter-btn[data-filter="yemekli"]', click, { step: ['Filtrelenebilir galeri', 'Ziyaretçi aradığı konsepti tek dokunuşla süzer.'], after: 6 });
  await rec.hold(48);
  await rec.tap('.gallery-item:visible', click, { step: ['Tam ekran fotoğraf', 'Fotoğrafa dokununca büyür.'], after: 8 });
  await rec.hold(48);
  await rec.tap('.lightbox-close', click, { after: 6 });

  await rec.scrollToEl('#sss .faq-wrapper', 70, 230);
  await rec.hold(6);
  await rec.tap('#sss .faq-item >> nth=1 >> .faq-question', click, { step: ['Sık sorulan sorular', 'Cevap, soruya dokununca açılır.'], after: 10 });
  await rec.hold(READ + 12);
  rec.save();
}

// ── kurumsal (tercüme) site ──────────────────────────
async function tercume(page) {
  const rec = new Recorder(page, 'tercume');
  await page.goto(`${URLS.site}/nazaytercume/?lang=tr`, { waitUntil: 'networkidle' });
  // Reviewer names are third-party personal data: blurred in the recording.
  await page.addStyleTag({ content: '.reviewer-name, .reviewer-avatar { filter: blur(7px) !important; }' });
  await page.waitForTimeout(1500);
  await rec.prepare();
  await rec.hold(26);
  await rec.note('Açılış ekranı', 'Güven veren rakamlar ve iki net çağrı butonu.', '.hero-stats');
  await rec.hold(READ + 8);

  await rec.tap('#lang-current', click, { step: ['3 dilli site', 'Türkçe, İngilizce ve Arapça tek dokunuşla değişir.'], after: 5 });
  await rec.hold(16);
  await rec.tap('#lang-menu [data-lang="en"]', click, { after: 8 });
  await rec.hold(40);
  await rec.tap('#lang-current', click, { after: 5 });
  await rec.tap('#lang-menu [data-lang="ar"]', click, { step: ['Sağdan sola düzen', 'Arapçada tüm sayfa kendiliğinden sağdan sola döner.'], after: 8 });
  await rec.hold(READ);
  await rec.tap('#lang-current', click, { after: 5 });
  await rec.tap('#lang-menu [data-lang="tr"]', click, { after: 8 });
  await rec.hold(14);

  await rec.scrollToEl('#hizmetlerimiz .service-card', 64, 200);
  await rec.burst(8);
  await rec.note('Hizmet kartları', 'Her hizmetin açıklaması ve bilgi al bağlantısı ayrı kartta.', '#hizmetlerimiz .service-card');
  await rec.hold(READ + 8);

  await rec.scrollToEl('.process-steps', 70, 240);
  await rec.burst(8);
  await rec.note('Süreç anlatımı', 'İşin nasıl ilerlediği dört kolay adımda gösterilir.', '.process-step');
  await rec.hold(30);
  const processTop = await page.evaluate(() => window.scrollY);
  await rec.scrollTo(processTop + 330, 44);
  await rec.hold(12);

  await rec.scrollToEl('#quote-form', 64, 110);
  await rec.burst(8);
  await rec.tap('#qf-doctype', (l) => l.selectOption({ index: 1 }), { step: ['Teklif formu', 'Belge türü, sayfa sayısı, dil ve teslim süresi seçilir.'], after: 3 });
  await rec.hold(10);
  await rec.tap('#qf-pages', setValue('3'), { after: 3 });
  await rec.hold(8);
  await rec.tap('#qf-target', (l) => l.selectOption({ label: 'Almanca' }).catch(() => l.selectOption({ index: 2 })), { after: 3 });
  await rec.hold(8);
  await rec.tap('#qf-urgency', (l) => l.selectOption({ index: 1 }), { after: 3 });
  await rec.hold(8);
  await rec.tap('#qf-notary', click, { after: 4 });
  await rec.hold(10);
  await rec.tap('#qf-name', focus, { after: 1 });
  await rec.type('#qf-name', 'Deniz Acar');
  await rec.tap('#qf-phone', setValue('0500 000 00 00'), { after: 3 });
  await rec.tap('#qf-consent', click, { after: 4 });
  await rec.tap('#qf-submit', click, { step: ['WhatsApp ile teklif', 'Bilgiler hazır bir WhatsApp mesajına dönüşür.'], after: 8 });
  await rec.hold(READ + 8);

  await rec.scrollToEl('.google-rating-badge', 70, 200);
  await rec.burst(8);
  await rec.note('Google yorumları', 'Puan ve müşteri yorumları sayfada görünür.', '.google-rating-badge');
  await rec.hold(READ);

  await rec.scrollToEl('#sss .faq-list', 64, 180);
  await rec.burst(8);
  await rec.tap('#sss .faq-item >> nth=1 >> .faq-q', click, { step: ['Sık sorulan sorular', 'Cevap, soruya dokununca açılır.'], after: 10 });
  await rec.hold(54);
  await rec.note('Sabit alt çubuk', 'Ara, WhatsApp, Teklif ve Yol Tarifi her an elinin altında.', '#mobile-bar', { pad: 0 });
  await rec.hold(READ + 16);
  rec.save();
}

// ── randevu CRM ──────────────────────────────────────
async function crm(page) {
  const rec = new Recorder(page, 'crm');
  await loginCrm(page);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3500); // let any load toast clear before the first frame
  await rec.prepare();
  const mainTop = await page.locator('.main-content').evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), mainTop);
  await rec.hold(26);
  await rec.note('Tek bakışta durum', 'Toplam etkinlik, ciro, kapora ve bekleyen tahsilat.', '.dashboard-stats');
  await rec.hold(READ + 8);

  await rec.tap('#statRevenueCard', click, { step: ['Ciro detayı', 'Karta dokun: hangi müşteriden ne geldiğini gör.'], after: 8 });
  await rec.hold(READ);
  await rec.tap('#closeStatDetailsBtn', click, { after: 6 });

  await rec.tap('#addCustomerBtn', click, { step: ['Yeni randevu', 'Müşteri, etkinlik, tarih ve kapora tek formda.'], after: 8 });
  await rec.hold(8);
  await rec.tap('#ad_soyad', focus, { after: 1 });
  await rec.type('#ad_soyad', 'Deniz Acar');
  await page.locator('#telefon').evaluate((el) => { el.value = '0500 000 00 00'; });
  await rec.tap('#etkinlik_adi', pick('Nişan'), { after: 3 });
  await rec.tap('#etkinlik_tarihi', setValue(isoDate(2)), { after: 3 });
  await page.locator('#durum').selectOption('Randevu Oluşturuldu');
  await rec.tap('#kisi_sayisi', setValue('60'), { after: 3 });
  await rec.tap('#toplam_fiyat', setValue('72000'), { after: 3 });
  await rec.tap('#alinan_avans', setValue('20000'), { after: 3 });
  await rec.hold(14);
  await rec.tap('#customerForm button[type=submit]', click, { step: ['Kaydet, hepsi güncellensin', 'Kayıt eklenince liste ve rakamlar anında yenilenir.'], after: 10 });
  await rec.scrollTo(mainTop, 18);
  await rec.hold(READ);

  await rec.tap('#searchInput', focus, { step: ['İsimle arama', 'Yazdıkça liste süzülür.'], after: 1 });
  await rec.type('#searchInput', 'deniz', 4);
  await rec.hold(10);
  await rec.scrollToEl('#customersTable', 56, 170);
  await rec.hold(34);
  await rec.note('WhatsApp kısayolu', 'Numaranın yanındaki WA ile müşteriye tek dokunuşla yaz.', '#customersTable tbody .wa-btn', { pad: 8 });
  await rec.hold(READ + 6);
  await page.locator('#searchInput').evaluate((el) => { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); });

  await rec.tap('.tab-btn[data-view="calendar"]', click, { step: ['Takvim görünümü', 'Ay ay ciro, kapora ve etkinlik sayısı.'], after: 8 });
  await rec.hold(14);
  await rec.scrollToEl('#calMonthRevenue', 44, 190);
  await rec.hold(50);
  await rec.scrollToEl('.fc-view-harness', 50, 110);
  await rec.hold(22);
  await rec.tap('.custom-cal-event:has-text("Deniz Acar")', click, { step: ['Takvimden detaya', 'Randevuya dokun, tüm bilgisi açılsın.'], after: 10 });
  await rec.hold(READ);
  await rec.tap('#closeViewBtn', click, { after: 6 });

  await rec.scrollTo(0, 60);
  await rec.hold(8);
  await rec.tap('.filter-btn[data-filter="Kına"]', click, { step: ['Filtreler', 'Kaynak, durum ve etkinlik türüne göre süz.'], after: 8 });
  await rec.hold(40);
  await rec.scrollTo(mainTop, 50);
  await rec.hold(10);
  await rec.note("Excel'e aktar", 'Süzülen liste tek dokunuşla Excel dosyasına dönüşür.', '#exportExcelBtn');
  await rec.hold(READ + 16);
  rec.save();
}

// ── muhasebe ─────────────────────────────────────────
async function muh(page) {
  const rec = new Recorder(page, 'muh');
  const go = (locator) => Promise.all([page.waitForNavigation(), locator.evaluate((el) => el.click())]);
  await loginMuhasebe(page);
  await page.waitForTimeout(600);
  await rec.prepare();
  await rec.hold(26);
  await rec.note('Bugün yapılacaklar', 'Günün hatırlatmaları panelin en üstünde durur.', '.alert-warning');
  await rec.hold(READ + 8);
  await rec.tap('.alert-warning form[action$="/tamamla"] button', go, { step: ['Tek dokunuşla tamamla', 'Aylık tekrarlayan iş, sonraki aya kendiliğinden kurulur.'], after: 4 });
  await rec.hold(READ + 6);
  await rec.note('WhatsApp hatırlatma', 'Borçlu firmaya hazır mesajla tek dokunuşla yaz.', '.alert-warning a[href*="wa.me"]', { pad: 8 });
  await rec.hold(READ + 6);

  await rec.scrollToEl('.stat-card.tone-danger', 60, 330);
  await rec.hold(6);
  await rec.note('Alacak takibi', 'Bekleyen alacak ve vadesi geçen tutar ayrı ayrı görünür.', '.stat-card.tone-danger');
  await rec.hold(READ + 6);

  await rec.scrollToEl('.card.border-danger', 70, 260);
  await rec.hold(10);
  await rec.tap('.card.border-danger tbody a[href^="/faturalar/"]', go, { step: ['Fatura detayı', 'Tutar, tahsil edilen ve kalan tek ekranda.'], nav: true, after: 4 });
  await rec.hold(READ + 4);
  await rec.scrollToEl('form[action$="/odeme"]', 54, 200);
  await rec.hold(6);
  await rec.tap('form[action$="/odeme"] input[name=amount]', focus, { step: ['Kısmi ödeme', 'Ödemeyi gir; kalan bakiye kendiliğinden hesaplanır.'], after: 1 });
  await rec.type('form[action$="/odeme"] input[name=amount]', '10.000', 4);
  await rec.hold(12);
  await rec.tap('form[action$="/odeme"] button[type=submit]', go, { nav: true, after: 4 });
  await rec.hold(READ + 14);

  await rec.tap('.navbar-toggler', click, { step: ['Tüm modüller tek menüde', 'İşler, firmalar, faturalar, kasa ve hatırlatıcılar.'], after: 10 });
  await rec.hold(52);
  await rec.tap('#navMenu a[href="/isler/"]', go, { step: ['İş takibi', 'Açık ve geciken işler, iş başına net kâr.'], nav: true, after: 4 });
  await rec.hold(READ + 12);

  await rec.tap('.navbar-toggler', click, { after: 10 });
  await rec.tap('#navMenu a[href="/kasa/"]', go, { step: ['Kasa', 'Dönem dönem gelir, gider ve net kâr.'], nav: true, after: 4 });
  await rec.hold(50);
  await rec.tap('a[href="/kasa/?period=year"]', go, { nav: true, after: 4 });
  await rec.hold(44);
  await rec.scrollToEl('#trendChart', 64, 300);
  await rec.burst(8);
  await rec.note('12 aylık trend', 'Gelir-gider grafiği kendiliğinden çizilir.', '#trendChart', { pad: 10 });
  await rec.hold(READ + 16);
  rec.save();
}

(async () => {
  const { browser, page } = await open();
  try {
    for (const [name, run] of [['bahce', bahce], ['tercume', tercume], ['crm', crm], ['muh', muh]]) {
      if (ONLY.length && !ONLY.includes(name)) continue;
      await run(page);
    }
  } finally {
    await browser.close();
  }
})();
