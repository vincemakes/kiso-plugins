import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CONFIG_FILE, DEFAULT_CONFIG, applySets, checkConfig, readConfig, writeConfig } from '../src/config.js'
import { loadTable } from '../src/models.js'

const work = (): string => mkdtempSync(join(tmpdir(), 'kiso-film-config-'))

test('a project with no config reads the defaults and says it is not there', () => {
  const dir = work()
  try {
    const { config, exists } = readConfig(dir)
    assert.equal(exists, false)
    assert.deepEqual(config, DEFAULT_CONFIG)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('the defaults name models that are actually in the table', () => {
  assert.deepEqual(checkConfig(DEFAULT_CONFIG, loadTable()), [])
})

test('a field that is not a field is refused, and the message lists the ones that are', () => {
  const { problems } = applySets(DEFAULT_CONFIG, ['videoModl=seedance-2-5'])
  assert.equal(problems.length, 1)
  assert.match(problems[0]?.message ?? '', /is not a field/)
  assert.match(problems[0]?.message ?? '', /videoModel/)
})

test('anything shaped like a credential is refused, by name, on the way in AND on the way out', () => {
  // A key in a config file is a key in a folder people copy, sync and paste
  // into issues. Both doors are shut, because only shutting one is a door.
  const { problems } = applySets(DEFAULT_CONFIG, ['falKey=secret-value'])
  assert.equal(problems.length, 1)
  assert.match(problems[0]?.message ?? '', /credential/)
  const dir = work()
  try {
    assert.throws(() => writeConfig(dir, { ...DEFAULT_CONFIG, apiToken: 'x' } as never), /credential/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('a written config round-trips and holds no key', () => {
  const dir = work()
  try {
    const { config } = applySets(DEFAULT_CONFIG, ['resolution=480p', 'budgetUsd=25'])
    writeConfig(dir, config)
    const text = readFileSync(join(dir, CONFIG_FILE), 'utf8')
    assert.doesNotMatch(text, /key|token|secret|password/i)
    const back = readConfig(dir)
    assert.equal(back.exists, true)
    assert.equal(back.config.resolution, '480p')
    assert.equal(back.config.budgetUsd, 25)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('a budget is a positive number or nothing', () => {
  assert.equal(applySets(DEFAULT_CONFIG, ['budgetUsd=null']).config.budgetUsd, null)
  assert.match(applySets(DEFAULT_CONFIG, ['budgetUsd=lots']).problems[0]?.message ?? '', /not a number/)
  assert.match(checkConfig({ ...DEFAULT_CONFIG, budgetUsd: -3 }).map((p) => p.message).join(' '), /positive/)
})

test('a resolution the chosen model does not offer is named with the ones it does', () => {
  const problems = checkConfig({ ...DEFAULT_CONFIG, resolution: '4k' })
  assert.equal(problems.length, 1)
  assert.equal(problems[0]?.field, 'resolution')
  assert.match(problems[0]?.message ?? '', /it offers/)
})

test('an image model in the video slot is caught as the wrong kind, not as missing', () => {
  const problems = checkConfig({ ...DEFAULT_CONFIG, videoModel: 'flux-dev' })
  assert.ok(problems.some((p) => p.field === 'videoModel' && /is an image model/.test(p.message)))
})

test('a config file that is not JSON says so and names the file', () => {
  const dir = work()
  try {
    writeFileSync(join(dir, CONFIG_FILE), '{ nope')
    assert.throws(() => readConfig(dir), new RegExp(CONFIG_FILE))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
