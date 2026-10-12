const INSTAGRAM_HANDLE = '@saynovra';
const MAX_PROJECTS = 30;
const MAX_SLIDES = 24;

const byId = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// ── mobile menu ──────────────────────────────────────
const menu = byId('menu');
const nav = byId('nav');

function setMenu(open) {
  nav.classList.toggle('is-open', open);
  menu.setAttribute('aria-expanded', String(open));
  menu.textContent = open ? 'Kapat' : 'Menü';
}

menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
nav.addEventListener('click', (event) => {
  if (event.target instanceof HTMLAnchorElement) setMenu(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    menu.focus();
  }
});

// ── brief: "send" builds a summary, shows it as an outgoing bubble and copies it. Nothing is sent anywhere. ──
const form = byId('brief');
const status = byId('brief-status');
const openLink = byId('brief-open');
const description = byId('description');
const output = byId('brief-output');

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('is-error', isError);
}

function buildBrief() {
  const data = new FormData(form);
  const text = String(data.get('description') ?? '').trim();
  if (!text) {
    description.setAttribute('aria-invalid', 'true');
    description.focus();
    setStatus('Lütfen çözmek istediğiniz işi birkaç cümleyle yazın.', true);
    return null;
  }
  description.removeAttribute('aria-invalid');
  const services = data.getAll('service').map(String);
  const name = String(data.get('name') ?? '').trim();
  return [
    'SAYNOVRA · Proje özeti',
    `Ad / marka: ${name || 'Belirtilmedi'}`,
    `İlgilendiğim alan: ${services.join(', ') || 'Birlikte netleştirelim'}`,
    '',
    text,
  ].join('\n');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const brief = buildBrief();
  if (brief === null) return;

  // The bubble doubles as the manual-copy fallback when the clipboard is blocked.
  output.textContent = brief;
  output.hidden = false;
  openLink.hidden = false;

  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(brief);
    setStatus(`Özet kopyalandı. Instagram'da ${INSTAGRAM_HANDLE} hesabına yapıştırıp gönderin.`);
  } catch {
    setStatus(`Otomatik kopyalanamadı. Yukarıdaki yeşil mesajı kopyalayıp Instagram'da ${INSTAGRAM_HANDLE} hesabına gönderin.`, true);
  }
  openLink.focus({ preventScroll: true });
  openLink.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
});

description.addEventListener('input', () => {
  if (description.value.trim()) description.removeAttribute('aria-invalid');
});

// ── projects: rendered from projects.json, section stays hidden while it is empty ──
const isPercent = (value) => Number.isFinite(value) && value >= 0 && value <= 100;
const isMark = (mark, keys) => typeof mark === 'object' && mark !== null && keys.every((key) => isPercent(mark[key]));

// A recorded screen: an image, optionally with a tap ring (spot) or an outline (box) in percent of the image.
function isScreen(value) {
  return typeof value === 'object' && value !== null && typeof value.image === 'string'
    && (value.spot === undefined || isMark(value.spot, ['x', 'y']))
    && (value.box === undefined || isMark(value.box, ['x', 'y', 'w', 'h']));
}

function isSlide(value) {
  return isScreen(value) && typeof value.title === 'string' && typeof value.text === 'string'
    && (value.before === undefined || isScreen(value.before));
}

function isProject(value) {
  if (typeof value !== 'object' || value === null) return false;
  const optionalString = (field) => field === undefined || typeof field === 'string';
  return typeof value.title === 'string' && typeof value.description === 'string'
    && ['tag', 'poster', 'url'].every((field) => optionalString(value[field]))
    && (value.features === undefined || (Array.isArray(value.features) && value.features.every((f) => typeof f === 'string')))
    && (value.slides === undefined || (Array.isArray(value.slides) && value.slides.length <= MAX_SLIDES && value.slides.every(isSlide)));
}

// Media must be same-origin; outbound links must be https.
function safeUrl(value, { sameOrigin }) {
  try {
    const url = new URL(value, window.location.href);
    if (sameOrigin) return url.origin === window.location.origin ? url.href : null;
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Slides with their image URLs checked; a slide whose image is not ours is dropped.
function tourSlides(project) {
  const screen = (value) => {
    const image = safeUrl(value.image, { sameOrigin: true });
    return image ? { image, spot: value.spot, box: value.box } : null;
  };
  return (project.slides ?? []).flatMap((slide) => {
    const main = screen(slide);
    return main ? [{ ...main, title: slide.title, text: slide.text, before: slide.before ? screen(slide.before) : null }] : [];
  });
}

function projectCard(project) {
  const card = el('article', 'project');
  const posterUrl = project.poster ? safeUrl(project.poster, { sameOrigin: true }) : null;
  const slides = tourSlides(project);

  if (posterUrl) {
    const media = el(slides.length ? 'button' : 'div', 'project-media');
    const image = el('img');
    image.src = posterUrl;
    image.alt = '';
    image.width = 540;
    image.height = 960;
    image.loading = 'lazy';
    media.append(image);
    if (slides.length) {
      media.type = 'button';
      media.setAttribute('aria-label', `${project.title}: ${slides.length} adımda incele`);
      const open = el('span', 'project-play');
      open.setAttribute('aria-hidden', 'true');
      open.append(el('span', 'project-play-label', 'İncele'), el('span', 'project-play-time', `${slides.length} adım`));
      media.append(open);
      media.addEventListener('click', () => openWork(project, slides));
    }
    card.append(media);
  }

  const body = el('div', 'project-body');
  if (project.tag) body.append(el('p', 'project-tag', project.tag));
  body.append(el('h3', '', project.title), el('p', 'project-text', project.description));

  if (project.features?.length) {
    const list = el('ul', 'project-features');
    list.append(...project.features.map((feature) => el('li', '', feature)));
    body.append(list);
  }

  const linkUrl = project.url ? safeUrl(project.url, { sameOrigin: false }) : null;
  if (linkUrl) {
    const link = el('a', 'project-link', 'Projeyi incele ↗');
    link.href = linkUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `${project.title} projesini yeni sekmede incele`);
    body.append(link);
  }

  card.append(body);
  return card;
}

// ── project tour: recorded screens, one step at a time ──
const TAP_PREVIEW_MS = 1500;
const workDialog = byId('work-dialog');
const tourPhone = byId('work-phone');
const tourShots = [...tourPhone.querySelectorAll('.tour-shot')];
const tourMark = byId('work-mark');
const tourSteps = byId('work-steps');
const tourProgress = byId('work-progress');
// run: bumped on every slide change so late image loads from an earlier slide are ignored.
// reveal: set while a tap preview is on screen; calling it shows the screen that follows the tap.
const tour = { slides: [], index: 0, run: 0, timer: 0, reveal: null };
const twoDigits = (n) => String(n).padStart(2, '0');

function loadImage(url) {
  const image = new Image();
  image.src = url;
  return image.decode().catch(() => {});
}

// Cross-fades the phone to a screen and places its ring or outline.
async function showScreen(screen, run) {
  await loadImage(screen.image);
  if (run !== tour.run) return;
  const back = tourShots.find((shot) => !shot.classList.contains('is-front'));
  back.src = screen.image;
  tourShots.forEach((shot) => shot.classList.toggle('is-front', shot === back));
  const mark = screen.spot ?? screen.box;
  tourMark.hidden = !mark;
  if (!mark) return;
  tourMark.className = screen.spot ? 'tour-mark is-spot' : 'tour-mark is-box';
  for (const key of ['x', 'y', 'w', 'h']) tourMark.style.setProperty(`--${key}`, mark[key] === undefined ? '0' : `${mark[key]}%`);
}

function showSlide(index) {
  const slide = tour.slides[index];
  if (!slide) return;
  const run = ++tour.run;
  clearTimeout(tour.timer);
  tour.index = index;
  tour.reveal = null;

  const last = index === tour.slides.length - 1;
  byId('work-count').textContent = `${twoDigits(index + 1)} / ${twoDigits(tour.slides.length)}`;
  byId('work-step-title').textContent = slide.title;
  byId('work-step-text').textContent = slide.text;
  byId('work-prev').disabled = index === 0;
  byId('work-next-label').textContent = last ? 'Baştan' : 'İleri';
  [...tourProgress.children].forEach((item, i) => item.classList.toggle('is-done', i <= index));
  [...tourSteps.children].forEach((item, i) => {
    if (i === index) item.firstElementChild.setAttribute('aria-current', 'step');
    else item.firstElementChild.removeAttribute('aria-current');
  });

  if (slide.before && !reducedMotion.matches) {
    // First where the finger goes, then the screen that follows.
    tour.reveal = () => { tour.reveal = null; void showScreen(slide, run); };
    void showScreen(slide.before, run).then(() => {
      if (run !== tour.run || !tour.reveal) return;
      void loadImage(slide.image);
      tour.timer = setTimeout(() => tour.reveal?.(), TAP_PREVIEW_MS);
    });
  } else {
    void showScreen(slide, run);
  }
  const next = tour.slides[index + 1];
  if (next) void loadImage((next.before ?? next).image);
}

// During a tap preview "next" shows its result first, so no screen is skipped.
function advance() {
  if (tour.reveal) {
    clearTimeout(tour.timer);
    tour.reveal();
    return;
  }
  showSlide(tour.index === tour.slides.length - 1 ? 0 : tour.index + 1);
}

function stepItem(slide, index) {
  const item = el('li');
  const button = el('button', 'chapter');
  button.type = 'button';
  button.append(el('span', 'chapter-time', twoDigits(index + 1)), el('span', 'chapter-title', slide.title));
  button.addEventListener('click', () => showSlide(index));
  item.append(button);
  return item;
}

function openWork(project, slides) {
  byId('work-dialog-tag').textContent = project.tag ?? '';
  byId('work-dialog-title').textContent = project.title;
  tour.slides = slides;
  tourProgress.replaceChildren(...slides.map(() => el('li')));
  tourSteps.replaceChildren(...slides.map(stepItem));
  tourShots.forEach((shot) => { shot.removeAttribute('src'); shot.classList.remove('is-front'); });
  tourMark.hidden = true;
  workDialog.showModal();
  showSlide(0);
}

function closeWork() {
  if (workDialog.open) workDialog.close();
}

// Swipe on the phone; a swipe must not also count as the click that follows it.
let swipeStart = null;
let swiped = false;
tourPhone.addEventListener('pointerdown', (event) => { swipeStart = event.clientX; swiped = false; });
tourPhone.addEventListener('pointercancel', () => { swipeStart = null; });
tourPhone.addEventListener('pointerup', (event) => {
  if (swipeStart === null) return;
  const distance = event.clientX - swipeStart;
  swipeStart = null;
  if (Math.abs(distance) < 40) return;
  swiped = true;
  if (distance < 0) advance();
  else showSlide(tour.index - 1);
});
tourPhone.addEventListener('click', () => {
  if (swiped) { swiped = false; return; }
  advance();
});
byId('work-next').addEventListener('click', advance);
byId('work-prev').addEventListener('click', () => showSlide(tour.index - 1));
workDialog.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight') advance();
  else if (event.key === 'ArrowLeft') showSlide(tour.index - 1);
});
workDialog.addEventListener('close', () => {
  clearTimeout(tour.timer);
  tour.run++;
  tour.reveal = null;
});
workDialog.addEventListener('click', (event) => {
  if (event.target === workDialog) closeWork();
});
byId('work-close').addEventListener('click', closeWork);
byId('work-dialog-cta').addEventListener('click', closeWork);

async function loadProjects() {
  try {
    const response = await fetch('projects.json');
    if (!response.ok) return;
    const data = await response.json();
    if (!Array.isArray(data)) return;
    const projects = data.filter(isProject).slice(0, MAX_PROJECTS);
    if (projects.length === 0) return;
    byId('projects').replaceChildren(...projects.map(projectCard));
    byId('isler').hidden = false;
    byId('nav-work').hidden = false;
  } catch {
    // Section stays hidden when the feed is missing or malformed.
  }
}

// ── hero video: show the still poster for visitors who asked for less motion ──
const heroVideo = byId('hero-video');
function syncHeroVideo() {
  if (reducedMotion.matches) {
    heroVideo.pause();
    heroVideo.removeAttribute('autoplay');
    heroVideo.controls = true;
  } else {
    heroVideo.controls = false;
    heroVideo.play().catch(() => {});
  }
}
reducedMotion.addEventListener('change', syncHeroVideo);
syncHeroVideo();

byId('year').textContent = String(new Date().getFullYear());
void loadProjects();

// ── live simulation (interactive ai agent terminal) ──
const SIMULATION_SCENARIOS = {
  ecommerce: {
    badge: 'E-Ticaret Sipariş Akışı',
    file: 'order-dispatch-agent.ts',
    humanTime: '~15 dakika',
    latency: '0.38 sn',
    desc: 'Shopify/WooCommerce siparişi geldiğinde stok ERP sisteminden rezerve edilir, GİB e-arşiv faturası kesilir ve kargo etiketi oluşturulur.',
    serviceChoice: 'Otomasyon',
    subtitles: {
      trigger: 'Shopify Webhook #4189',
      mcp: 'ERP Stok & Fiyat Aracı',
      agent: 'Fatura & Kargo Karar Motoru',
      dispatch: 'GİB E-Fatura + Kargo API'
    },
    logs: [
      { time: '00.04s', type: 'EVENT', step: 'trigger', text: 'Webhook tetiklendi: Shopify siparişi #4189 alındı (Tutar: ₺2.450)' },
      { time: '00.11s', type: 'MCP', step: 'mcp', text: 'MCP Server çağrıldı [erp_query_stock]: SKU-804 stok sorgusu: 18 adet mevcut (1 rezerve edildi)' },
      { time: '00.22s', type: 'AGENT', step: 'agent', text: 'AI Agent analizi: B2C sipariş, TC Kimlik doğrulaması geçerli, KDV oranı %20 uygulandı' },
      { time: '00.31s', type: 'API', step: 'dispatch', text: 'GİB Entegratörü: E-Arşiv fatura #EAR-2026-0941 oluşturuldu ve imzalandı' },
      { time: '00.35s', type: 'API', step: 'dispatch', text: 'Kargo API: Yurtiçi Kargo takip kodu ve barkod oluşturuldu (#YK-8829401)' },
      { time: '00.38s', type: 'SUCCESS', step: 'dispatch', text: 'Tamamlandı: Müşteriye WhatsApp ve SMS bilgilendirmesi gönderildi (0.38 sn)' }
    ]
  },
  support: {
    badge: 'WhatsApp Müşteri Destek Ajanı',
    file: 'whatsapp-support-agent.ts',
    humanTime: '~8 dakika',
    latency: '0.42 sn',
    desc: 'WhatsApp üzerinden gelen "Adresimi güncelleyebilir miyim?" talebini okur, aktif siparişi bulur, kargo durumunu kontrol edip adresi anında günceller.',
    serviceChoice: 'Yapay zekâ',
    subtitles: {
      trigger: 'WhatsApp Gelen Mesaj',
      mcp: 'CRM & Kargo Durum Aracı',
      agent: 'Niyet Analizi & Adres Doğrulama',
      dispatch: 'CRM Güncelleme + WhatsApp Cevap'
    },
    logs: [
      { time: '00.05s', type: 'EVENT', step: 'trigger', text: 'WhatsApp webhook: "Merhaba, taşındım adresimi Kadıköy/İstanbul olarak güncelleyebilir miyiz?"' },
      { time: '00.14s', type: 'AGENT', step: 'agent', text: 'AI Niyet Analizi: [Adres Değişikliği Talebi] (Güven: %99.4) • Hedef İlçe: Kadıköy' },
      { time: '00.24s', type: 'MCP', step: 'mcp', text: 'MCP Server [crm_get_active_orders]: Telefon (+90 532...) eşleşti. Aktif sipariş #3912 durumu: [Paketleniyor]' },
      { time: '00.31s', type: 'AGENT', step: 'agent', text: 'Kural Kontrolü: Paket henüz kuryeye teslim edilmedi -> Adres güncellemesine İZİN VERİLDİ' },
      { time: '00.39s', type: 'API', step: 'dispatch', text: 'CRM & Kargo API: Teslimat adresi güncellendi -> Caferağa Mah. Moda Cad. Kadıköy' },
      { time: '00.42s', type: 'SUCCESS', step: 'dispatch', text: 'WhatsApp Cevabı: "Adresiniz başarıyla Kadıköy olarak güncellendi! Takip no: #TR-9912" (0.42 sn)' }
    ]
  },
  pricing: {
    badge: 'B2B Fiyat & Entegrasyon Pipeline',
    file: 'supplier-sync-pipeline.ts',
    humanTime: '~45 dakika',
    latency: '0.56 sn',
    desc: 'Tedarikçiden gelen XML/API fiyat listesindeki maliyet değişimlerini tespit eder, kâr marjlarını hesaplar ve pazaryeri satış fiyatlarını otomatik günceller.',
    serviceChoice: 'Otomasyon',
    subtitles: {
      trigger: 'Tedarikçi XML Feed Cron',
      mcp: 'Maliyet & Marj Hesaplayıcı',
      agent: 'Pazar & Rakip Fiyat Analizi',
      dispatch: 'Pazaryeri & ERP Güncelleme'
    },
    logs: [
      { time: '00.06s', type: 'EVENT', step: 'trigger', text: 'Tetikleyici: Tedarikçi XML katalog akışı algılandı (Toplam 1.450 ürün)' },
      { time: '00.18s', type: 'MCP', step: 'mcp', text: 'MCP Server [catalog_diff]: 24 üründe döviz bazlı maliyet artışı tespit edildi (+%8.4)' },
      { time: '00.31s', type: 'AGENT', step: 'agent', text: 'AI Strateji Motoru: Minimum kâr marjı %25 korunarak dinamik satış fiyatları hesaplandı' },
      { time: '00.44s', type: 'API', step: 'dispatch', text: 'Pazaryeri API (Trendyol / Hepsiburada): 24 ürünün satış fiyatı anında yayına alındı' },
      { time: '00.51s', type: 'API', step: 'dispatch', text: 'Slack & E-posta: Yönetim paneline günlük fiyat değişim raporu iletildi' },
      { time: '00.56s', type: 'SUCCESS', step: 'dispatch', text: 'Tamamlandı: 24 ürünün fiyatları sıfır insan hatasıyla güncellendi (0.56 sn)' }
    ]
  }
};

let currentScenario = 'ecommerce';
let simulationTimeouts = [];

function setPipelineStep(activeStepName, isCompleted = false) {
  const steps = document.querySelectorAll('.sim-step');
  const stepOrder = ['trigger', 'mcp', 'agent', 'dispatch'];
  const activeIndex = stepOrder.indexOf(activeStepName);

  steps.forEach((el) => {
    const name = el.getAttribute('data-step');
    const idx = stepOrder.indexOf(name);
    el.classList.remove('is-active', 'is-done');
    if (isCompleted) {
      el.classList.add('is-done');
    } else if (idx < activeIndex) {
      el.classList.add('is-done');
    } else if (idx === activeIndex) {
      el.classList.add('is-active');
    }
  });
}

function clearSimulationTimeouts() {
  simulationTimeouts.forEach(clearTimeout);
  simulationTimeouts = [];
}

function runSimulation(scenarioKey) {
  const data = SIMULATION_SCENARIOS[scenarioKey];
  if (!data) return;

  clearSimulationTimeouts();
  currentScenario = scenarioKey;

  // Update tabs
  document.querySelectorAll('.sim-tab').forEach((tab) => {
    const isTarget = tab.getAttribute('data-scenario') === scenarioKey;
    tab.classList.toggle('is-active', isTarget);
    tab.setAttribute('aria-selected', String(isTarget));
  });

  // Update meta & subtitles
  const badge = byId('sim-scenario-badge');
  const desc = byId('sim-scenario-desc');
  const termMode = byId('terminal-mode');
  const statLatency = byId('stat-latency');
  const statHuman = byId('stat-human');
  const pipeTrigger = byId('pipe-trigger-sub');
  const pipeMcp = byId('pipe-mcp-sub');
  const pipeAgent = byId('pipe-agent-sub');
  const pipeDispatch = byId('pipe-dispatch-sub');

  if (badge) badge.textContent = data.badge;
  if (desc) desc.textContent = data.desc;
  if (termMode) termMode.textContent = data.file;
  if (statLatency) statLatency.textContent = data.latency;
  if (statHuman) statHuman.textContent = data.humanTime;
  if (pipeTrigger) pipeTrigger.textContent = data.subtitles.trigger;
  if (pipeMcp) pipeMcp.textContent = data.subtitles.mcp;
  if (pipeAgent) pipeAgent.textContent = data.subtitles.agent;
  if (pipeDispatch) pipeDispatch.textContent = data.subtitles.dispatch;

  // Terminal status
  const statusEl = byId('terminal-status');
  const statusText = byId('terminal-status-text');
  if (statusEl) {
    statusEl.className = 'terminal-status is-running';
    if (statusText) statusText.textContent = 'ÇALIŞIYOR';
  }

  // Clear logs
  const logsContainer = byId('terminal-logs');
  if (!logsContainer) return;
  logsContainer.replaceChildren();

  const isMotionReduced = reducedMotion.matches;
  const lineDelay = isMotionReduced ? 0 : 380;

  data.logs.forEach((item, index) => {
    const isLast = index === data.logs.length - 1;

    const timeout = setTimeout(() => {
      setPipelineStep(item.step, false);

      const line = document.createElement('div');
      line.className = 'terminal-line';

      const time = document.createElement('span');
      time.className = 'log-time';
      time.textContent = `[${item.time}]`;

      const tag = document.createElement('span');
      tag.className = `log-tag tag-${item.type}`;
      tag.textContent = item.type;

      const text = document.createElement('span');
      text.className = 'log-text';
      text.textContent = item.text;

      line.append(time, tag, text);

      if (isLast) {
        const cursor = document.createElement('span');
        cursor.className = 'log-cursor';
        line.append(cursor);
      }

      logsContainer.append(line);
      logsContainer.scrollTop = logsContainer.scrollHeight;

      if (isLast) {
        setPipelineStep('dispatch', true);
        if (statusEl) {
          statusEl.className = 'terminal-status is-completed';
          if (statusText) statusText.textContent = 'TAMAMLANDI';
        }
      }
    }, index * lineDelay);

    simulationTimeouts.push(timeout);
  });
}

// Attach simulation event listeners
document.querySelectorAll('.sim-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const key = tab.getAttribute('data-scenario');
    if (key) runSimulation(key);
  });
});

const replayBtn = byId('sim-replay-btn');
replayBtn?.addEventListener('click', () => runSimulation(currentScenario));

const ctaBtn = byId('sim-cta-btn');
ctaBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  const scenario = SIMULATION_SCENARIOS[currentScenario];
  if (scenario) {
    const targetService = scenario.serviceChoice;
    document.querySelectorAll('input[name="service"]').forEach((cb) => {
      if (cb instanceof HTMLInputElement && cb.value === targetService) {
        cb.checked = true;
      }
    });

    const descField = byId('description');
    if (descField instanceof HTMLTextAreaElement && !descField.value.trim()) {
      descField.value = `Merhaba, ${scenario.badge} benzeri bir akışı işletmemize kurmak istiyoruz.`;
    }
  }
  byId('iletisim')?.scrollIntoView({ behavior: 'smooth' });
});

// The simulator sits in the "Otomasyon" tab of the laptop demo (js/demo.js): start it when the tab opens.
document.addEventListener('demo:tab', (event) => {
  if (event.detail === 'os-tab-flow') runSimulation(currentScenario);
  else clearSimulationTimeouts();
});

