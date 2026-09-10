/**
 * The model table: what this tool knows about third-party image and video
 * models, and which of them a person could reach right now.
 *
 * THE TABLE IS DATA, NOT CODE. `data/models.json` carries facts about other
 * people's products — capabilities, route parameter names, durations, prices.
 * It is validated against `data/models.schema.json` on every load, because a
 * table that is wrong in shape fails later, further away, and more confusingly
 * than a table that refuses to load.
 *
 * NOTHING HERE IS VERIFIED. Every entry carries `verified: false` until a real
 * call, or a person's reading against the provider's own documentation, says
 * otherwise. Validation proves the table is well FORMED and can say nothing at
 * all about whether a price is right or a capability flag points the correct
 * way. Every surface that shows a price says so.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { validate, unsupportedKeywords, type SchemaProblem } from './schema.js'

const HERE = fileURLToPath(new URL('.', import.meta.url))
/** `build/src` → the package root. */
const PACKAGE_ROOT = join(HERE, '..', '..')

export interface Capabilities {
  readonly startImage: boolean
  readonly endImage: boolean
  readonly maxReferenceImages: number
  readonly motionReference: boolean
  readonly audioReference?: boolean
  readonly maxAudioReferences?: number
  readonly nativeAudio: boolean
  readonly lipSync: boolean
  readonly multiSubject?: boolean
}

export interface Model {
  readonly id: string
  readonly kind: 'video' | 'image'
  readonly label: string
  readonly provider: string
  readonly providerModelId: string
  readonly available: boolean
  readonly verified: boolean
  readonly maxResolution?: string
  readonly defaultResolution?: string
  readonly resolutions?: readonly string[]
  readonly aspectRatios?: readonly string[]
  readonly capabilities?: Capabilities
  readonly duration?: { readonly minSeconds: number; readonly maxSeconds: number; readonly defaultSeconds: number; readonly choicesSeconds?: readonly number[] }
  readonly price: {
    readonly perSecondUsd?: number | null
    readonly perSecondWithAudioUsd?: number | null
    readonly perSecondByResolutionUsd?: Readonly<Record<string, number>> | null
    readonly perImageUsd?: number
  }
  readonly params?: Readonly<Record<string, string | null>>
}

export interface Table {
  readonly schemaVersion: number
  readonly models: readonly Model[]
}

/**
 * The environment variable each provider's key arrives in.
 *
 * NAMES ONLY, and no base URLs — this half of the tool makes no call, and a
 * base URL sitting here would be the first thing a reader took for one. The
 * plugin declares these names as `secrets`; the host injects the value into
 * this process's environment and nowhere else.
 */
export const PROVIDER_KEY_ENV: Readonly<Record<string, string>> = {
  fal: 'FAL_KEY',
  byteplus: 'BYTEPLUS_API_KEY'
}

export class TableError extends Error {
  constructor(message: string, readonly problems: readonly SchemaProblem[] = []) { super(message) }
}

let cached: Table | null = null

/** Read, validate and return the table. Throws `TableError` with every
 *  problem rather than the first, because a table that is wrong is usually
 *  wrong in one way in several places. */
export function loadTable(root: string = PACKAGE_ROOT): Table {
  if (cached !== null && root === PACKAGE_ROOT) return cached
  let raw: unknown
  let schema: unknown
  try {
    raw = JSON.parse(readFileSync(join(root, 'data', 'models.json'), 'utf8'))
    schema = JSON.parse(readFileSync(join(root, 'data', 'models.schema.json'), 'utf8'))
  } catch (err) {
    throw new TableError(`the model table could not be read: ${err instanceof Error ? err.message : String(err)}`)
  }
  const problems = validate(schema as Record<string, unknown>, raw)
  if (problems.length > 0) throw new TableError(`the model table does not match its schema (${problems.length} problem${problems.length === 1 ? '' : 's'})`, problems)
  const table = raw as Table
  const ids = new Set<string>()
  for (const m of table.models) {
    if (ids.has(m.id)) throw new TableError(`two models share the id "${m.id}"`)
    ids.add(m.id)
  }
  if (root === PACKAGE_ROOT) cached = table
  return table
}

/** Which keyword the schema uses that the checker does not act on. Empty is
 *  the answer that means the schema is fully enforced. */
export function schemaGaps(root: string = PACKAGE_ROOT): string[] {
  const schema = JSON.parse(readFileSync(join(root, 'data', 'models.schema.json'), 'utf8')) as Record<string, unknown>
  return unsupportedKeywords(schema)
}

export function byId(table: Table, id: string): Model | undefined {
  return table.models.find((m) => m.id === id)
}

/** A model is reachable when its provider's key is in this process's
 *  environment. Reachable is not the same as working: this says a key is
 *  present, never that it is valid. */
export function isReachable(model: Model, env: NodeJS.ProcessEnv = process.env): boolean {
  const name = PROVIDER_KEY_ENV[model.provider]
  if (name === undefined) return false
  const value = env[name]
  return typeof value === 'string' && value.trim() !== ''
}

/** The price of one second at a resolution, falling back to the flat rate.
 *  `null` when the table has no price at all — which is a fact worth showing,
 *  not a zero to add up. */
export function perSecondUsd(model: Model, resolution?: string): number | null {
  const byRes = model.price.perSecondByResolutionUsd
  if (resolution !== undefined && byRes != null) {
    const exact = byRes[resolution]
    if (typeof exact === 'number') return exact
  }
  return typeof model.price.perSecondUsd === 'number' ? model.price.perSecondUsd : null
}
