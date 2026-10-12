// Renders one product video: compose.html frame by frame, screenshots piped into ffmpeg.
// Usage: node render.cjs <frames_dir> <out_dir> <bahce|tercume|crm|muh> [--stills f1,f2,...]
//   --stills writes PNG stills into out_dir instead of encoding a video.
const { chromium } = require('playwright-core');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');
const fs = require('fs');
const path = require('path');

const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [framesDir, outDir, name] = process.argv.slice(2);
const stillsArg = process.argv.indexOf('--stills');
const stills = stillsArg > 0 ? process.argv[stillsArg + 1].split(',').map(Number) : null;

const VIDEOS = {
  bahce: { file: '01-mekan-sitesi', theme: 'garden', side: 'right', kicker: 'Web sitesi', title: 'Etkinlik mekânı sitesi' },
  tercume: { file: '02-kurumsal-site', theme: 'space', side: 'left', kicker: 'Web sitesi', title: 'Kurumsal hizmet sitesi' },
  crm: { file: '03-randevu-crm', theme: 'ocean', side: 'right', kicker: 'CRM', title: 'Randevu ve müşteri takibi' },
  muh: { file: '04-muhasebe', theme: 'sky', side: 'left', kicker: 'Finans', title: 'Muhasebe ve tahsilat' },
};

(async () => {
  const video = VIDEOS[name];
  if (!video) throw new Error(`unknown video "${name}", expected one of ${Object.keys(VIDEOS).join(', ')}`);
  const dir = path.join(framesDir, name);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const config = { ...video, dir: pathToFileURL(dir).href, frames: meta.frames, steps: meta.steps, taps: meta.taps, cuts: meta.cuts };

  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  let failed = false;
  page.on('pageerror', (e) => { console.error('page error:', e.message); failed = true; });
  await page.goto(pathToFileURL(path.join(__dirname, 'compose.html')).href);
  await page.evaluate(() => document.fonts.ready);
  const total = await page.evaluate((c) => window.setup(c), config);
  console.log(name, 'total frames', total, `(${(total / 30).toFixed(1)} s)`);
  fs.mkdirSync(outDir, { recursive: true });

  if (stills) {
    for (const f of stills) {
      const frame = f < 0 ? total + f : f;
      await page.evaluate((n) => window.renderFrame(n), frame);
      await page.screenshot({ path: path.join(outDir, `${name}-${String(frame).padStart(4, '0')}.png`) });
    }
    await browser.close();
    if (failed) process.exit(1);
    return;
  }

  const outFile = path.join(outDir, `${video.file}.mp4`);
  const ffmpeg = spawn('ffmpeg', [
    '-y', '-v', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', outFile,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))));

  for (let f = 0; f < total; f++) {
    await page.evaluate((n) => window.renderFrame(n), f);
    const shot = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ffmpeg.stdin.write(shot)) await new Promise((r) => ffmpeg.stdin.once('drain', r));
    if (failed) throw new Error('page error during render');
  }
  ffmpeg.stdin.end();
  await done;
  await browser.close();
  console.log(outFile, Math.round(fs.statSync(outFile).size / 1024), 'KB');
})();
