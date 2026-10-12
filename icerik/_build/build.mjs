// Renders every slide in posts.mjs to PNG with headless Chrome, then stitches reel scenes into MP4 with ffmpeg.
// Usage: node build.mjs [slug-prefix]
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { posts } from './posts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '..', 'gonderiler');
const HTML = join(HERE, 'html');
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SCENE_SECONDS = 3.4;
const FADE_SECONDS = 0.45;

const LOGO = `<svg viewBox="0 0 400 460" xmlns="http://www.w3.org/2000/svg">
<path d="M340 62H88V230H312V398H60" fill="none" stroke="var(--fg)" stroke-width="46" stroke-linejoin="round"/>
<circle cx="88" cy="230" r="36" fill="var(--bg)" stroke="var(--fg)" stroke-width="24"/>
<circle cx="312" cy="230" r="36" fill="var(--bg)" stroke="var(--fg)" stroke-width="24"/>
<circle cx="340" cy="62" r="53" fill="var(--dot)"/><circle cx="60" cy="398" r="53" fill="var(--dot)"/></svg>`;

const page = (slide, index, total, kind) => {
  const reel = kind === 'reel';
  const height = reel ? 1920 : 1350;
  const last = index === total - 1;
  const counter = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  const dot = slide.theme === 'lime' ? 'var(--ink)' : 'var(--lime)';
  const top = slide.bare ? '' : `<div class="top"><div class="brand">${LOGO}<span>Saynovra</span></div><span>${reel ? '' : counter}</span></div>`;
  const hint = slide.bottom ?? (last ? 'Kaydet' : 'Kaydır →');
  const bottom = reel || slide.bare ? '' : `<div class="bottom"><span lang="en">Software • AI • Automation</span><b>${hint}</b></div>`;
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><link rel="stylesheet" href="../style.css">
<style>:root{--h:${height}px;--dot:${dot}}</style></head>
<body class="${slide.theme}${reel ? ' reel' : ''}">${top}${slide.body.replace('%LOGO%', LOGO)}${bottom}</body></html>`;
};

const shoot = (htmlFile, pngFile, height) =>
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=1080,${height}`, '--virtual-time-budget=6000', `--screenshot=${pngFile}`,
    pathToFileURL(htmlFile).href,
  ], { stdio: 'ignore' });

const stitch = (frames, mp4File) => {
  const inputs = frames.flatMap((f) => ['-loop', '1', '-t', String(SCENE_SECONDS), '-i', f]);
  let chain = '';
  let previous = '[0:v]';
  for (let i = 1; i < frames.length; i++) {
    const offset = (i * (SCENE_SECONDS - FADE_SECONDS)).toFixed(2);
    const label = i === frames.length - 1 ? '[v]' : `[x${i}]`;
    chain += `${previous}[${i}:v]xfade=transition=fade:duration=${FADE_SECONDS}:offset=${offset}${label};`;
    previous = label;
  }
  execFileSync('ffmpeg', [
    '-y', '-v', 'error', ...inputs, '-filter_complex', chain.slice(0, -1), '-map', '[v]',
    '-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', mp4File,
  ]);
};

const only = process.argv[2];
mkdirSync(HTML, { recursive: true });

for (const post of posts) {
  if (only && !post.slug.startsWith(only)) continue;
  const dir = join(OUT, post.slug);
  mkdirSync(dir, { recursive: true });
  const height = post.kind === 'reel' ? 1920 : 1350;
  const frames = post.slides.map((slide, i) => {
    const name = `${post.slug}-${i + 1}`;
    const htmlFile = join(HTML, `${name}.html`);
    const pngFile = join(dir, `${post.kind === 'reel' ? 'sahne' : 'slayt'}-${i + 1}.png`);
    writeFileSync(htmlFile, page(slide, i, post.slides.length, post.kind), 'utf8');
    shoot(htmlFile, pngFile, height);
    return pngFile;
  });
  if (post.kind === 'reel') stitch(frames, join(dir, `${post.slug}.mp4`));
  console.log(`${post.slug}: ${frames.length} ${post.kind === 'reel' ? 'scenes + mp4' : 'slides'}`);
}
