/**
 * The provider routes, as data.
 *
 * WHY THIS IS A FILE AND NOT CODE. A client written against a third-party API
 * is right or wrong in one place: the URL, the header, the name of the field
 * the job id comes back in, the words its states are called. That part cannot
 * be verified without a real call, which costs money and is the owner's to
 * make — so it is the part that should be a JSON edit rather than a change to
 * a compiled program, and the part that should carry its own `verified: false`
 * until somebody has watched it work.
 *
 * What IS testable is everything around it: that the driver reads the
 * descriptor correctly, redacts, times out, gives up, and puts the bytes where
 * it said. The fake provider in the tests exercises all of that.
 *
 * The distinction matters for what this package may claim. A fake server
 * written here cannot disconfirm a belief about a real API — it encodes it.
 * So the honest sentence is: **the driver does what the descriptor says**,
 * tested; **the descriptor matches the provider**, unverified.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { validate } from './schema.js'
import { TableError } from './models.js'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const PACKAGE_ROOT = join(HERE, '..', '..')

export interface ProviderRoute {
  readonly id: string
  readonly label: string
  readonly keyEnv: string
  readonly verified: boolean
  readonly auth: { readonly header: string; readonly format: string }
  readonly submit: {
    readonly urlTemplate: string
    readonly jobIdPaths: readonly string[]
    /** The body field the model id goes in, for a route whose URL does not
     *  name it. Without one of the two, the provider is never told which
     *  model to run — and answers about some default, or refuses. */
    readonly modelParam?: string
    /** When the answer carries no job id, the answer IS the result. */
    readonly synchronousWhenNoJobId?: boolean
    readonly outputUrlPaths?: readonly string[]
    readonly outputBase64Paths?: readonly string[]
  }
  readonly poll?: {
    readonly urlTemplate: string
    readonly statusPaths: readonly string[]
    readonly doneStates: readonly string[]
    readonly failedStates: readonly string[]
    readonly workingStates?: readonly string[]
    readonly errorPaths?: readonly string[]
    readonly intervalMs: number
  }
  readonly result: { readonly urlTemplate: string; readonly outputUrlPaths: readonly string[]; readonly outputBase64Paths?: readonly string[] }
}

export interface ProviderTable {
  readonly schemaVersion: number
  readonly providers: readonly ProviderRoute[]
}

export function loadProviders(root: string = PACKAGE_ROOT): ProviderTable {
  let raw: unknown
  let schema: unknown
  try {
    raw = JSON.parse(readFileSync(join(root, 'data', 'providers.json'), 'utf8'))
    schema = JSON.parse(readFileSync(join(root, 'data', 'providers.schema.json'), 'utf8'))
  } catch (err) {
    throw new TableError(`the provider routes could not be read: ${err instanceof Error ? err.message : String(err)}`)
  }
  const problems = validate(schema as Record<string, unknown>, raw)
  if (problems.length > 0) throw new TableError(`the provider routes do not match their schema (${problems.length} problem${problems.length === 1 ? '' : 's'})`, problems)
  return raw as ProviderTable
}

export function routeFor(table: ProviderTable, providerId: string): ProviderRoute | undefined {
  return table.providers.find((p) => p.id === providerId)
}

/**
 * `a.b.0.c` into an object. Numeric segments index arrays.
 *
 * Providers disagree about where things sit and change their minds between
 * versions, so every place the driver reads is a LIST of paths tried in order
 * — the first that yields a string wins. A descriptor that guessed one shape
 * and met another is then one array entry away from correct.
 */
export function at(value: unknown, path: string): unknown {
  let current: unknown = value
  for (const segment of path.split('.')) {
    if (current === null || current === undefined) return undefined
    if (Array.isArray(current)) {
      const i = Number(segment)
      if (!Number.isInteger(i)) return undefined
      current = current[i]
      continue
    }
    if (typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

export function firstString(value: unknown, paths: readonly string[]): string | undefined {
  for (const p of paths) {
    const got = at(value, p)
    if (typeof got === 'string' && got !== '') return got
    if (typeof got === 'number') return String(got)
  }
  return undefined
}

/** `{providerModelId}` and `{jobId}` filled in. Anything else left in braces
 *  is a descriptor naming a value the driver does not have, and saying so is
 *  better than sending a URL with a brace in it. */
export function fill(template: string, values: Readonly<Record<string, string>>): string {
  const out = template.replace(/\{([a-zA-Z]+)\}/g, (whole, key: string) => values[key] ?? whole)
  const left = /\{([a-zA-Z]+)\}/.exec(out)
  if (left !== null) throw new Error(`the route names {${left[1]}}, which this command does not have`)
  return out
}
