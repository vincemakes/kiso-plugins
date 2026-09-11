import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { concatListFile, effectiveDurations, ffmpegArgs, hasFades, hasTrims, missingInputs, parseCut } from '../src/compose.js'

const work = (): string => mkdtempSync(join(tmpdir(), 'kiso-film-cut-'))

test('a clip may be a bare path or an object', () => {
  const cut = parseCut(JSON.stringify({ clips: ['a.mp4', { path: 'b.mp4', fadeInSeconds: 0.5 }] }), 'cut.json')
  assert.equal(cut.clips.length, 2)
  assert.equal(cut.clips[0]?.path, 'a.mp4')
  assert.equal(cut.clips[1]?.fadeInSeconds, 0.5)
})

test('a cut with nothing in it is refused, and says why', () => {
  assert.throws(() => parseCut(JSON.stringify({ clips: [] }), 'cut.json'), /not a cut/)
  assert.throws(() => parseCut('{ nope', 'cut.json'), /not valid JSON/)
})

test('EVERY missing file is named at once, not the first', () => {
  const dir = work()
  try {
    writeFileSync(join(dir, 'there.mp4'), 'x')
    const cut = parseCut(JSON.stringify({ clips: ['there.mp4', 'gone.mp4', 'also-gone.mp4'], audio: 'nope.wav' }), 'cut.json')
    const missing = missingInputs(cut, dir)
    assert.equal(missing.length, 3)
    assert.deepEqual(missing.map((m) => m.what).sort(), ['also-gone.mp4', 'gone.mp4', 'nope.wav'])
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('a cross-fade offset is measured from the growing result, not from the clip', () => {
  // Each fade OVERLAPS its two sides, so every later offset is short by the
  // fades already spent. Getting this wrong drifts the film later and later
  // out of sync, which is invisible until the last clip.
  const cut = parseCut(JSON.stringify({ clips: ['a.mp4', { path: 'b.mp4', fadeInSeconds: 1 }, { path: 'c.mp4', fadeInSeconds: 1 }] }), 'cut.json')
  const args = ffmpegArgs(cut, 'out.mp4', [4, 4, 4])
  const filter = args[args.indexOf('-filter_complex') + 1] ?? ''
  // first fade at 4 - 1 = 3; the result is then 4 - 1 + 4 = 7, so the second
  // is at 7 - 1 = 6 rather than at 8.
  assert.match(filter, /offset=3\.000/)
  assert.match(filter, /offset=6\.000/)
  assert.doesNotMatch(filter, /offset=8\.000/)
})

test('no fades means the cheap path, and the cheap path does not re-encode', () => {
  const cut = parseCut(JSON.stringify({ clips: ['a.mp4', 'b.mp4'] }), 'cut.json')
  assert.equal(hasFades(cut), false)
  const dir = work()
  try {
    const list = join(dir, 'clips.txt')
    concatListFile(cut, list, dir)
    const text = readFileSync(list, 'utf8')
    assert.match(text, /^file '/m)
    assert.equal(text.trim().split('\n').length, 2)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test("a path with a quote in it does not break out of the concat list", () => {
  const cut = parseCut(JSON.stringify({ clips: ["it's here.mp4"] }), 'cut.json')
  const dir = work()
  try {
    const list = join(dir, 'clips.txt')
    concatListFile(cut, list, dir)
    assert.match(readFileSync(list, 'utf8'), /it'\\''s here\.mp4/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('one audio track is mapped, and its fade-out lands at the end of the film', () => {
  const cut = parseCut(JSON.stringify({ clips: ['a.mp4', { path: 'b.mp4', fadeInSeconds: 1 }], audio: 'score.wav', audioFadeOutSeconds: 2 }), 'cut.json')
  const args = ffmpegArgs(cut, 'out.mp4', [4, 4])
  assert.ok(args.includes('-map'))
  assert.ok(args.some((a) => a === '2:a'), 'the audio input is mapped after the clips')
  const af = args[args.indexOf('-af') + 1] ?? ''
  // 4 - 1 + 4 = 7 long, so a two-second fade starts at 5.
  assert.match(af, /st=5\.000:d=2/)
})

/* ── the trim: the second number a shot list records ───────────────────── */

test('a trim is read off a clip, and a negative one is refused', () => {
  const cut = parseCut(JSON.stringify({ clips: [{ path: 'a.mp4', trimToSeconds: 2 }, 'b.mp4'] }), 'cut.json')
  assert.equal(cut.clips[0]?.trimToSeconds, 2)
  assert.equal(cut.clips[1]?.trimToSeconds, undefined)
  assert.equal(hasTrims(cut), true)
  assert.throws(() => parseCut(JSON.stringify({ clips: [{ path: 'a.mp4', trimToSeconds: -1 }] }), 'cut.json'), /negative/)
})

test('a trimmed clip contributes its TRIM to the film, not its length', () => {
  // A model that will not generate below its floor produces a 3s clip for a
  // 2s insert. Counting the 3 would push every later fade a second late.
  const cut = parseCut(JSON.stringify({ clips: [{ path: 'a.mp4', trimToSeconds: 2 }, 'b.mp4', 'c.mp4'] }), 'cut.json')
  assert.deepEqual(effectiveDurations(cut, [3, 4, 4]), [2, 4, 4])
})

test('a trim longer than the clip loses to the file, which is the thing that exists', () => {
  const cut = parseCut(JSON.stringify({ clips: [{ path: 'a.mp4', trimToSeconds: 9 }] }), 'cut.json')
  assert.deepEqual(effectiveDurations(cut, [4]), [4])
})

test('the trim is applied to the input BEFORE anything else, and restarts the clock', () => {
  const cut = parseCut(JSON.stringify({ clips: [{ path: 'a.mp4', trimToSeconds: 2 }, { path: 'b.mp4', fadeInSeconds: 1 }] }), 'cut.json')
  const args = ffmpegArgs(cut, 'out.mp4', [3, 4])
  const filter = args[args.indexOf('-filter_complex') + 1] ?? ''
  assert.match(filter, /\[0:v\]trim=duration=2\.000,setpts=PTS-STARTPTS\[t0\]/)
  // Without setpts the trimmed stream keeps its original timestamps and the
  // fade lands nowhere near the cut.
  assert.match(filter, /\[t0\]\[1:v\]xfade/)
})

test('THE FADE AFTER A TRIM IS MEASURED FROM THE TRIMMED LENGTH', () => {
  // The whole reason effectiveDurations exists. Clip one is 3s on disk and 2s
  // in the film, so the one-second fade into clip two starts at 1, not at 2.
  const cut = parseCut(JSON.stringify({ clips: [{ path: 'a.mp4', trimToSeconds: 2 }, { path: 'b.mp4', fadeInSeconds: 1 }] }), 'cut.json')
  const filter = ffmpegArgs(cut, 'out.mp4', [3, 4])[ffmpegArgs(cut, 'out.mp4', [3, 4]).indexOf('-filter_complex') + 1] ?? ''
  assert.match(filter, /offset=1\.000/)
  assert.doesNotMatch(filter, /offset=2\.000/)
})

test('a cut with one clip and a trim still produces a filter graph', () => {
  const cut = parseCut(JSON.stringify({ clips: [{ path: 'a.mp4', trimToSeconds: 2 }] }), 'cut.json')
  const filter = ffmpegArgs(cut, 'out.mp4', [3])[ffmpegArgs(cut, 'out.mp4', [3]).indexOf('-filter_complex') + 1] ?? ''
  assert.match(filter, /trim=duration=2\.000/)
  assert.match(filter, /\[t0\]null\[v\]/)
})
