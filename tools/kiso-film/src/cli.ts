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
import { concatListFile, ffmpegArgs, hasFades, missingInputs, parseCut } from './compose.js'
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

  kiso-film image | video
      Not built yet — they arrive with the provider clients.

Every price in the table is UNVERIFIED: carried as data, and not yet checked
against a provider's own documentation or a real call. Anything that prints a
price says so.

No command here sends anything anywhere. Keys are read from the environment
and never written to a file; nothing in this half of the tool reads one.

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

  const durations = cut.clips.map(() => 0)
  const args = hasFades(cut) ? ffmpegArgs(cut, out, durations, baseDir) : null
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
      case 'image':
      case 'video':
        die(4, `\`kiso-film ${command}\` is not built yet — it arrives with the provider clients. Nothing was sent anywhere.`)
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
