"""Original deterministic 120 BPM instrumental. No downloaded samples or model calls."""
import json, math, pathlib, sys, wave
import numpy as np
from PIL import Image

out = pathlib.Path(sys.argv[1]).resolve()
out.mkdir(parents=True, exist_ok=True)
sr, duration, bpm = 48000, 96, 120
rng = np.random.default_rng(221026)
mix = np.zeros((sr * duration, 2), dtype=np.float64)
beat, bar = 60 / bpm, 4 * 60 / bpm
freq = lambda midi: 440 * 2 ** ((midi - 69) / 12)

def add(sound, at, gain=1., pan=0.):
    first = round(at * sr)
    if first < 0 or first >= len(mix): return
    sound = sound[:len(mix) - first] * gain
    angle = (pan + 1) * math.pi / 4
    mix[first:first + len(sound), 0] += sound * math.cos(angle)
    mix[first:first + len(sound), 1] += sound * math.sin(angle)

def pluck(midi, length=1.):
    t = np.arange(round(sr * length)) / sr
    f = freq(midi)
    return (np.sin(2 * np.pi * f * t + .7 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 9))
            + .12 * np.sin(2 * np.pi * f * 3 * t)) * np.exp(-t * 4.8) * np.minimum(t * 180, 1)

roots, chords = [38, 34, 41, 36], [[62, 65, 69], [58, 62, 65], [60, 65, 69], [60, 64, 67]]
sections = [0, 6, 16, 28, 40, 50, 60, 74, 88]
for index in range(48):
    at, harmony = index * bar, (index // 4) % 4
    root, chord = roots[harmony], chords[harmony]
    t = np.arange(round(sr * 2.3)) / sr
    env = np.minimum(t / .18, 1) * np.minimum(np.maximum(2.3 - t, 0) / .4, 1)
    pad = sum(np.sin(2 * np.pi * freq(note) * t + .04 * np.sin(2 * np.pi * .3 * t)) for note in chord) / 3
    add(pad * env, at, .055, (-1) ** index * .12)
    # Understated arrangement: fewer drums around the audit and honest-limit ending.
    sparse = 40 <= at < 50 or at >= 88
    for j in range(4):
        if j in ([0] if sparse else [0, 2]):
            t = np.arange(round(sr * .25)) / sr
            kick = np.sin(2 * np.pi * (45 * t + 40 * .025 * (1 - np.exp(-t / .025)))) * np.exp(-t * 18)
            add(kick, at + j * beat, .19)
        if j in [1, 3] and not sparse:
            t = np.arange(round(sr * .12)) / sr
            noise = np.diff(rng.normal(size=len(t) + 1)) * .5
            add(noise * np.exp(-t * 55), at + j * beat, .045, .12)
    for j in range(4 if sparse else 8):
        t = np.arange(round(sr * .06)) / sr
        noise = np.diff(rng.normal(size=len(t) + 1)) * .5
        add(noise * np.exp(-t * 95), at + j * (beat if sparse else beat / 2), .027 if j % 2 else .019, (-1) ** j * .35)
    for offset, note in [(0., root), (1., root + 7)]:
        t = np.arange(round(sr * .65)) / sr
        bass = (np.sin(2 * np.pi * freq(note) * t) + .16 * np.sin(4 * np.pi * freq(note) * t)) * np.exp(-t * 5) * np.minimum(t * 200, 1)
        add(bass, at + offset, .085)
    for j, offset in enumerate([.25, .875, 1.5]):
        note = chord[(index + j) % 3] + (12 if j == 2 else 0)
        sound = pluck(note)
        add(sound, at + offset, .065 if not sparse else .038, (-1) ** j * .22)
        add(sound, at + offset + .25, .012, (-1) ** (j + 1) * .55)

# Original two-note editorial accents mark chapter changes, not application-generated sounds.
for at in sections:
    add(pluck(74, 1.2), at, .08, -.15)
    add(pluck(81, 1.2), at + .125, .045, .15)
fade = np.minimum(np.arange(len(mix)) / (sr * .18), 1)
fade *= np.minimum((len(mix) - 1 - np.arange(len(mix))) / (sr * 2.), 1)
mix *= fade[:, None]
mix *= .82 / max(np.max(np.abs(mix)), 1e-12)
with wave.open(str(out / 'original-score.wav'), 'wb') as wav:
    wav.setnchannels(2); wav.setsampwidth(2); wav.setframerate(sr)
    wav.writeframes((np.clip(mix, -1, 1) * 32767).astype('<i2').tobytes())
grid = { 'title': 'Evidence / 120', 'original': True, 'samples': 'All synthesized locally; no third-party samples',
         'seed': 221026, 'bpm': bpm, 'duration': duration, 'sampleRate': sr, 'channels': 2,
         'chapterDownbeats': sections, 'beatSeconds': [i * beat for i in range(duration * 2)],
         'key': 'D minor, original Dm/Bb/F/C voicings', 'masterTarget': '-18 LUFS, -1.5 dBTP',
         'listeningLimit': 'Programmatic synthesis and metering; no claim of human listening review.' }
(out / 'score.json').write_text(json.dumps(grid, indent=2) + '\n', encoding='utf8')
# Restrained original grain on the editorial rails only; product pixels are composited above it.
grain = rng.normal(0, .85, (1080, 1920, 1))
base = np.array([13, 31, 25])[None, None, :]
Image.fromarray(np.clip(base + grain, 0, 255).astype('uint8'), 'RGB').save(out / 'editorial-ground.png')
print(json.dumps({'score': str(out / 'original-score.wav'), 'duration': duration, 'bpm': bpm}))
