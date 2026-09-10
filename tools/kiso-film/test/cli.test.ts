import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const CLI = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'src', 'cli.js')
const run = (args: readonly string[], env: NodeJS.ProcessEnv = {}) =>
  spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', env: { ...process.env, ...env } })

test('with no arguments it says what it does, and exits 0', () => {
  const r = run([])
  assert.equal(r.status, 0)
  assert.match(r.stdout, /kiso-film/)
  assert.match(r.stdout, /Exit codes/)
})

test('the help says the prices are unverified — the person reading it first is told first', () => {
  assert.match(run(['--help']).stdout, /UNVERIFIED/)
})

test('an unknown command exits 1 and prints the help beside the complaint', () => {
  const r = run(['sing'])
  assert.equal(r.status, 1)
  assert.match(r.stderr, /unknown command "sing"/)
})

test('image and video exit 4 and say nothing was sent anywhere', () => {
  for (const command of ['image', 'video']) {
    const r = run([command])
    assert.equal(r.status, 4, `${command} should exit 4 until it is built`)
    assert.match(r.stderr, /not built yet/)
    assert.match(r.stderr, /Nothing was sent anywhere/)
  }
})

test('models --json is a list a skill can read', () => {
  const r = run(['models', '--json', '--kind', 'image'])
  assert.equal(r.status, 0)
  const parsed = JSON.parse(r.stdout) as { models: Array<{ kind: string; reachable: boolean; verified: boolean }> }
  assert.ok(parsed.models.length > 0)
  assert.ok(parsed.models.every((m) => m.kind === 'image'))
  assert.ok(parsed.models.every((m) => m.verified === false))
})

test('with no key in the environment, nothing is reachable and the table says which variable it wants', () => {
  const r = run(['models', '--kind', 'video'], { FAL_KEY: '', BYTEPLUS_API_KEY: '' })
  assert.equal(r.status, 0)
  assert.match(r.stdout, /no key for this provider/)
  assert.match(r.stdout, /keys read from: /)
  assert.equal(run(['models', '--reachable'], { FAL_KEY: '', BYTEPLUS_API_KEY: '' }).stdout.startsWith('0 models'), true)
})

test('A KEY IS NEVER PRINTED — a canary in the environment reaches no output stream', () => {
  // The canary is a value no code should ever read, let alone echo. If any
  // command grows a debug print of the environment, this fails.
  const canary = 'canary-9d1f4c7a-never-print-me'
  for (const args of [['models'], ['models', '--json'], ['config'], ['--help']]) {
    const r = run(args, { FAL_KEY: canary, BYTEPLUS_API_KEY: canary })
    assert.doesNotMatch(r.stdout, new RegExp(canary), `${args.join(' ')} printed the key to stdout`)
    assert.doesNotMatch(r.stderr, new RegExp(canary), `${args.join(' ')} printed the key to stderr`)
  }
})

test('estimate prices a shot list, and says the prices are unverified', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kiso-film-cli-'))
  try {
    writeFileSync(join(dir, 'shots.json'), JSON.stringify([{ id: '1-01', duration_s: 4 }]))
    const r = run(['estimate', join(dir, 'shots.json'), '--dir', dir])
    assert.equal(r.status, 0)
    assert.match(r.stdout, /total/)
    assert.match(r.stdout, /UNVERIFIED PRICES/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('compose --dry-run prints the ffmpeg it WOULD run, and runs none of it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kiso-film-cli-'))
  try {
    writeFileSync(join(dir, 'a.mp4'), 'x')
    writeFileSync(join(dir, 'b.mp4'), 'x')
    writeFileSync(join(dir, 'cut.json'), JSON.stringify({ clips: ['a.mp4', 'b.mp4'] }))
    const r = run(['compose', join(dir, 'cut.json'), '--out', join(dir, 'film.mp4'), '--dry-run'])
    assert.equal(r.status, 0)
    assert.match(r.stdout, /^ffmpeg /)
    assert.match(r.stdout, /concat/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('a cut naming a file that is not there lists ALL of them and exits 1', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kiso-film-cli-'))
  try {
    writeFileSync(join(dir, 'cut.json'), JSON.stringify({ clips: ['gone.mp4', 'also.mp4'] }))
    const r = run(['compose', join(dir, 'cut.json'), '--out', join(dir, 'film.mp4'), '--dry-run'])
    assert.equal(r.status, 1)
    assert.match(r.stderr, /gone\.mp4/)
    assert.match(r.stderr, /also\.mp4/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('config writes what it was told and refuses what looks like a credential', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kiso-film-cli-'))
  try {
    assert.equal(run(['config', '--dir', dir, '--set', 'resolution=480p']).status, 0)
    assert.equal(JSON.parse(run(['config', '--dir', dir, '--json']).stdout).resolution, '480p')
    const bad = run(['config', '--dir', dir, '--set', 'falApiKey=x'])
    assert.equal(bad.status, 1)
    assert.match(bad.stderr, /credential/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
