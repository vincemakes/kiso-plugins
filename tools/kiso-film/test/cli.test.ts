import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { formatRateUsd, formatUsd } from '../src/estimate.js'
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

test('image and video refuse a model that cannot do what was asked, BEFORE sending', () => {
  const veo = run(['video', '--prompt', 'x', '--out', '/tmp/no.mp4', '--duration', '5', '--model', 'veo-3-1', '--motion-ref', '/etc/hosts'])
  assert.equal(veo.status, 1)
  assert.match(veo.stderr, /does not take a motion reference/)
  assert.match(veo.stderr, /Nothing was sent/)
})

test('a missing key is exit 2, the variable NAME, and nothing else on the line', () => {
  const r = run(['video', '--prompt', 'x', '--out', '/tmp/no.mp4', '--duration', '5', '--model', 'seedance-2-5'], { FAL_KEY: '' })
  assert.equal(r.status, 2)
  assert.equal(r.stderr.trim().split('\n').pop(), 'FAL_KEY')
  // AND THE UNVERIFIED-ROUTE LINE IS ON THE SEND PATH, not only in --dry-run.
  //
  // This is the line the owner reads the first time they spend money through
  // this tool, which is the whole reason it exists. It was written, it worked,
  // and only its dry-run form was asserted — so it could have vanished and
  // this test would still have passed, because the assertion above reads the
  // LAST line of stderr and the warning is not the last line.
  assert.match(r.stderr, /route to .* is unverified/)
})

test('--dry-run shows the body that WOULD be sent, names the route unverified, and sends nothing', () => {
  const r = run(['video', '--prompt', 'a slow push in', '--out', '/tmp/no.mp4', '--duration', '5', '--model', 'seedance-2-5', '--dry-run'], { FAL_KEY: '' })
  assert.equal(r.status, 0)
  assert.match(r.stdout, /route unverified/)
  assert.match(r.stdout, /nothing was sent/)
  const body = JSON.parse(r.stdout.slice(r.stdout.indexOf('{'), r.stdout.lastIndexOf('}') + 1)) as Record<string, unknown>
  assert.equal(body['prompt'], 'a slow push in')
})

test('a reference file that is not there is caught before anything is sent', () => {
  const r = run(['video', '--prompt', 'x', '--out', '/tmp/no.mp4', '--duration', '5', '--model', 'seedance-2-5', '--ref', '/nowhere/at/all.png'])
  assert.equal(r.status, 1)
  assert.match(r.stderr, /is not there/)
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
  const commands: string[][] = [
    ['models'], ['models', '--json'], ['config'], ['--help'],
    // The two that read a key. A dry run reads it and sends nothing, which is
    // exactly the path where a debug print would sit.
    ['video', '--prompt', 'x', '--out', '/tmp/no.mp4', '--duration', '5', '--model', 'seedance-2-5', '--dry-run'],
    ['image', '--prompt', 'x', '--out', '/tmp/no.png', '--model', 'flux-dev', '--dry-run'],
    // The provider the first real call goes through, on both paths.
    ['image', '--prompt', 'x', '--out', '/tmp/no.png', '--model', 'gpt-image-2', '--dry-run'],
    ['image', '--prompt', 'x', '--out', '/tmp/no.png', '--model', 'gpt-image-2'],
    // And the two failure paths, because an error message is where a value
    // most often escapes.
    ['video', '--prompt', 'x', '--out', '/tmp/no.mp4', '--duration', '99999', '--model', 'seedance-2-5'],
    ['video', '--prompt', 'x', '--out', '/tmp/no.mp4', '--duration', '5', '--model', 'nope']
  ]
  for (const args of commands) {
    const r = run(args, { FAL_KEY: canary, BYTEPLUS_API_KEY: canary, APIMART_API_KEY: canary })
    assert.doesNotMatch(r.stdout, new RegExp(canary), `${args.join(' ')} printed the key to stdout`)
    assert.doesNotMatch(r.stderr, new RegExp(canary), `${args.join(' ')} printed the key to stderr`)
  }
})

test('the model the first real call uses is priced, and still unverified', () => {
  const r = run(['models', '--json', '--kind', 'image'])
  const parsed = JSON.parse(r.stdout) as { models: Array<{ id: string; verified: boolean; provider: string; price: Record<string, unknown> }> }
  const m = parsed.models.find((x) => x.id === 'gpt-image-2')
  assert.ok(m !== undefined, 'gpt-image-2 is not in the table')
  assert.equal(m.provider, 'apimart')
  // The PRICE was read against the provider's own published figure, so the
  // budget stop can be computed. The ENTRY is still unverified, because a
  // price is one field: no source was found for this model's capabilities,
  // resolutions or aspect ratios, and the route it is reached by has never
  // been called. Reading one field is not reading the entry.
  assert.equal(m.price['perImageUsd'], 0.0085)
  assert.equal(m.verified, false)
})

test('a shot list priced with it produces a total rather than "not priced"', () => {
  // This is what F-10 was about: the product's plan is that the graph is
  // priced before a byte is generated and the first ask is the budget. With
  // an empty price that ask could not be computed at all.
  const dir = mkdtempSync(join(tmpdir(), 'kiso-film-f10-'))
  try {
    writeFileSync(join(dir, 'shots.json'), JSON.stringify([{ id: '1-01', duration_s: 3 }]))
    writeFileSync(join(dir, 'film.config.json'), JSON.stringify({ imageModel: 'gpt-image-2', videoModel: 'seedance-2-5', resolution: '720p', aspectRatio: '9:16', budgetUsd: null }))
    const r = run(['estimate', join(dir, 'shots.json'), '--dir', dir, '--json'])
    assert.equal(r.status, 0)
    const parsed = JSON.parse(r.stdout) as { totalUsd: number | null; unpricedCount: number; lines: Array<{ what: string; usd: number | null }> }
    assert.ok(parsed.totalUsd !== null, 'the total is still not priced')
    assert.equal(parsed.unpricedCount, 0)
    assert.equal(parsed.lines.find((l) => l.what === 'first frames')?.usd, 0.0085)
  } finally { rmSync(dir, { recursive: true, force: true }) }
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

/* ── the two things a person meets in the first minute ──────────────────── */

test('TWO DIFFERENT PRICES NEVER PRINT THE SAME', () => {
  // Not "three print distinct" — every price in the table, because the rule is
  // about the column and not about today's rows. Two decimals merged 0.0085
  // with 0.01 and rounded 0.025 up to 0.03, on the page a person chooses a
  // model from.
  //
  // READ OFF THE PRINTED PAGE, not off the formatter. A first draft of this
  // called `formatRateUsd` itself and compared its answers — which passed
  // happily with the CLI's column reverted to two decimals, because it was
  // testing the helper and not the thing a person reads. It is the column
  // that has the property.
  const byId = new Map<string, number>()
  for (const m of (JSON.parse(run(['models', '--json']).stdout) as { models: Array<{ id: string; kind: string; price: { perImageUsd?: number; perSecondUsd?: number | null } }> }).models) {
    const n = m.kind === 'image' ? m.price.perImageUsd : (m.price.perSecondUsd ?? undefined)
    if (typeof n === 'number') byId.set(m.id, n)
  }
  const printed = new Map<string, { id: string; price: number }>()
  for (const line of run(['models']).stdout.split('\n')) {
    const id = (/^\S{2}\s+(\S+)/.exec(line) ?? [])[1]
    const shown = (/\$[0-9.]+\/(?:image|s)/.exec(line) ?? [])[0]
    if (id === undefined || shown === undefined) continue
    const price = byId.get(id)
    if (price === undefined) continue
    const seen = printed.get(shown)
    assert.ok(seen === undefined || seen.price === price,
      `the column prints ${shown} for ${seen?.id} at ${seen?.price} and for ${id} at ${price} — two prices merged`)
    printed.set(shown, { id, price })
  }
  assert.ok(printed.size > 3, `only ${printed.size} prices were read off the page`)
})

test('a rate prints the figure the table carries, not a rounding of it', () => {
  assert.equal(formatRateUsd(0.0085), '$0.0085')
  assert.equal(formatRateUsd(0.01), '$0.01')
  assert.equal(formatRateUsd(0.025), '$0.025')
  assert.equal(formatRateUsd(0.4730), '$0.473')
  assert.equal(formatRateUsd(3), '$3.00')
  // A total is still two decimals: it is money someone approves, not a figure
  // they compare.
  assert.equal(formatUsd(3.333), '$3.33')
})

test('the three cheapest image models are told apart on the page a person picks from', () => {
  const rows = run(['models', '--kind', 'image']).stdout.split('\n').filter((l) => /\/image/.test(l))
  const prices = rows.map((l) => (/\$[0-9.]+\/image/.exec(l) ?? [''])[0])
  assert.ok(prices.includes('$0.0085/image'), prices.join(' '))
  assert.ok(prices.includes('$0.01/image'), prices.join(' '))
  assert.ok(prices.includes('$0.025/image'), prices.join(' '))
})

test('A CLOSED PIPE IS NOT AN ERROR — `models | head` prints rows and nothing after', () => {
  // `head` closes the pipe once it has its lines; every later write fails with
  // EPIPE, and an unhandled stream error becomes an uncaught exception. The
  // rows a person asked for were followed by a stack trace, on the command
  // they would run first.
  const r = spawnSync('sh', ['-c', `${JSON.stringify(process.execPath)} ${JSON.stringify(CLI)} models | head -4`], { encoding: 'utf8' })
  assert.equal(r.status, 0)
  assert.doesNotMatch(r.stdout, /EPIPE|throw er|Node\.js v/)
  assert.doesNotMatch(r.stderr, /EPIPE|throw er|Node\.js v/)
  assert.match(r.stdout, /models/)
  assert.ok(r.stdout.split('\n').length <= 6, `head asked for 4 lines and got ${r.stdout.split('\n').length}`)
})

test('and a closed pipe on the estimate path is the same', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kiso-film-pipe-'))
  try {
    writeFileSync(join(dir, 'shots.json'), JSON.stringify([{ id: '1-01', duration_s: 3 }]))
    const r = spawnSync('sh', ['-c', `${JSON.stringify(process.execPath)} ${JSON.stringify(CLI)} estimate ${JSON.stringify(join(dir, 'shots.json'))} --dir ${JSON.stringify(dir)} | head -2`], { encoding: 'utf8' })
    assert.equal(r.status, 0)
    assert.doesNotMatch(r.stdout + r.stderr, /EPIPE|throw er/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
