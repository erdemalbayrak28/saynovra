// Procedural animated backgrounds, drawn per frame as pure functions of time (seconds).
// drawBackground(ctx, theme, time, alpha) paints one theme over whatever is already on the canvas.
const BG_W = 1080, BG_H = 1920, BG_TAU = Math.PI * 2;

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const wrap = (value, size) => ((value % size) + size) % size;

function vertical(ctx, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, BG_H);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, BG_W, BG_H);
}

function glow(ctx, x, y, radius, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalAlpha = 1;
}

// ── space ────────────────────────────────────────────
const STARS = (() => { const r = seeded(7); return Array.from({ length: 300 }, () => ({ x: r() * BG_W, y: r() * BG_H, size: 0.6 + r() ** 3 * 2.6, phase: r() * BG_TAU, speed: 0.6 + r() * 2.4 })); })();

function space(ctx, t) {
  vertical(ctx, [[0, '#03040c'], [0.55, '#080b24'], [1, '#0d0a2a']]);
  ctx.globalCompositeOperation = 'screen';
  glow(ctx, 820 + 60 * Math.sin(t / 9), 420 + 40 * Math.cos(t / 11), 720, '#5b2a9d', 0.55);
  glow(ctx, 200 + 50 * Math.cos(t / 8), 900 + 60 * Math.sin(t / 10), 680, '#1b46c9', 0.4);
  glow(ctx, 900 + 40 * Math.sin(t / 7 + 2), 1500 + 50 * Math.cos(t / 9), 620, '#0f8f8a', 0.34);
  glow(ctx, 380 + 30 * Math.sin(t / 6), 260, 420, '#c2358f', 0.22);
  ctx.globalCompositeOperation = 'source-over';

  for (const s of STARS) {
    const x = wrap(s.x - t * s.size * 5, BG_W);
    const y = wrap(s.y + t * s.size * 9, BG_H);
    ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
    ctx.fillStyle = s.size > 2.2 ? '#dfe8ff' : '#ffffff';
    ctx.beginPath(); ctx.arc(x, y, s.size, 0, BG_TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // shooting star, one every five seconds
  const cycle = (t % 5) / 0.9;
  if (cycle < 1) {
    const slot = Math.floor(t / 5);
    const sx = 300 + ((slot * 397) % 600), sy = 120 + ((slot * 211) % 500);
    const x = sx + cycle * 520, y = sy + cycle * 300;
    const g = ctx.createLinearGradient(x - 220, y - 127, x, y);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(255,255,255,${0.9 * Math.sin(cycle * Math.PI)})`);
    ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 220, y - 127); ctx.lineTo(x, y); ctx.stroke();
  }

  // ringed planet, lower left
  const px = 150 + 14 * Math.sin(t / 6), py = 1610 + 10 * Math.cos(t / 7), pr = 250;
  ctx.save();
  ctx.translate(px, py); ctx.rotate(-0.38);
  ctx.strokeStyle = 'rgba(190,200,255,0.30)'; ctx.lineWidth = 16;
  ctx.beginPath(); ctx.ellipse(0, 0, pr * 1.75, pr * 0.42, 0, Math.PI, BG_TAU); ctx.stroke();
  ctx.restore();
  const body = ctx.createRadialGradient(px + 90, py - 110, 20, px, py, pr);
  body.addColorStop(0, '#7f8bff'); body.addColorStop(0.45, '#3a3fa8'); body.addColorStop(1, '#0d0f38');
  ctx.fillStyle = body; ctx.beginPath(); ctx.arc(px, py, pr, 0, BG_TAU); ctx.fill();
  ctx.save();
  ctx.translate(px, py); ctx.rotate(-0.38);
  ctx.strokeStyle = 'rgba(210,220,255,0.55)'; ctx.lineWidth = 16;
  ctx.beginPath(); ctx.ellipse(0, 0, pr * 1.75, pr * 0.42, 0, 0, Math.PI); ctx.stroke();
  ctx.strokeStyle = 'rgba(200,240,49,0.5)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(0, 0, pr * 1.95, pr * 0.5, 0, 0, Math.PI); ctx.stroke();
  ctx.restore();
}

// ── ocean ────────────────────────────────────────────
const BUBBLES = (() => { const r = seeded(21); return Array.from({ length: 64 }, () => ({ x: r() * BG_W, y: r() * BG_H, radius: 3 + r() ** 2 * 17, speed: 50 + r() * 110, phase: r() * BG_TAU })); })();
const PLANKTON = (() => { const r = seeded(33); return Array.from({ length: 150 }, () => ({ x: r() * BG_W, y: r() * BG_H, size: 0.8 + r() * 1.8, phase: r() * BG_TAU })); })();
const FISH = (() => { const r = seeded(45); return Array.from({ length: 7 }, (_, i) => ({ y: 260 + r() * 1300, size: 26 + r() * 46, speed: (30 + r() * 50) * (i % 2 ? 1 : -1), offset: r() * 1600, depth: 0.14 + r() * 0.2 })); })();
const WEEDS = (() => { const r = seeded(57); return Array.from({ length: 13 }, (_, i) => ({ x: -20 + i * 92 + r() * 40, height: 240 + r() * 360, width: 16 + r() * 20, phase: r() * BG_TAU })); })();

function ocean(ctx, t) {
  vertical(ctx, [[0, '#19b8c4'], [0.3, '#0a7fa3'], [0.65, '#06456f'], [1, '#021427']]);

  // light shafts from the surface
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.filter = 'blur(22px)';
  for (let i = 0; i < 7; i++) {
    const sway = Math.sin(t / 3.5 + i * 1.3) * 0.07;
    const x = 80 + i * 160 + 40 * Math.sin(t / 5 + i);
    ctx.save();
    ctx.translate(x, -60); ctx.rotate(0.2 + sway);
    const g = ctx.createLinearGradient(0, 0, 0, 1500);
    g.addColorStop(0, `rgba(190,255,245,${0.2 + 0.08 * Math.sin(t / 2 + i * 2)})`); g.addColorStop(1, 'rgba(190,255,245,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(40, 0); ctx.lineTo(170, 1500); ctx.lineTo(-150, 1500); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  for (const p of PLANKTON) {
    ctx.globalAlpha = 0.25 + 0.3 * Math.sin(t * 0.8 + p.phase);
    ctx.fillStyle = '#d8fff8';
    ctx.beginPath(); ctx.arc(wrap(p.x + t * 9 + 14 * Math.sin(t / 2 + p.phase), BG_W), wrap(p.y - t * 12, BG_H), p.size, 0, BG_TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const f of FISH) {
    const span = BG_W + 400;
    const x = wrap(f.offset + t * f.speed, span) - 200;
    const y = f.y + 18 * Math.sin(t / 2 + f.offset);
    const dir = Math.sign(f.speed);
    const tail = Math.sin(t * 7 + f.offset) * 0.35;
    ctx.save();
    ctx.translate(x, y); ctx.scale(dir, 1);
    ctx.fillStyle = `rgba(2,28,52,${f.depth * 2.2})`;
    ctx.beginPath(); ctx.ellipse(0, 0, f.size, f.size * 0.38, 0, 0, BG_TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-f.size * 0.85, 0);
    ctx.lineTo(-f.size * 1.5, -f.size * (0.42 + tail)); ctx.lineTo(-f.size * 1.5, f.size * (0.42 - tail)); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // seaweed along the floor
  ctx.fillStyle = 'rgba(1,18,30,0.92)';
  for (const w of WEEDS) {
    const lean = Math.sin(t / 1.8 + w.phase) * 60;
    ctx.beginPath();
    ctx.moveTo(w.x - w.width, BG_H);
    ctx.bezierCurveTo(w.x - w.width + lean * 0.3, BG_H - w.height * 0.4, w.x + lean * 0.8, BG_H - w.height * 0.7, w.x + lean, BG_H - w.height);
    ctx.bezierCurveTo(w.x + lean * 0.8 + w.width, BG_H - w.height * 0.7, w.x + w.width + lean * 0.3, BG_H - w.height * 0.4, w.x + w.width, BG_H);
    ctx.closePath(); ctx.fill();
  }

  for (const b of BUBBLES) {
    const y = BG_H + 40 - wrap(b.y + t * b.speed, BG_H + 80);
    const x = b.x + Math.sin(t * 1.4 + b.phase) * (8 + b.radius);
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#e9fffb'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(x, y, b.radius, 0, BG_TAU); ctx.stroke();
    ctx.globalAlpha = 0.1; ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.arc(x - b.radius * 0.35, y - b.radius * 0.35, b.radius * 0.2, 0, BG_TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── sky: golden hour above the clouds ────────────────
const HIGH_STARS = (() => { const r = seeded(71); return Array.from({ length: 70 }, () => ({ x: r() * BG_W, y: r() * 620, size: 0.6 + r() * 1.5, phase: r() * BG_TAU })); })();
const CLOUD_LAYERS = [
  { y: 1210, color: '#ffd7a1', speed: 8, seed: 81, radius: 90, alpha: 0.85 },
  { y: 1330, color: '#f89a6a', speed: 16, seed: 82, radius: 120, alpha: 0.95 },
  { y: 1480, color: '#b3506e', speed: 28, seed: 83, radius: 150, alpha: 1 },
  { y: 1650, color: '#532a5e', speed: 46, seed: 84, radius: 185, alpha: 1 },
  { y: 1830, color: '#241338', speed: 70, seed: 85, radius: 210, alpha: 1 },
].map((layer) => {
  const r = seeded(layer.seed);
  const span = BG_W + 800;
  const puffs = [];
  for (let x = 0; x < span; x += layer.radius * (0.55 + r() * 0.5)) puffs.push({ x, radius: layer.radius * (0.55 + r() * 0.7), lift: r() * layer.radius * 0.5 });
  return { ...layer, span, puffs };
});
const BALLOONS = [
  { x: 190, y: 760, size: 62, color: '#c8f031', drift: 0.9 },
  { x: 900, y: 560, size: 44, color: '#ffe3b0', drift: 1.3 },
  { x: 820, y: 1000, size: 30, color: '#ff9d7a', drift: 1.7 },
];

function sky(ctx, t) {
  vertical(ctx, [[0, '#17123f'], [0.3, '#4a2470'], [0.5, '#b03d6c'], [0.62, '#f2733f'], [0.7, '#ffc46b'], [1, '#ffd89a']]);
  for (const s of HIGH_STARS) {
    ctx.globalAlpha = (0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.5 + s.phase))) * (1 - s.y / 640);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, BG_TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;

  const sunY = 1225 + 6 * Math.sin(t / 5);
  ctx.globalCompositeOperation = 'screen';
  glow(ctx, 740, sunY, 900, '#ffb04a', 0.75);
  glow(ctx, 740, sunY, 330, '#fff3c4', 0.95);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#fff8dc';
  ctx.beginPath(); ctx.arc(740, sunY, 96, 0, BG_TAU); ctx.fill();

  for (const b of BALLOONS) {
    const x = b.x + 26 * Math.sin(t / (4 * b.drift)) + t * 4 * b.drift;
    const y = b.y - t * 5 * b.drift + 10 * Math.sin(t / 2.4 + b.x);
    ctx.fillStyle = b.color; ctx.globalAlpha = 0.92;
    ctx.beginPath(); ctx.arc(x, y, b.size, Math.PI, BG_TAU); ctx.bezierCurveTo(x + b.size, y + b.size * 0.9, x + b.size * 0.28, y + b.size * 1.35, x + b.size * 0.2, y + b.size * 1.55);
    ctx.lineTo(x - b.size * 0.2, y + b.size * 1.55); ctx.bezierCurveTo(x - b.size * 0.28, y + b.size * 1.35, x - b.size, y + b.size * 0.9, x - b.size, y); ctx.fill();
    ctx.fillStyle = 'rgba(30,16,50,0.28)';
    ctx.beginPath(); ctx.ellipse(x + b.size * 0.42, y + b.size * 0.1, b.size * 0.34, b.size * 0.95, 0.12, 0, BG_TAU); ctx.fill();
    ctx.fillStyle = '#2a1640'; ctx.globalAlpha = 1;
    ctx.fillRect(x - b.size * 0.17, y + b.size * 1.75, b.size * 0.34, b.size * 0.26);
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.filter = 'blur(7px)';
  for (const layer of CLOUD_LAYERS) {
    ctx.globalAlpha = layer.alpha;
    ctx.fillStyle = layer.color;
    const shift = wrap(t * layer.speed, layer.span);
    ctx.beginPath();
    for (const copy of [0, layer.span]) {
      for (const p of layer.puffs) {
        const x = p.x - shift + copy - 200;
        if (x < -400 || x > BG_W + 400) continue;
        ctx.moveTo(x + p.radius, layer.y - p.lift);
        ctx.arc(x, layer.y - p.lift, p.radius, 0, BG_TAU);
      }
    }
    ctx.rect(-50, layer.y, BG_W + 100, BG_H - layer.y + 60);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

const THEMES = { space, ocean, sky };
const scratch = document.createElement('canvas');
scratch.width = BG_W; scratch.height = BG_H;

function drawBackground(ctx, theme, time, alpha = 1) {
  if (alpha >= 1) { THEMES[theme](ctx, time); return; }
  THEMES[theme](scratch.getContext('2d'), time);
  ctx.globalAlpha = alpha;
  ctx.drawImage(scratch, 0, 0);
  ctx.globalAlpha = 1;
}

// ── garden: night garden with string lights and fireflies ──
const BOKEH = (() => { const r = seeded(101); return Array.from({ length: 26 }, () => ({ x: r() * BG_W, y: r() * BG_H, radius: 30 + r() * 90, hue: r(), phase: r() * BG_TAU, drift: 4 + r() * 10 })); })();
const FIREFLIES = (() => { const r = seeded(113); return Array.from({ length: 34 }, () => ({ x: r() * BG_W, y: 300 + r() * 1500, ax: 40 + r() * 110, ay: 30 + r() * 90, sx: 0.15 + r() * 0.35, sy: 0.12 + r() * 0.3, phase: r() * BG_TAU, blink: 0.7 + r() * 1.6 })); })();
const STRANDS = [
  { x0: -60, y0: 150, x1: 1140, y1: 250, sag: 190, bulbs: 11 },
  { x0: -60, y0: 420, x1: 1140, y1: 330, sag: 150, bulbs: 9 },
];
const FRONDS = (() => {
  const r = seeded(127);
  const make = (x, y, angle, length) => ({ x, y, angle, length, phase: r() * BG_TAU, leaves: 9 + Math.floor(r() * 5) });
  return [
    make(-30, 1930, -1.15, 620), make(120, 1950, -1.45, 760), make(300, 1960, -1.7, 560), make(-40, 1700, -0.7, 520),
    make(1110, 1930, -1.95, 640), make(960, 1950, -1.65, 780), make(780, 1960, -1.4, 540), make(1120, 1690, -2.45, 500),
    make(-40, -20, 0.85, 460), make(1120, -20, 2.3, 480),
  ];
})();

function frond(ctx, f, t) {
  const sway = Math.sin(t / 2.2 + f.phase) * 0.06;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.angle + sway);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(f.length * 0.5, -f.length * 0.08, f.length, f.length * 0.1);
  ctx.lineWidth = 7; ctx.strokeStyle = ctx.fillStyle; ctx.stroke();
  for (let i = 1; i <= f.leaves; i++) {
    const p = i / (f.leaves + 1);
    const x = f.length * p, y = -f.length * 0.08 * 4 * p * (1 - p) * 0.5 + f.length * 0.1 * p * p;
    const size = f.length * 0.2 * Math.sin(Math.PI * (0.15 + p * 0.85));
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(side * (0.9 - p * 0.35) + sway * 2);
      ctx.beginPath(); ctx.ellipse(size * 0.5, 0, size * 0.55, size * 0.15, 0, 0, BG_TAU); ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

function garden(ctx, t) {
  vertical(ctx, [[0, '#03100c'], [0.45, '#06231a'], [0.8, '#0a3324'], [1, '#04140e']]);
  ctx.globalCompositeOperation = 'screen';
  glow(ctx, 860, 300, 620, '#f6e7a8', 0.16);
  glow(ctx, 200 + 30 * Math.sin(t / 7), 1250, 700, '#1f8a5b', 0.3);
  ctx.save();
  ctx.filter = 'blur(26px)';
  for (const b of BOKEH) {
    const x = wrap(b.x + t * b.drift, BG_W + 300) - 150;
    const y = b.y + 26 * Math.sin(t / 5 + b.phase);
    ctx.globalAlpha = 0.08 + 0.07 * (0.5 + 0.5 * Math.sin(t / 2.4 + b.phase));
    ctx.fillStyle = b.hue < 0.55 ? '#ffd27a' : b.hue < 0.8 ? '#8fe3a8' : '#c8f031';
    ctx.beginPath(); ctx.arc(x, y, b.radius, 0, BG_TAU); ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  // string lights
  for (const s of STRANDS) {
    const swing = Math.sin(t / 3 + s.sag) * 10;
    const point = (p) => [s.x0 + (s.x1 - s.x0) * p + swing * Math.sin(Math.PI * p), s.y0 + (s.y1 - s.y0) * p + s.sag * 4 * p * (1 - p)];
    ctx.strokeStyle = 'rgba(8,20,14,0.9)'; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) { const [x, y] = point(i / 40); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
    for (let i = 1; i <= s.bulbs; i++) {
      const [x, y] = point(i / (s.bulbs + 1));
      const pulse = 0.75 + 0.25 * Math.sin(t * 1.7 + i * 1.9 + s.sag);
      ctx.globalCompositeOperation = 'screen';
      glow(ctx, x, y + 16, 130, '#ffc861', 0.5 * pulse);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#fff1c7';
      ctx.beginPath(); ctx.ellipse(x, y + 16, 9, 12, 0, 0, BG_TAU); ctx.fill();
    }
  }

  ctx.fillStyle = '#020b08';
  for (const f of FRONDS) frond(ctx, f, t);

  ctx.globalCompositeOperation = 'screen';
  for (const f of FIREFLIES) {
    const x = f.x + f.ax * Math.sin(t * f.sx + f.phase);
    const y = f.y + f.ay * Math.cos(t * f.sy + f.phase * 1.7);
    const lit = Math.max(0, Math.sin(t * f.blink + f.phase)) ** 2;
    glow(ctx, x, y, 34, '#d9ff6a', 0.75 * lit);
    ctx.globalAlpha = lit; ctx.fillStyle = '#f4ffb8';
    ctx.beginPath(); ctx.arc(x, y, 3, 0, BG_TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.globalCompositeOperation = 'source-over';
}
THEMES.garden = garden;
