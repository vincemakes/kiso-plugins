import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildInput, checkSupported, writeDuration, asReference } from '../src/request.js'
import { byId, loadTable } from '../src/models.js'

const table = loadTable()
const model = (id: string) => {
  const m = byId(table, id)
  assert.ok(m !== undefined, `${id} is not in the table`)
  return m
}

test('a model that takes no motion reference is REFUSED one, and told which models do', () => {
  // The spike's switch. A model given a motion reference it cannot use either
  // ignores it — the person pays for a shot that did not do what they asked —
  // or fails with the provider's own error, which says nothing about why.
  const veo = table.models.find((m) => m.kind === 'video' && m.capabilities?.motionReference !== true)
  assert.ok(veo !== undefined)
  const problems = checkSupported(veo, { prompt: 'x', motionReference: 'move.mp4' }, table)
  assert.equal(problems.length, 1)
  assert.match(problems[0] as string, /does not take a motion reference/)
  assert.match(problems[0] as string, /Models in the table that do: /)
})

test('a model that DOES take one is not refused', () => {
  const taker = table.models.find((m) => m.capabilities?.motionReference === true)
  assert.ok(taker !== undefined)
  assert.deepEqual(checkSupported(taker, { prompt: 'x', motionReference: 'move.mp4' }, table), [])
})

test('every complaint at once, not the first', () => {
  const m = model('veo-3-1')
  const problems = checkSupported(m, { prompt: 'x', motionReference: 'a.mp4', durationSeconds: 9999, resolution: 'imax' }, table)
  assert.ok(problems.length >= 2, `expected several, got ${JSON.stringify(problems)}`)
})

test('too many reference images is counted, and the limit is named', () => {
  const m = model('hailuo-2-3')
  const max = m.capabilities?.maxReferenceImages ?? 0
  const problems = checkSupported(m, { prompt: 'x', references: Array.from({ length: max + 2 }, (_, i) => `r${i}.png`) }, table)
  assert.equal(problems.length, 1)
  assert.match(problems[0] as string, new RegExp(`at most ${max}`))
})

test('a duration outside the model\'s range is refused with the range', () => {
  const m = model('seedance-2-5')
  const d = m.duration
  assert.ok(d !== undefined)
  const problems = checkSupported(m, { prompt: 'x', durationSeconds: d.maxSeconds + 1 }, table)
  assert.match(problems[0] ?? '', new RegExp(`between ${d.minSeconds} and ${d.maxSeconds}`))
})

test('the body uses the parameter names the TABLE gives, never names invented here', () => {
  const m = model('seedance-2-5')
  const body = buildInput(m, { prompt: 'a shot', references: ['a.png'], resolution: '720p', aspectRatio: '9:16' })
  assert.equal(body['prompt'], 'a shot')
  assert.ok(m.params !== undefined)
  assert.deepEqual(body[m.params['referenceImages'] as string], ['file://a.png'])
  assert.equal(body[m.params['resolution'] as string], '720p')
  assert.equal(body[m.params['aspectRatio'] as string], '9:16')
})

test('a duration is written the way the route asks for it', () => {
  assert.equal(writeDuration(5, 'int'), 5)
  assert.equal(writeDuration(5, 'str'), '5')
  assert.equal(writeDuration(5, 'suffix_s'), '5s')
  assert.equal(writeDuration(5, null), '5')
})

test('a URL is left alone and a local path is named as a file', () => {
  assert.equal(asReference('https://example.invalid/a.png'), 'https://example.invalid/a.png')
  assert.equal(asReference('/tmp/a.png'), 'file:///tmp/a.png')
})
