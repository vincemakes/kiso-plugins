import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { concatListFile, ffmpegArgs, hasFades, missingInputs, parseCut } from '../src/compose.js'

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
