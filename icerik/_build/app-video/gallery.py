"""Builds the step-by-step screen galleries of the site's "İşler" section from the recorded frames.

    python gallery.py <frames_dir> <site_public_dir> [--check <sheet_dir>]

For every recorded step it writes one screen (and, for steps that start with a tap, the screen just
before the tap) to <site_public_dir>/media/isler/<slug>/ and rewrites the "slides" of projects.json.
--check also writes a contact sheet per project with the tap rings and outlines drawn in.
"""
import json
import pathlib
import sys

from PIL import Image, ImageDraw

VIEW_W, VIEW_H = 390, 844          # capture viewport (lib.cjs VIEWPORT)
OUT_W = 585                        # 1.5x of the viewport; the phone is shown about 330 px wide
QUALITY = 74

# One pick per step, in recording order:
#   ('still', frame)               one screen; an anchor that is active on that frame is drawn on it
#   ('tap', anchor_index, frame)   the screen before the tap (with a ring on the target), then the result
PICKS = {
    'bahce': ('mekan-sitesi', [
        ('still', 38), ('tap', 0, 158), ('still', 272), ('still', 579), ('still', 622),
        ('tap', 0, 888), ('tap', 0, 1097), ('tap', 0, 1183), ('tap', 0, 1388),
    ]),
    'tercume': ('kurumsal-site', [
        ('still', 38), ('tap', 1, 197), ('tap', 0, 316), ('still', 518), ('still', 646),
        ('still', 989), ('tap', 0, 1181), ('still', 1340), ('tap', 0, 1498), ('still', 1578),
    ]),
    'crm': ('randevu-crm', [
        ('still', 46), ('tap', 0, 144), ('tap', 0, 439), ('tap', 0, 506), ('tap', 0, 718),
        ('still', 761), ('tap', 0, 948), ('tap', 0, 1117), ('tap', 0, 1401), ('still', 1426),
    ]),
    'muh': ('muhasebe', [
        ('still', 38), ('tap', 0, 131), ('still', 207), ('still', 335), ('tap', 0, 520),
        ('tap', -1, 765), ('tap', 0, 852), ('tap', 0, 957), ('tap', 0, 1105), ('still', 1294),
    ]),
}


def pct(value, total):
    return round(100 * value / total, 2)


def mark_of(anchor):
    """Ring for a tap target, outline for an element that is only pointed at."""
    if anchor is None:
        return {}
    if 'box' in anchor:
        b = anchor['box']
        return {'box': {'x': pct(b['x'], VIEW_W), 'y': pct(b['y'], VIEW_H), 'w': pct(b['w'], VIEW_W), 'h': pct(b['h'], VIEW_H)}}
    return {'spot': {'x': pct(anchor['x'], VIEW_W), 'y': pct(anchor['y'], VIEW_H)}}


def anchor_at(step, frame):
    for a in step['anchors']:
        until = a['until'] if a['until'] is not None else frame
        if a['frame'] <= frame <= until:
            return a
    return None


def save(src, dst):
    im = Image.open(src).convert('RGB')
    im = im.resize((OUT_W, round(OUT_W * im.height / im.width)), Image.LANCZOS)
    im.save(dst, 'WEBP', quality=QUALITY, method=6)
    return im


def draw_mark(im, mark):
    d = ImageDraw.Draw(im)
    if 'spot' in mark:
        x, y = mark['spot']['x'] * im.width / 100, mark['spot']['y'] * im.height / 100
        d.ellipse([x - 26, y - 26, x + 26, y + 26], outline='#ff00ff', width=6)
    if 'box' in mark:
        b = mark['box']
        d.rectangle([b['x'] * im.width / 100, b['y'] * im.height / 100, (b['x'] + b['w']) * im.width / 100, (b['y'] + b['h']) * im.height / 100], outline='#ff00ff', width=6)
    return im


def main():
    args = sys.argv[1:]
    check = None
    if '--check' in args:
        i = args.index('--check')
        check = pathlib.Path(args[i + 1])
        del args[i:i + 2]
    frames, public = pathlib.Path(args[0]), pathlib.Path(args[1])
    projects_file = public / 'projects.json'
    projects = json.loads(projects_file.read_text(encoding='utf-8'))
    total = 0

    for key, (slug, picks) in PICKS.items():
        meta = json.loads((frames / key / 'meta.json').read_text(encoding='utf-8'))
        steps = meta['steps']
        if len(picks) != len(steps):
            raise SystemExit(f'{key}: {len(picks)} picks for {len(steps)} steps')
        out = public / 'media' / 'isler' / slug
        out.mkdir(parents=True, exist_ok=True)
        for old in out.glob('*.webp'):
            old.unlink()
        slides, thumbs = [], []

        for n, (step, pick) in enumerate(zip(steps, picks), start=1):
            slide = {'title': step['title'], 'text': step['text']}
            src = lambda f: frames / key / f'{f:04d}.jpg'
            if pick[0] == 'tap':
                anchor = step['anchors'][pick[1]]
                # A few frames into the hold, before the fingertip dot is drawn.
                before_frame = min(anchor['frame'] + 3, anchor['until'] or anchor['frame'] + 3)
                name = f'{n:02d}a.webp'
                im = save(src(before_frame), out / name)
                slide['before'] = {'image': f'media/isler/{slug}/{name}', **mark_of(anchor)}
                thumbs.append(draw_mark(im, slide['before']))
                frame = pick[2]
                mark = {}
            else:
                frame = pick[1]
                mark = mark_of(anchor_at(step, frame))
            name = f'{n:02d}.webp'
            im = save(src(frame), out / name)
            slide['image'] = f'media/isler/{slug}/{name}'
            slide.update(mark)
            slides.append(slide)
            thumbs.append(draw_mark(im, mark))

        project = next(p for p in projects if p['poster'].endswith(f'/{slug}.jpg'))
        for stale in ('video', 'duration', 'chapters'):
            project.pop(stale, None)
        project['slides'] = slides
        size = sum(f.stat().st_size for f in out.glob('*.webp'))
        total += size
        print(f'{slug}: {len(slides)} steps, {len(list(out.glob("*.webp")))} images, {size / 1024:.0f} KB')

        if check:
            w, h = 234, 506
            sheet = Image.new('RGB', (w * len(thumbs), h), '#111111')
            for i, im in enumerate(thumbs):
                sheet.paste(im.resize((w, h)), (i * w, 0))
            sheet.save(check / f'gallery-{slug}.png')

    projects_file.write_text(json.dumps(projects, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'total {total / 1024 / 1024:.1f} MB')


if __name__ == '__main__':
    main()
