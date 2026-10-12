// Shared capture helpers: mobile browser context, brand-name scrubbing, demo logins.
const { chromium } = require('playwright-core');
const fs = require('fs');

const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const VIEWPORT = { width: 390, height: 844 };
const URLS = { crm: 'http://127.0.0.1:8011', muhasebe: 'http://127.0.0.1:5011', site: 'http://127.0.0.1:4178' };
const DEMO_USER = 'demo';
const demoPassword = () => fs.readFileSync(process.env.DEMO_PASSWORD_FILE, 'utf8').trim();

// Runs inside every captured page: client names never reach a frame, including text added later by scripts.
function scrubBrands() {
  const SWAPS = [
    [/nazay\s*bah[çc]e(si)?/gi, 'Etkinlik Bahçesi'],
    [/nazay\s*terc[üu]me/gi, 'Tercüme Ofisi'],
    [/nazay/gi, 'Demo'],
    [/(\+90|0)[\s(]*5\d{2}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/g, '0500 000 00 00'],
    [/[\w.+-]+@[\w-]+\.[\w.]+/g, 'info@ornek.com'],
  ];
  const HIT = /nazay|@[\w-]+\.|(\+90|0)[\s(]*5\d{2}/i;
  const clean = (value) => SWAPS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
  const fixText = (node) => {
    const value = node.nodeValue;
    // Write only on a real change: the masked values match HIT themselves, and an unconditional
    // write would re-trigger the observer forever.
    const next = value.trim() === 'NT' ? value.replace('NT', 'TO') : HIT.test(value) ? clean(value) : value;
    if (next !== value) node.nodeValue = next;
  };
  const scrub = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) fixText(walker.currentNode);
    const scope = root.nodeType === 1 ? root : document;
    for (const el of scope.querySelectorAll('img, [placeholder], input[value]')) {
      if (el.tagName === 'IMG') {
        const label = `${el.getAttribute('alt') ?? ''} ${el.className}`;
        const src = el.getAttribute('src') ?? '';
        if (/logo/i.test(label) || /logo/i.test(src)) el.style.setProperty('visibility', 'hidden', 'important');
      }
      for (const attr of ['placeholder', 'value']) {
        const value = el.getAttribute(attr);
        if (value && HIT.test(value)) el.setAttribute(attr, clean(value));
      }
    }
  };
  const start = () => {
    scrub(document.body);
    new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'characterData') fixText(record.target);
        else for (const node of record.addedNodes) {
          if (node.nodeType === 3) fixText(node);
          else if (node.nodeType === 1) scrub(node);
        }
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
}

async function open() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'tr-TR', timezoneId: 'Europe/Istanbul',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  });
  await context.addInitScript(scrubBrands);
  // Captures must have no side effects outside this machine: no analytics hits, no outbound writes,
  // and "send via WhatsApp" buttons must not open real chat links.
  await context.addInitScript(() => { window.open = () => null; });
  // Scrolling is driven frame by frame by the recorder, so the pages' own smooth scrolling is switched off.
  await context.addInitScript(() => {
    const native = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (arg) {
      if (arg && typeof arg === 'object' && arg.behavior === 'smooth') return undefined;
      return native.call(this, arg);
    };
  });
  await context.route('**/*', (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const local = url.hostname === '127.0.0.1' || url.hostname === 'localhost';
    const tracker = /google-analytics|googletagmanager|doubleclick|facebook|clarity|hotjar|wa\.me|whatsapp/i.test(url.hostname);
    if (!local && (tracker || request.method() !== 'GET')) return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  return { browser, context, page };
}

async function loginCrm(page) {
  await page.goto(URLS.crm, { waitUntil: 'networkidle' });
  await page.fill('#loginUsername', DEMO_USER);
  await page.fill('#loginPassword', demoPassword());
  await page.click('#loginBtn');
  await page.waitForSelector('#loginOverlay', { state: 'hidden' });
  await page.waitForTimeout(800);
}

async function loginMuhasebe(page) {
  await page.goto(`${URLS.muhasebe}/giris`, { waitUntil: 'networkidle' });
  await page.fill('input[name=username]', DEMO_USER);
  await page.fill('input[name=password]', demoPassword());
  await Promise.all([page.waitForNavigation(), page.press('input[name=password]', 'Enter')]);
}

module.exports = { open, loginCrm, loginMuhasebe, URLS, VIEWPORT };
