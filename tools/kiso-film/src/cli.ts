#!/usr/bin/env node
/**
 * kiso-film — the command-line tool the kiso-film plugin declares.
 *
 * THIS HALF MAKES NO NETWORK CALL. `models`, `config`, `estimate` and
 * `compose` read files, read the table, and run ffmpeg. `image` and `video`
 * arrive with the provider clients and are named here as not-yet-built rather
 * than left to fail as unknown commands — a person who reads the plugin's
 * README and types the command should be told which it is.
 *
 * EXIT CODES, because a skill reads them:
 *   0  it worked
 *   1  the input was wrong — a bad file, an unknown model, a missing clip
 *   2  a required environment variable is not set
 *   3  a declared command is not on this machine (ffmpeg)
 *   4  the command is not built yet
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { loadTable, isReachable, perSecondUsd, PROVIDER_KEY_ENV, TableError, type Model } from './models.js'
import { CONFIG_FILE, applySets, checkConfig, readConfig, writeConfig } from './config.js'
import { estimate, formatUsd, readShots } from './estimate.js'
import { concatListFile, ffmpegArgs, ffprobePresent, hasFades, hasTrims, missingInputs, parseCut, probeDurations } from './compose.js'
import { loadProviders, routeFor } from './providers.js'
import { finalBody, MissingKeyError, runJob } from './generate.js'
import { buildInput, checkSupported, UnsupportedError } from './request.js'
import { readFileSync } from 'node:fs'

const HELP = `kiso-film — the tool behind the kiso-film plugin

  kiso-film models [--json] [--kind video|image] [--reachable]
      What the table knows, and which models a key is present for.

  kiso-film config [--dir <path>] [--set field=value ...] [--json]
      Read or write the project's ${CONFIG_FILE}.

  kiso-film estimate <shots.json> [--dir <path>] [--json]
      Price a shot list from the table, before anything is spent.

  kiso-film compose <cut.json> --out <film.mp4> [--dry-run]
      Join the clips a cut names, with fades, under one audio track.

  kiso-film image  --prompt <text> --out <file.png> [--ref <file> ...]
                   [--model <id>] [--aspect <ratio>]
  kiso-film video  --prompt <text> --out <file.mp4> --duration <seconds>
                   [--start <file>] [--end <file>] [--ref <file> ...]
                   [--motion-ref <file>] [--model <id>] [--resolution <r>]
      Generate, and write the file. Refused before anything is sent when the
      table says the model does not take what was asked for.

Every price in the table is UNVERIFIED: carried as data, and not yet checked
against a provider's own documentation or a real call. Anything that prints a
price says so.

image and video are the only commands that send anything. Keys are read from
the environment by the names "kiso-film models" prints, put in a header and
nowhere else, and never written to a file, printed or logged.

The provider ROUTES are unverified too — where a job is submitted, what its
states are called, where the finished file's URL sits. They are data, in
data/providers.json, so a wrong one is an edit rather than a release.

Exit codes: 0 worked · 1 bad input · 2 missing environment variable
            3 a declared command is missing · 4 not built yet`

function die(code: number, message: string): never {
  process.stderr.write(`${message}\n`)
  process.exit(code)
}

function flag(argv: readonly string[], name: string): boolean { return argv.includes(`--${name}`) }
function value(argv: readonly string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : undefined
}
function values(argv: readonly string[], name: string): string[] {
  const out: string[] = []
  argv.forEach((a, i) => { if (a === `--${name}` && argv[i + 1] !== undefined) out.push(argv[i + 1] as string) })
  return out
}

/** One line per model, in a fixed width so a person can scan the columns. */
function modelLine(m: Model, reachable: boolean): string {
  const mark = m.verified ? ' ' : '?'
  const reach = reachable ? ' ' : '·'
  const price = m.kind === 'image'
    ? (typeof m.price.perImageUsd === 'number' ? `${formatUsd(m.price.perImageUsd)}/image` : 'no price')
    : (() => { const p = perSecondUsd(m); return p === null ? 'no price' : `${formatUsd(p)}/s` })()
  const caps: string[] = []
  const c = m.capabilities
  if (c !== undefined) {
    if (c.startImage) caps.push('start')
    if (c.endImage) caps.push('end')
    if (c.maxReferenceImages > 0) caps.push(`refs×${c.maxReferenceImages}`)
    if (c.motionReference) caps.push('motion-ref')
    if (c.nativeAudio) caps.push('audio')
    if (c.lipSync) caps.push('lip-sync')
  }
  return `${mark}${reach} ${m.id.padEnd(20)} ${m.provider.padEnd(9)} ${price.padEnd(13)} ${caps.join(' ')}`
}

function cmdModels(argv: readonly string[]): void {
  const table = loadTable()
  const kind = value(argv, 'kind')
  let models = table.models.filter((m) => kind === undefined || m.kind === kind)
  if (flag(argv, 'reachable')) models = models.filter((m) => isReachable(m))
  if (flag(argv, 'json')) {
    process.stdout.write(`${JSON.stringify({ models: models.map((m) => ({ ...m, reachable: isReachable(m) })) }, null, 2)}\n`)
    return
  }
  const unverified = models.filter((m) => !m.verified).length
  process.stdout.write(`${models.length} model${models.length === 1 ? '' : 's'}\n\n`)
  for (const m of models) process.stdout.write(`${modelLine(m, isReachable(m))}\n`)
  process.stdout.write('\n')
  process.stdout.write('? = unverified: carried as data, not checked against the provider\n')
  process.stdout.write('· = no key for this provider in the environment\n')
  const names = [...new Set(models.map((m) => PROVIDER_KEY_ENV[m.provider]).filter((x): x is string => x !== undefined))]
  if (names.length > 0) process.stdout.write(`keys read from: ${names.join(', ')}\n`)
  // The ROUTE is unverified as well as the price, and for the same reason:
  // nobody has watched it work. Said here because this is the page a person
  // reads before choosing a model.
  const routes = loadProviders().providers.filter((r) => models.some((m) => m.provider === r.id))
  const unverifiedRoutes = routes.filter((r) => !r.verified).map((r) => r.label)
  if (unverifiedRoutes.length > 0) process.stdout.write(`route unverified: ${unverifiedRoutes.join(', ')} — how a job is submitted and polled is data in data/providers.json, not yet checked against a real call\n`)
  if (unverified > 0) process.stdout.write(`${unverified} of ${models.length} unverified — every price below is a figure to check, not a quote\n`)
}

function cmdConfig(argv: readonly string[]): void {
  const dir = resolve(value(argv, 'dir') ?? '.')
  const sets = values(argv, 'set')
  const table = loadTable()
  let { config, exists } = readConfig(dir)
  if (sets.length > 0) {
    const applied = applySets(config, sets)
    if (applied.problems.length > 0) {
      for (const p of applied.problems) process.stderr.write(`  ${p.field} ${p.message}\n`)
      die(1, `${CONFIG_FILE} not written`)
    }
    config = applied.config
    const problems = checkConfig(config, table)
    if (problems.length > 0) {
      for (const p of problems) process.stderr.write(`  ${p.field}: ${p.message}\n`)
      die(1, `${CONFIG_FILE} not written`)
    }
    writeConfig(dir, config)
    exists = true
  }
  if (flag(argv, 'json')) { process.stdout.write(`${JSON.stringify(config, null, 2)}\n`); return }
  process.stdout.write(`${join(dir, CONFIG_FILE)}${exists ? '' : ' (not there — these are the defaults)'}\n\n`)
  for (const [k, v] of Object.entries(config)) process.stdout.write(`  ${k.padEnd(14)} ${v === null ? '(none)' : String(v)}\n`)
  const problems = checkConfig(config, table)
  if (problems.length > 0) {
    process.stdout.write('\n')
    for (const p of problems) process.stdout.write(`  ${p.field}: ${p.message}\n`)
    process.exitCode = 1
  }
}

function cmdEstimate(argv: readonly string[], shotsPath: string | undefined): void {
  if (shotsPath === undefined) die(1, 'estimate needs a shot list: kiso-film estimate shots.json')
  if (!existsSync(shotsPath)) die(1, `${shotsPath} is not there`)
  const dir = resolve(value(argv, 'dir') ?? '.')
  const table = loadTable()
  const { config } = readConfig(dir)
  const { shots, skipped } = readShots(shotsPath)
  if (shots.length === 0) die(1, `${shotsPath} has no shot with a usable duration_s`)
  const result = estimate(table, {
    shots,
    videoModelId: config.videoModel,
    imageModelId: config.imageModel,
    resolution: config.resolution,
    budgetUsd: config.budgetUsd
  })
  if (flag(argv, 'json')) { process.stdout.write(`${JSON.stringify({ ...result, skipped }, null, 2)}\n`); return }
  for (const line of result.lines) {
    const price = line.usd === null ? 'not priced' : formatUsd(line.usd)
    const secs = line.seconds > 0 ? `, ${line.seconds}s` : ''
    process.stdout.write(`  ${line.what.padEnd(13)} ${String(line.count).padStart(3)}${secs.padEnd(9)} ${price.padStart(9)}  ${line.model}${line.verified ? '' : ' (unverified)'}\n`)
  }
  process.stdout.write('\n')
  process.stdout.write(result.totalUsd === null
    ? `  total        not priced — ${result.unpricedCount} item${result.unpricedCount === 1 ? '' : 's'} the table has no price for\n`
    : `  total        ${formatUsd(result.totalUsd).padStart(9)}\n`)
  if (result.anyUnverified) process.stdout.write('\nUNVERIFIED PRICES. Every figure above comes from a table that has not been\nchecked against the provider\'s own documentation or a real call. Treat the\ntotal as an order of magnitude, not a quote.\n')
  for (const note of result.notes) process.stdout.write(`\n${note}\n`)
  for (const s of skipped) process.stdout.write(`skipped: ${s}\n`)
  if (result.overBudget) { process.stdout.write(`\nover the budget in ${CONFIG_FILE}\n`); process.exitCode = 1 }
}

/**
 * `image` and `video` — the only two commands that send anything.
 *
 * The order is deliberate and every step before the send is free: read the
 * config, find the model, CHECK THE CAPABILITIES, find the route, read the
 * key. A command line that asks a model for something it cannot do is refused
 * before a byte leaves, with the reason and with the models that could.
 */
async function cmdGenerate(argv: readonly string[], kind: 'image' | 'video'): Promise<void> {
  const prompt = value(argv, 'prompt')
  const out = value(argv, 'out')
  if (prompt === undefined || prompt.trim() === '') die(1, `${kind} needs --prompt "<text>"`)
  if (out === undefined) die(1, `${kind} needs --out <file>`)
  const dir = resolve(value(argv, 'dir') ?? '.')
  const table = loadTable()
  const { config } = readConfig(dir)
  const modelId = value(argv, 'model') ?? (kind === 'image' ? config.imageModel : config.videoModel)
  const model = table.models.find((m) => m.id === modelId)
  if (model === undefined) die(1, `no model with the id "${modelId}" — run \`kiso-film models\``)
  if (model.kind !== kind) die(1, `"${modelId}" is ${model.kind === 'image' ? 'an image' : 'a video'} model, and this is \`kiso-film ${kind}\``)

  const durationRaw = value(argv, 'duration')
  const duration = durationRaw === undefined ? undefined : Number(durationRaw)
  if (kind === 'video' && (duration === undefined || !Number.isFinite(duration))) die(1, 'video needs --duration <seconds>')

  const input = {
    prompt,
    ...(values(argv, 'ref').length > 0 ? { references: values(argv, 'ref') } : {}),
    ...(value(argv, 'start') === undefined ? {} : { startImage: value(argv, 'start') as string }),
    ...(value(argv, 'end') === undefined ? {} : { endImage: value(argv, 'end') as string }),
    ...(value(argv, 'motion-ref') === undefined ? {} : { motionReference: value(argv, 'motion-ref') as string }),
    ...(duration === undefined ? {} : { durationSeconds: duration }),
    ...(kind === 'video' ? { resolution: value(argv, 'resolution') ?? config.resolution } : {}),
    aspectRatio: value(argv, 'aspect') ?? config.aspectRatio
  }

  const unsupported = checkSupported(model, input, table)
  if (unsupported.length > 0) {
    for (const u of unsupported) process.stderr.write(`  ${u}\n`)
    die(1, `${model.label} was asked for something it does not do. Nothing was sent.`)
  }
  for (const local of [...(input.references ?? []), input.startImage, input.endImage, input.motionReference]) {
    if (local !== undefined && !/^https?:\/\//.test(local) && !existsSync(local)) die(1, `${local} is not there`)
  }

  const providers = loadProviders()
  const route = routeFor(providers, model.provider)
  if (route === undefined) die(1, `the table says ${model.label} is served by "${model.provider}", and data/providers.json has no route for it`)

  const body = buildInput(model, input)
  if (flag(argv, 'dry-run')) {
    process.stdout.write(`${model.label} via ${route.label}${route.verified ? '' : ' (route unverified)'}\n`)
    // The body runJob would send, not the one before the route touches it.
    process.stdout.write(`${JSON.stringify(finalBody(route, model.providerModelId, body), null, 2)}\n`)
    process.stdout.write('nothing was sent\n')
    return
  }

  if (!route.verified) process.stderr.write(`the route to ${route.label} is unverified — it has not been checked against a real call. If this fails oddly, data/providers.json is the first place to look.\n`)
  try {
    const result = await runJob(providers, model.provider, {
      providerModelId: model.providerModelId,
      input: body,
      out,
      ...(value(argv, 'timeout') === undefined ? {} : { timeoutMs: Number(value(argv, 'timeout')) * 1000 }),
      onStatus: (status, elapsed) => { if (!flag(argv, 'quiet')) process.stderr.write(`  ${status} ${Math.round(elapsed / 1000)}s\n`) }
    })
    process.stdout.write(`${result.out}\n`)
  } catch (err) {
    if (err instanceof MissingKeyError) die(2, err.variable)
    if (err instanceof UnsupportedError) die(1, err.message)
    die(1, err instanceof Error ? err.message : String(err))
  }
}

function ffmpegPresent(): boolean {
  return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0
}

function cmdCompose(argv: readonly string[], cutPath: string | undefined): void {
  if (cutPath === undefined) die(1, 'compose needs a cut: kiso-film compose cut.json --out film.mp4')
  if (!existsSync(cutPath)) die(1, `${cutPath} is not there`)
  const out = value(argv, 'out')
  if (out === undefined) die(1, 'compose needs --out <film.mp4>')
  const baseDir = resolve(cutPath, '..')
  const cut = parseCut(readFileSync(cutPath, 'utf8'), cutPath)
  const missing = missingInputs(cut, baseDir)
  if (missing.length > 0) {
    for (const m of missing) process.stderr.write(`  ${m.what} ${m.message}\n`)
    die(1, `${missing.length} file${missing.length === 1 ? '' : 's'} the cut names ${missing.length === 1 ? 'is' : 'are'} not there`)
  }
  const dry = flag(argv, 'dry-run')
  if (!dry && !ffmpegPresent()) die(3, 'ffmpeg is not on this machine. Install it (on macOS: brew install ffmpeg) and run this again. Nothing was fetched.')

  // A trim needs re-encoding, so it takes the same path a fade does — the
  // stream-copy path cannot cut a frame off anything.
  const needsFilter = hasFades(cut) || hasTrims(cut)
  let durations = cut.clips.map(() => 0)
  if (needsFilter) {
    // A fade offset is arithmetic on real lengths, and a generated clip is
    // often not the length it was asked for.
    if (!ffprobePresent()) die(3, 'this cut has cross-fades or trims, and their arithmetic needs the clips\' real lengths. ffprobe is not on this machine (on macOS: brew install ffmpeg). Nothing was fetched.')
    const probed = probeDurations(cut, baseDir)
    durations = probed.durations
    for (const name of probed.unreadable) process.stderr.write(`  ${name}: ffprobe could not read a duration — treated as 0, which will put the next fade at the earliest possible offset\n`)
  }
  const args = needsFilter ? ffmpegArgs(cut, out, durations, baseDir) : null
  if (args === null) {
    const work = mkdtempSync(join(tmpdir(), 'kiso-film-'))
    const list = join(work, 'clips.txt')
    concatListFile(cut, list, baseDir)
    const concat = ['-y', '-f', 'concat', '-safe', '0', '-i', list, ...(cut.audio === undefined ? [] : ['-i', resolve(baseDir, cut.audio), '-map', '0:v', '-map', '1:a', '-shortest']), '-c:v', 'copy', out]
    if (dry) { process.stdout.write(`ffmpeg ${concat.join(' ')}\n`); rmSync(work, { recursive: true, force: true }); return }
    const r = spawnSync('ffmpeg', concat, { stdio: 'inherit' })
    rmSync(work, { recursive: true, force: true })
    if (r.status !== 0) die(1, 'ffmpeg did not finish')
    process.stdout.write(`${out}\n`)
    return
  }
  if (dry) { process.stdout.write(`ffmpeg ${args.join(' ')}\n`); return }
  const r = spawnSync('ffmpeg', args, { stdio: 'inherit' })
  if (r.status !== 0) die(1, 'ffmpeg did not finish')
  process.stdout.write(`${out}\n`)
}

function main(): void {
  const argv = process.argv.slice(2)
  const command = argv[0]
  if (command === undefined || command === '--help' || command === '-h' || command === 'help') { process.stdout.write(`${HELP}\n`); return }
  if (command === '--version' || command === '-v') { process.stdout.write('0.1.0\n'); return }
  try {
    switch (command) {
      case 'models': cmdModels(argv); return
      case 'config': cmdConfig(argv); return
      case 'estimate': cmdEstimate(argv, argv[1]); return
      case 'compose': cmdCompose(argv, argv[1]); return
      case 'image': void cmdGenerate(argv, 'image'); return
      case 'video': void cmdGenerate(argv, 'video'); return
      default:
        die(1, `unknown command "${command}"\n\n${HELP}`)
    }
  } catch (err) {
    if (err instanceof TableError) {
      for (const p of err.problems.slice(0, 10)) process.stderr.write(`  ${p.path}: ${p.message}\n`)
      die(1, err.message)
    }
    die(1, err instanceof Error ? err.message : String(err))
  }
}

main()
