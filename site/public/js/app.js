const INSTAGRAM_HANDLE = '@saynovra';
const MAX_PROJECTS = 30;

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
function isProject(value) {
  if (typeof value !== 'object' || value === null) return false;
  const optionalString = (field) => field === undefined || typeof field === 'string';
  const isChapter = (c) => typeof c === 'object' && c !== null && Number.isFinite(c.time) && c.time >= 0 && typeof c.title === 'string' && typeof c.text === 'string';
  return typeof value.title === 'string' && typeof value.description === 'string'
    && ['tag', 'poster', 'video', 'url'].every((field) => optionalString(value[field]))
    && (value.duration === undefined || (Number.isFinite(value.duration) && value.duration > 0))
    && (value.features === undefined || (Array.isArray(value.features) && value.features.every((f) => typeof f === 'string')))
    && (value.chapters === undefined || (Array.isArray(value.chapters) && value.chapters.every(isChapter)));
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

const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

function projectCard(project) {
  const card = el('article', 'project');
  const posterUrl = project.poster ? safeUrl(project.poster, { sameOrigin: true }) : null;
  const videoUrl = project.video ? safeUrl(project.video, { sameOrigin: true }) : null;

  if (posterUrl) {
    const media = el(videoUrl ? 'button' : 'div', 'project-media');
    const image = el('img');
    image.src = posterUrl;
    image.alt = '';
    image.width = 540;
    image.height = 960;
    image.loading = 'lazy';
    media.append(image);
    if (videoUrl) {
      media.type = 'button';
      media.setAttribute('aria-label', `${project.title}: videoyu izle`);
      const play = el('span', 'project-play');
      play.setAttribute('aria-hidden', 'true');
      play.append(el('span', 'project-play-label', 'İzle'));
      if (project.duration) play.append(el('span', 'project-play-time', clock(project.duration)));
      media.append(play);
      media.addEventListener('click', () => openWork(project, videoUrl, posterUrl));
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

// ── project player: video with a clickable chapter list ──
const workDialog = byId('work-dialog');
const workVideo = byId('work-video');
const workChapters = byId('work-chapters');
let chapterTimes = [];

function syncChapters() {
  let active = -1;
  chapterTimes.forEach((time, index) => { if (workVideo.currentTime >= time - 0.05) active = index; });
  [...workChapters.children].forEach((item, index) => {
    const button = item.firstElementChild;
    const isActive = index === active;
    if ((button.getAttribute('aria-current') === 'true') === isActive) return;
    if (isActive) {
      button.setAttribute('aria-current', 'true');
      if (workChapters.scrollHeight > workChapters.clientHeight) {
        workChapters.scrollTo({ top: item.offsetTop - workChapters.offsetTop - 8, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      }
    } else {
      button.removeAttribute('aria-current');
    }
  });
}

function chapterItem(chapter) {
  const item = el('li');
  const button = el('button', 'chapter');
  button.type = 'button';
  button.append(el('span', 'chapter-time', clock(chapter.time)), el('span', 'chapter-title', chapter.title), el('span', 'chapter-text', chapter.text));
  button.addEventListener('click', () => {
    workVideo.currentTime = chapter.time;
    workVideo.play().catch(() => {});
    // On phones the list sits below the video; bring the video back into view.
    workDialog.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  });
  item.append(button);
  return item;
}

function openWork(project, videoUrl, posterUrl) {
  byId('work-dialog-tag').textContent = project.tag ?? '';
  byId('work-dialog-title').textContent = project.title;
  byId('work-dialog-text').textContent = project.description;
  const chapters = project.chapters ?? [];
  chapterTimes = chapters.map((chapter) => chapter.time);
  workChapters.replaceChildren(...chapters.map(chapterItem));
  workChapters.hidden = chapters.length === 0;
  workVideo.poster = posterUrl;
  workVideo.src = videoUrl;
  workDialog.showModal();
  workVideo.play().catch(() => {});
}

function closeWork() {
  if (workDialog.open) workDialog.close();
}

workVideo.addEventListener('timeupdate', syncChapters);
workVideo.addEventListener('seeked', syncChapters);
workDialog.addEventListener('close', () => {
  // Dropping the source stops the download as well as the playback.
  workVideo.pause();
  workVideo.removeAttribute('src');
  workVideo.load();
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

// Run on load or intersection
let simObserverTriggered = false;
const simSection = byId('simulasyon');
if (simSection && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !simObserverTriggered) {
        simObserverTriggered = true;
        runSimulation('ecommerce');
        observer.disconnect();
      }
    });
  }, { threshold: 0.2 });
  observer.observe(simSection);
} else {
  runSimulation('ecommerce');
}

