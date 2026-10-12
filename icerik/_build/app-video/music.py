"""Generates a soundtrack for one product video and muxes it in.

The music is built around the video's own timeline (meta.json from capture.cjs): the tempo is fitted so
every callout lands exactly on a beat, each callout starts a new bar with a chord change and an accent,
taps get a soft tick and page changes a short swish. Everything is synthesised here, no samples.

Usage: python music.py <frames_dir> <video_dir> <bahce|tercume|crm|muh> [--wav-only]
Writes <video_dir>/<file>-muzikli.mp4 (video stream copied, audio added) and <frames_dir>/<name>.wav.
"""
import json
import math
import pathlib
import subprocess
import sys

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 44100
FPS, FLY_IN, FLY_OUT, OUTRO = 30, 22, 14, 96      # must match compose.html
HIT_DELAY = 0.08                                    # the callout card has visibly landed this long after it starts

# Per video: output file, tempo search range, and a four-chord loop as (bass MIDI note, pad MIDI notes).
MOODS = {
    'bahce': dict(file='01-mekan-sitesi', bpm=(98, 110), seed=11, chords=[
        (36, [52, 55, 59, 62]), (33, [52, 55, 60, 64]), (41, [52, 57, 60, 67]), (43, [50, 57, 59, 64])]),
    'tercume': dict(file='02-kurumsal-site', bpm=(102, 114), seed=23, chords=[
        (38, [53, 57, 60, 64]), (34, [50, 53, 57, 62]), (41, [52, 57, 60, 67]), (36, [52, 55, 57, 62])]),
    'crm': dict(file='03-randevu-crm', bpm=(94, 106), seed=37, chords=[
        (40, [55, 59, 62, 66]), (36, [52, 55, 59, 64]), (43, [50, 55, 59, 69]), (38, [54, 57, 62, 64])]),
    'muh': dict(file='04-muhasebe', bpm=(106, 118), seed=41, chords=[
        (41, [52, 57, 60, 67]), (38, [53, 57, 60, 64]), (34, [53, 57, 60, 62]), (36, [53, 58, 60, 62])]),
}

hz = lambda midi: 440.0 * 2 ** ((midi - 69) / 12)
seconds = lambda n: np.arange(int(n * SR)) / SR
sos = lambda kind, cutoff, order=2: signal.butter(order, cutoff, kind, fs=SR, output='sos')


# ── instruments (mono float arrays unless noted) ─────
def kick():
    t = seconds(0.3)
    sweep = 50 + 100 * np.exp(-t * 34)
    body = np.sin(2 * np.pi * np.cumsum(sweep) / SR) * np.exp(-t * 12)
    click = 0.3 * np.sin(2 * np.pi * 1700 * t) * np.exp(-t * 500)
    return (body + click) * np.minimum(1, t / 0.002)


def hat(rng, decay):
    t = seconds(6.5 / decay)
    return signal.sosfilt(sos('hp', 5200, 4), rng.standard_normal(len(t))) * np.exp(-t * decay)


def clap(rng):
    t = seconds(0.32)
    noise = signal.sosfilt(sos('bp', [900, 5000]), rng.standard_normal(len(t)))
    bursts = sum(np.where(t >= d, np.exp(-(t - d) * 240), 0) for d in (0, 0.011, 0.022)) * 0.5
    return noise * (bursts + np.where(t >= 0.03, np.exp(-(t - 0.03) * 26), 0))


def bass(freq, dur):
    t = seconds(dur)
    wave = np.sin(2 * np.pi * freq * t) + 0.42 * np.sin(4 * np.pi * freq * t) + 0.16 * np.sin(6 * np.pi * freq * t)
    return wave * np.minimum(1, t / 0.008) * np.exp(-t * 2.4) * np.clip((dur - t) / 0.03, 0, 1)


def pad(rng, freqs, dur):
    """Soft stereo chord: three slightly detuned voices per note, spread left and right. Returns (2, n)."""
    tail = 0.6
    t = seconds(dur + tail)
    out = np.zeros((2, len(t)))
    for freq in freqs:
        for detune, pan in ((-0.0035, -0.7), (0.0, 0.0), (0.0035, 0.7)):
            f = freq * (1 + detune)
            voice = sum(np.sin(2 * np.pi * f * k * t + rng.uniform(0, 6.28)) / k ** 1.7 for k in range(1, 6))
            out[0] += voice * math.cos((pan + 1) * math.pi / 4)
            out[1] += voice * math.sin((pan + 1) * math.pi / 4)
    env = np.minimum(1, t / 0.22) * np.clip((dur + tail - t) / tail, 0, 1)
    return signal.sosfilt(sos('hp', 170), signal.sosfilt(sos('lp', 3600), out)) * env / (len(freqs) * 3)


def pluck(freq, length=1.3):
    t = seconds(length)
    partials = ((1, 1.0, 5.5), (2, 0.62, 7.5), (3, 0.42, 10), (4.01, 0.28, 13), (5.02, 0.18, 16), (6.03, 0.1, 20))
    return sum(a * np.sin(2 * np.pi * freq * k * t) * np.exp(-t * d) for k, a, d in partials) * np.minimum(1, t / 0.003)


def bell(freq, length=2.8):
    t = seconds(length)
    mod = 2.4 * np.exp(-t * 3) * np.sin(2 * np.pi * freq * 3.5 * t)
    return np.sin(2 * np.pi * freq * t + mod) * np.exp(-t * 1.9) * np.minimum(1, t / 0.004)


def tick(rng):
    t = seconds(0.09)
    sweep = 1000 + 700 * np.exp(-t * 120)
    tok = np.sin(2 * np.pi * np.cumsum(sweep) / SR) * np.exp(-t * 80)
    snap = signal.sosfilt(sos('bp', [2500, 6000]), rng.standard_normal(len(t))) * np.exp(-t * 700) * 0.5
    return tok + snap


def pop():
    t = seconds(0.11)
    sweep = 520 + 900 * (t / 0.11) ** 0.6
    return np.sin(2 * np.pi * np.cumsum(sweep) / SR) * np.sin(np.pi * t / 0.11) ** 1.5


def impact(rng):
    t = seconds(0.7)
    sub = np.sin(2 * np.pi * np.cumsum(38 + 34 * np.exp(-t * 14)) / SR) * np.exp(-t * 6)
    thud = signal.sosfilt(sos('lp', 260), rng.standard_normal(len(t))) * np.exp(-t * 22) * 1.5
    return (sub + thud) * np.minimum(1, t / 0.003)


def swish(rng, dur, rising=True):
    """Noise sliding from a low band to a high band (or back): card slides, page changes."""
    t = seconds(dur)
    noise = rng.standard_normal(len(t))
    low = signal.sosfilt(sos('bp', [350, 1100]), noise)
    high = signal.sosfilt(sos('bp', [1800, 6500]), noise)
    p = t / dur if rising else 1 - t / dur
    return (low * (1 - p) + high * p) * np.sin(np.pi * t / dur) ** 2


def riser(rng, dur):
    t = seconds(dur)
    return signal.sosfilt(sos('hp', 1500), rng.standard_normal(len(t))) * (t / dur) ** 2.5


# ── timeline ─────────────────────────────────────────
def fit_tempo(anchors, bpm_range):
    """Picks the tempo at which every stretch between anchors is closest to a whole number of eighth notes."""
    best = None
    for bpm in np.arange(bpm_range[0], bpm_range[1] + 0.01, 0.25):
        eighth = 30 / bpm
        spans = list(zip(anchors, anchors[1:]))
        counts = [max(2, round((b - a) / eighth)) for a, b in spans]
        drift = max(abs((b - a) / n / eighth - 1) for (a, b), n in zip(spans, counts))
        if best is None or drift < best[0]:
            best = (drift, float(bpm), counts)
    return best


def bars_of(count):
    """Splits a stretch of eighth notes into bars of eight; a short remainder joins the last bar."""
    if count < 12:
        return [count]
    full, rest = divmod(count, 8)
    lengths = [8] * full
    if rest >= 4:
        lengths.append(rest)
    else:
        lengths[-1] += rest
    return lengths


class Mix:
    BUSES = ('drums', 'bass', 'pad', 'lead', 'fx', 'send')

    def __init__(self, duration):
        self.n = int(duration * SR) + SR // 2
        self.buses = {name: np.zeros((2, self.n)) for name in self.BUSES}

    def add(self, bus, t, sound, gain=1.0, pan=0.0, send=0.0):
        start = int(round(t * SR))
        if start < 0:
            sound, start = sound[..., -start:], 0
        length = min(sound.shape[-1], self.n - start)
        if length <= 0:
            return
        if sound.ndim == 1:
            angle = (pan + 1) * math.pi / 4
            stereo = np.stack([sound[:length] * math.cos(angle), sound[:length] * math.sin(angle)])
        else:
            stereo = sound[:, :length]
        self.buses[bus][:, start:start + length] += stereo * gain
        if send:
            self.buses['send'][:, start:start + length] += stereo * gain * send


def duck(n, kick_times, beat, depth):
    """Gain curve that dips on every kick and recovers within the beat (the 'pumping' feel)."""
    curve = np.ones(n)
    window = int(beat * 0.95 * SR)
    shape = 1 - depth * np.exp(-np.arange(window) / (0.2 * beat * SR))
    for t in kick_times:
        start = int(t * SR)
        end = min(n, start + window)
        curve[start:end] = np.minimum(curve[start:end], shape[:end - start])
    return curve


def build(name, meta):
    mood = MOODS[name]
    rng = np.random.default_rng(mood['seed'])
    at = lambda app_frame: (app_frame + FLY_IN) / FPS
    duration = (meta['frames'] + FLY_IN + FLY_OUT + OUTRO) / FPS
    outro_at = (meta['frames'] + FLY_IN + FLY_OUT - 4) / FPS
    callouts = [at(step['frame']) + HIT_DELAY for step in meta['steps']]
    taps = [at(tap['frame']) for tap in meta['taps']]
    cuts = [at(cut) for cut in meta['cuts']]

    anchors = [0.0] + callouts + [outro_at]
    drift, bpm, counts = fit_tempo(anchors, mood['bpm'])
    beat = 60 / bpm
    chord = lambda i: mood['chords'][i % len(mood['chords'])]

    mix = Mix(duration)
    kick_s, clap_s, tick_s, pop_s, impact_s = kick(), clap(rng), tick(rng), pop(), impact(rng)
    arp_order = [0, 2, 1, 3, 2, 0, 3, 1]
    kick_times, hits, chord_index = [], [], -1

    for stretch, (start, end, count) in enumerate(zip(anchors, anchors[1:], counts)):
        eighth = (end - start) / count
        intro = stretch == 0                                # before the first callout: no kick or bass yet
        offset = 0
        for bar_len in bars_of(count):
            chord_index += 1
            root, notes = chord(chord_index)
            bar_at = start + offset * eighth
            last_bar = offset + bar_len == count
            swell = 0.55 if intro else 1.0
            mix.add('pad', bar_at, pad(rng, [hz(m) for m in notes], bar_len * eighth), gain=0.42 * swell, send=0.35)

            for k in range(bar_len):
                t = bar_at + k * eighth
                if intro:
                    mix.add('drums', t, hat(rng, 95), gain=0.075, pan=-0.3)
                    continue
                if k % 2 == 0:
                    pickup = last_bar and k == bar_len - 1     # odd-length bar: its last kick leads into the callout
                    mix.add('drums', t, kick_s, gain=0.34 if pickup else 0.64)
                    kick_times.append(t)
                    if k % 4 == 2:
                        mix.add('drums', t, clap_s, gain=0.2, pan=0.1, send=0.5)
                else:
                    mix.add('drums', t, hat(rng, 34), gain=0.16 * rng.uniform(0.85, 1.1), pan=0.25)
                    mix.add('bass', t, bass(hz(root + (12 if k % 8 == 7 else 0)), eighth * 0.92), gain=0.23)
                if k % 8 in (3, 6):                             # chord stabs
                    for i, note in enumerate(notes):
                        mix.add('lead', t, pluck(hz(note + 12), 0.45), gain=0.075, pan=-0.4 + 0.27 * i, send=0.4)
                mix.add('drums', t + eighth / 2, hat(rng, 95), gain=0.08 * rng.uniform(0.7, 1.1), pan=-0.3)
                mix.add('lead', t, pluck(hz(notes[arp_order[k % 8]] + 12), 0.6), gain=0.12, pan=0.5 * math.sin(k * 1.3), send=0.5)

            # The callout: slide-in swish, pop, low impact and a rising three-note figure on the new chord.
            if offset == 0 and not intro:
                hits.append(bar_at)
                mix.add('fx', bar_at - 0.17, swish(rng, 0.2), gain=0.07, pan=-0.2)
                mix.add('fx', bar_at - 0.02, pop_s, gain=0.07, send=0.3)
                mix.add('fx', bar_at, impact_s, gain=0.24)
                for i, (note, gain) in enumerate(((notes[1] + 12, 0.3), (notes[2] + 12, 0.3), (notes[3] + 12, 0.38))):
                    for echo, (delay, level, pan) in enumerate(((0, 1.0, 0.0), (3 * eighth, 0.36, -0.6), (6 * eighth, 0.16, 0.6))):
                        mix.add('lead', bar_at + i * eighth / 2 + delay, pluck(hz(note)), gain=gain * level, pan=pan, send=0.7)
                if stretch == 1:
                    mix.add('drums', bar_at, hat(rng, 5), gain=0.07, send=0.4)   # opening crash
            offset += bar_len

    # intro: the phone flies in, then a riser into the first callout
    mix.add('fx', 0.03, swish(rng, 0.65), gain=0.07, pan=0.3, send=0.3)
    lead_in = min(1.2, callouts[0] - 0.15)
    mix.add('fx', callouts[0] - lead_in, riser(rng, lead_in), gain=0.045, send=0.3)

    for t in taps:
        mix.add('fx', t, tick_s, gain=0.2, pan=rng.uniform(-0.2, 0.2), send=0.25)
    for t in cuts:
        mix.add('fx', t - 0.1, swish(rng, 0.26, rising=False), gain=0.05, pan=rng.uniform(-0.3, 0.3))

    # outro: the beat stops, one long chord, bells follow the logo animation
    root, notes = chord(0)
    mix.add('fx', outro_at - 0.9, riser(rng, 0.9), gain=0.05, send=0.3)
    mix.add('fx', outro_at, impact_s, gain=0.4)
    mix.add('pad', outro_at, pad(rng, [hz(m) for m in notes] + [hz(root + 12)], 2.9), gain=0.6, send=0.6)
    mix.add('bass', outro_at, bass(hz(root), 1.6), gain=0.32)
    outro_bells = [(0.2, notes[3] + 12, 0.15), (1.15, notes[1] + 12, 0.13), (1.32, notes[0] + 12, 0.1), (1.37, notes[2] + 12, 0.1),
                   (1.42, notes[3] + 12, 0.12), (1.9, notes[2] + 24, 0.07), (2.25, notes[3] + 24, 0.09)]
    for delay, note, gain in outro_bells:
        mix.add('lead', outro_at + delay, bell(hz(note)), gain=gain, pan=0.3 * math.sin(delay * 5), send=0.8)

    # pumping, reverb, master
    for bus, depth in (('pad', 0.55), ('bass', 0.3), ('lead', 0.2)):
        mix.buses[bus] *= duck(mix.n, kick_times, beat, depth)
    ir_t = seconds(1.3)
    wet = np.stack([
        signal.fftconvolve(mix.buses['send'][ch], signal.sosfilt(sos('lp', 6000), rng.standard_normal(len(ir_t))) * np.exp(-ir_t * 4.2), mode='full')[:mix.n]
        for ch in (0, 1)])
    levels = {bus: 20 * math.log10(max(1e-9, float(np.sqrt(np.mean(mix.buses[bus] ** 2))))) for bus in Mix.BUSES if bus != 'send'}
    master = sum(mix.buses[bus] for bus in Mix.BUSES if bus != 'send') + wet * 0.012
    master = signal.sosfilt(sos('hp', 28), master)
    master = np.tanh(master * 1.1)
    master *= 0.89 / np.max(np.abs(master))
    n = int(duration * SR)
    master = master[:, :n]
    master[:, -int(0.6 * SR):] *= np.linspace(1, 0, int(0.6 * SR)) ** 1.5
    master[:, :int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))

    rms = 20 * math.log10(float(np.sqrt(np.mean(master ** 2))))
    print(f'{name}: {bpm:.2f} BPM, worst tempo drift {drift * 100:.1f}%, {len(callouts)} callouts, {len(taps)} taps, {len(cuts)} page changes')
    print('   bus RMS dB:', ' '.join(f'{bus} {level:.1f}' for bus, level in levels.items()), f'| master RMS {rms:.1f} dBFS, {duration:.2f} s')
    return master, hits, callouts


def main():
    frames_dir, video_dir, name = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), sys.argv[3]
    meta = json.loads((frames_dir / name / 'meta.json').read_text(encoding='utf8'))
    master, hits, callouts = build(name, meta)
    assert all(abs(a - b) < 1e-6 for a, b in zip(hits, callouts)), 'accents drifted off the callouts'

    wav = frames_dir / f'{name}.wav'
    wavfile.write(wav, SR, (master.T * 32767).astype(np.int16))
    if '--wav-only' in sys.argv:
        print('  ', wav)
        return
    video = video_dir / f"{MOODS[name]['file']}.mp4"
    out = video_dir / f"{MOODS[name]['file']}-muzikli.mp4"
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(video), '-i', str(wav), '-map', '0:v', '-map', '1:a',
                    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', str(out)], check=True)
    print('  ', out, f'{out.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
