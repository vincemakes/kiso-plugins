/**
 * `film.config.json` — the project's choices, in the project's own folder.
 *
 * WHY A FILE AND NOT FLAGS. The host draws no model picker by design: the
 * project names its models once and every run uses them. A flag would put the
 * choice in whichever command line happened to be typed, and two shots would
 * come out of two different models without anyone deciding that.
 *
 * NO KEY EVER LIVES HERE. A key in a config file is a key in a folder people
 * copy, sync and attach to issues. Keys arrive in the environment, from the
 * host's keychain, and this file refuses to write one.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { byId, loadTable, type Table } from './models.js'

export const CONFIG_FILE = 'film.config.json'

export interface FilmConfig {
  readonly imageModel: string
  readonly videoModel: string
  readonly resolution: string
  readonly aspectRatio: string
  readonly budgetUsd: number | null
}

export const DEFAULT_CONFIG: FilmConfig = {
  imageModel: 'flux-dev',
  videoModel: 'seedance-2-5',
  resolution: '720p',
  aspectRatio: '9:16',
  budgetUsd: null
}

/** Anything shaped like a secret, by name. A config file is not the place. */
const SECRET_ISH = /(key|token|secret|password|credential)/i

export function configPath(dir: string): string { return join(dir, CONFIG_FILE) }

export function readConfig(dir: string): { config: FilmConfig; exists: boolean } {
  const path = configPath(dir)
  if (!existsSync(path)) return { config: DEFAULT_CONFIG, exists: false }
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'))
  } catch (err) {
    throw new Error(`${CONFIG_FILE} is not valid JSON (${err instanceof Error ? err.message : String(err)})`)
  }
  if (typeof raw !== 'object' || raw === null) throw new Error(`${CONFIG_FILE} must be a JSON object`)
  const o = raw as Record<string, unknown>
  const str = (k: keyof FilmConfig, fallback: string): string => (typeof o[k] === 'string' && (o[k] as string).trim() !== '' ? (o[k] as string) : fallback)
  return {
    exists: true,
    config: {
      imageModel: str('imageModel', DEFAULT_CONFIG.imageModel),
      videoModel: str('videoModel', DEFAULT_CONFIG.videoModel),
      resolution: str('resolution', DEFAULT_CONFIG.resolution),
      aspectRatio: str('aspectRatio', DEFAULT_CONFIG.aspectRatio),
      budgetUsd: typeof o['budgetUsd'] === 'number' ? o['budgetUsd'] : null
    }
  }
}

export interface ConfigProblem { readonly field: string; readonly message: string }

/** Every complaint at once, so a person fixes the file in one pass. */
export function checkConfig(config: FilmConfig, table: Table = loadTable()): ConfigProblem[] {
  const problems: ConfigProblem[] = []
  const video = byId(table, config.videoModel)
  const image = byId(table, config.imageModel)
  if (video === undefined) problems.push({ field: 'videoModel', message: `no model with the id "${config.videoModel}" — run \`kiso-film models\`` })
  else if (video.kind !== 'video') problems.push({ field: 'videoModel', message: `"${config.videoModel}" is an image model` })
  if (image === undefined) problems.push({ field: 'imageModel', message: `no model with the id "${config.imageModel}" — run \`kiso-film models\`` })
  else if (image.kind !== 'image') problems.push({ field: 'imageModel', message: `"${config.imageModel}" is a video model` })
  if (video !== undefined && video.resolutions !== undefined && video.resolutions.length > 0 && !video.resolutions.includes(config.resolution)) {
    problems.push({ field: 'resolution', message: `${video.label} does not offer ${config.resolution} — it offers ${video.resolutions.join(', ')}` })
  }
  if (video !== undefined && video.aspectRatios !== undefined && video.aspectRatios.length > 0 && !video.aspectRatios.includes(config.aspectRatio)) {
    problems.push({ field: 'aspectRatio', message: `${video.label} does not offer ${config.aspectRatio} — it offers ${video.aspectRatios.join(', ')}` })
  }
  if (config.budgetUsd !== null && !(config.budgetUsd > 0)) problems.push({ field: 'budgetUsd', message: 'a budget is a positive number of dollars, or null for none' })
  return problems
}

export function writeConfig(dir: string, config: FilmConfig): void {
  for (const key of Object.keys(config)) {
    if (SECRET_ISH.test(key)) throw new Error(`"${key}" looks like a credential, and ${CONFIG_FILE} never holds one — keys reach this tool through the environment`)
  }
  writeFileSync(configPath(dir), `${JSON.stringify(config, null, 2)}\n`)
}

/** `key=value` pairs from the command line, applied over what is there. */
export function applySets(config: FilmConfig, sets: readonly string[]): { config: FilmConfig; problems: ConfigProblem[] } {
  const problems: ConfigProblem[] = []
  const next: Record<string, unknown> = { ...config }
  for (const pair of sets) {
    const at = pair.indexOf('=')
    if (at <= 0) { problems.push({ field: pair, message: 'expected field=value' }); continue }
    const field = pair.slice(0, at).trim()
    const value = pair.slice(at + 1).trim()
    if (SECRET_ISH.test(field)) { problems.push({ field, message: `looks like a credential, and ${CONFIG_FILE} never holds one — keys reach this tool through the environment` }); continue }
    if (!(field in config)) { problems.push({ field, message: `is not a field of ${CONFIG_FILE} — ${Object.keys(config).join(', ')}` }); continue }
    if (field === 'budgetUsd') {
      if (value === '' || value === 'null') { next[field] = null; continue }
      const n = Number(value)
      if (!Number.isFinite(n)) { problems.push({ field, message: `"${value}" is not a number` }); continue }
      next[field] = n
      continue
    }
    next[field] = value
  }
  return { config: next as unknown as FilmConfig, problems }
}
