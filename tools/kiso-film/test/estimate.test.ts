import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { estimate, readShots } from '../src/estimate.js'
import { loadTable, type Table } from '../src/models.js'

const table: Table = loadTable()
const shots = [{ id: '1-01', duration_s: 3 }, { id: '1-02', duration_s: 5 }]
const base = { shots, videoModelId: 'seedance-2-5', imageModelId: 'flux-dev', resolution: '720p', budgetUsd: null }

test('the clip line is seconds times the price at the chosen resolution', () => {
  const r = estimate(table, base)
  const clips = r.lines.find((l) => l.what === 'clips')
  assert.ok(clips !== undefined)
  assert.equal(clips.seconds, 8)
  assert.ok(clips.usd !== null && clips.usd > 0)
})

test('a shot list is a JSON ARRAY — an object at the top level is refused with the reason', () => {
  // The same rule the shot-list skill states: the host's table renderer reads
  // a top-level array, and so does this.
  const dir = mkdtempSync(join(tmpdir(), 'kiso-film-est-'))
  try {
    const p = join(dir, 'shots.json')
    writeFileSync(p, JSON.stringify({ shots: [{ id: 'a', duration_s: 2 }] }))
    assert.throws(() => readShots(p), /must be a JSON array/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('a row with no usable duration is SKIPPED and named, never counted as zero', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kiso-film-est-'))
  try {
    const p = join(dir, 'shots.json')
    writeFileSync(p, JSON.stringify([{ id: 'a', duration_s: 2 }, { id: 'b' }, { id: 'c', duration_s: 'soon' }]))
    const { shots: got, skipped } = readShots(p)
    assert.equal(got.length, 1)
    assert.equal(skipped.length, 2)
    assert.ok(skipped.every((s) => /duration_s/.test(s)))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('an unpriced model leaves the TOTAL null rather than adding a zero', () => {
  const r = estimate(table, { ...base, videoModelId: 'not-a-model' })
  assert.equal(r.totalUsd, null)
  assert.ok(r.unpricedCount > 0)
  assert.ok(r.notes.some((n) => /not-a-model/.test(n)))
})

test('anyUnverified is true while the table is unverified — which is the whole point of the field', () => {
  assert.equal(estimate(table, base).anyUnverified, true)
})

test('a budget is only exceeded when there is a real total to exceed it with', () => {
  assert.equal(estimate(table, { ...base, budgetUsd: 0.01 }).overBudget, true)
  assert.equal(estimate(table, { ...base, budgetUsd: 10_000 }).overBudget, false)
  // Nothing priced, so nothing can be over budget: a null total is not zero.
  assert.equal(estimate(table, { ...base, videoModelId: 'not-a-model', imageModelId: 'nor-this', budgetUsd: 0.01 }).overBudget, false)
})

test('one first frame per shot by default, and the count follows the shots', () => {
  const r = estimate(table, base)
  const frames = r.lines.find((l) => l.what === 'first frames')
  assert.equal(frames?.count, shots.length)
  assert.equal(estimate(table, { ...base, imagesPerShot: 3 }).lines.find((l) => l.what === 'first frames')?.count, shots.length * 3)
})
