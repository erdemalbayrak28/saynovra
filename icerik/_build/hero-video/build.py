"""Renders the hero loop: sprite sheets via headless Chrome -> frames -> MP4 (master + web) and a poster.

Usage: python build.py [--preview]   (--preview renders 4 sample frames into one sheet and stops)
"""
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile

from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CHROME = os.environ.get('CHROME_PATH', 'C:/Program Files/Google/Chrome/Application/chrome.exe')
W, H = 1080, 1350
FPS, SECONDS = 30, 8
FRAMES = FPS * SECONDS
COLS, ROWS = 4, 3
MASTER = ROOT / 'icerik' / 'gonderiler' / 'hero-dongu' / 'saynovra-hero-1080x1350.mp4'
WEB = ROOT / 'site' / 'public' / 'media' / 'hero.mp4'
POSTER = ROOT / 'site' / 'public' / 'media' / 'hero-poster.jpg'


def shoot(start, count, cols, out):
    rows = -(-count // cols)
    url = f'{(HERE / "render.html").as_uri()}?frames={FRAMES}&start={start}&count={count}&cols={cols}'
    subprocess.run([
        CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
        f'--window-size={W * cols},{H * rows}', '--virtual-time-budget=5000', f'--screenshot={out}', url,
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def encode(pattern, out, width, crf):
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        'ffmpeg', '-y', '-v', 'error', '-framerate', str(FPS), '-i', pattern,
        '-vf', f'scale={width}:-2:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf),
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', str(out),
    ], check=True)


def main():
    work = pathlib.Path(tempfile.mkdtemp(prefix='saynovra-hero-'))
    try:
        if '--preview' in sys.argv:
            out = HERE / 'preview.png'
            sheet = work / 'preview.png'
            subprocess.run([
                CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                f'--window-size={W * 4},{H}', '--virtual-time-budget=5000', f'--screenshot={sheet}',
                f'{(HERE / "render.html").as_uri()}?frames=17&start=1&count=4&cols=4',
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            Image.open(sheet).resize((W * 4 // 3, H // 3), Image.LANCZOS).save(out)
            print(out)
            return

        per_sheet = COLS * ROWS
        for start in range(0, FRAMES, per_sheet):
            count = min(per_sheet, FRAMES - start)
            sheet = work / f'sheet-{start}.png'
            shoot(start, count, COLS, sheet)
            image = Image.open(sheet).convert('RGB')
            for i in range(count):
                x, y = (i % COLS) * W, (i // COLS) * H
                image.crop((x, y, x + W, y + H)).save(work / f'f{start + i:04d}.png')
            sheet.unlink()
            print(f'frames {start}-{start + count - 1}')

        pattern = str(work / 'f%04d.png')
        encode(pattern, MASTER, W, 16)
        encode(pattern, WEB, 720, 24)
        Image.open(work / 'f0030.png').resize((720, 900), Image.LANCZOS).save(POSTER, quality=82)
        for path in (MASTER, WEB, POSTER):
            print(f'{path}  {path.stat().st_size // 1024} KB')
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == '__main__':
    main()
