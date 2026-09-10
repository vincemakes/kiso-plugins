import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { loadTable, schemaGaps, byId, isReachable, perSecondUsd, TableError } from '../src/models.js'
import { validate } from '../src/schema.js'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..')
const schema = JSON.parse(readFileSync(join(ROOT, 'data', 'models.schema.json'), 'utf8')) as Record<string, unknown>

test('every entry in the table validates against the schema', () => {
  const table = loadTable()
  assert.equal(validate(schema, table).length, 0)
  assert.ok(table.models.length >= 22, `expected the whole table, got ${table.models.length}`)
})

test('the schema uses no keyword the checker ignores', () => {
  // A keyword added to the schema in the belief that it is enforced would
  // otherwise pass in silence, which is the one failure a schema cannot show.
  assert.deepEqual(schemaGaps(), [])
})

test('the validator FIRES — a table broken one way at a time is refused', () => {
  const table = loadTable()
  const first = table.models[0]
  assert.ok(first !== undefined)
  const breaks: Array<[string, (m: Record<string, unknown>) => void]> = [
    ['a missing id', (m) => delete m['id']],
    ['an id that is not a path segment', (m) => (m['id'] = 'Not An Id')],
    ['a kind outside the two', (m) => (m['kind'] = 'sound')],
    ['a field the schema does not allow', (m) => (m['budget'] = 3)],
    ['a boolean where a number belongs', (m) => (m['verified'] = 'yes')]
  ]
  for (const [what, mutate] of breaks) {
    const copy = JSON.parse(JSON.stringify(first)) as Record<string, unknown>
    mutate(copy)
    const problems = validate(schema, { schemaVersion: 1, models: [copy] })
    assert.ok(problems.length > 0, `${what}: the schema accepted it — the check did not fire`)
  }
})

test('no two models share an id', () => {
  const ids = loadTable().models.map((m) => m.id)
  assert.equal(new Set(ids).size, ids.length)
})

test('every entry is unverified, and that is the point', () => {
  // Nothing in this table has been checked against a provider's own
  // documentation or a real call. The day one is, this test changes with it.
  for (const m of loadTable().models) assert.equal(m.verified, false, `${m.id} claims to be verified`)
})

test('a table that does not match its schema is refused with every problem', () => {
  assert.throws(() => loadTable('/nowhere-at-all'), TableError)
})

test('reachable means a key is present, and nothing more', () => {
  const table = loadTable()
  const fal = table.models.find((m) => m.provider === 'fal')
  assert.ok(fal !== undefined)
  assert.equal(isReachable(fal, {}), false)
  assert.equal(isReachable(fal, { FAL_KEY: '' }), false)
  assert.equal(isReachable(fal, { FAL_KEY: '   ' }), false)
  assert.equal(isReachable(fal, { FAL_KEY: 'anything-at-all' }), true)
})

test('a price by resolution wins over the flat rate, and a missing price is null not zero', () => {
  const table = loadTable()
  const withByRes = table.models.find((m) => m.price.perSecondByResolutionUsd != null)
  assert.ok(withByRes !== undefined)
  const res = Object.keys(withByRes.price.perSecondByResolutionUsd as Record<string, number>)[0]
  assert.ok(res !== undefined)
  assert.equal(perSecondUsd(withByRes, res), (withByRes.price.perSecondByResolutionUsd as Record<string, number>)[res])
  const image = table.models.find((m) => m.kind === 'image')
  assert.ok(image !== undefined)
  assert.equal(perSecondUsd(image), null)
})

test('the models the spike is about are the ones the table says take a motion reference', () => {
  const motion = loadTable().models.filter((m) => m.capabilities?.motionReference === true).map((m) => m.id)
  assert.ok(motion.length > 0, 'no model in the table takes a motion reference — the spike has nothing to run on')
  assert.ok(byId(loadTable(), motion[0] as string) !== undefined)
})
