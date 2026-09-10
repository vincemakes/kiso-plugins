/**
 * Submit, poll, download — the one job loop, driven entirely by a provider
 * descriptor.
 *
 * There is no per-provider code anywhere in this package. Two providers are
 * two rows of `data/providers.json`, and a third is a third row. What is
 * written here is the part that is the same whoever is at the other end:
 * reading a key out of the environment, refusing to move without one, asking
 * again until an answer or a deadline, telling a failure from a delay, and
 * putting the bytes where the person asked.
 *
 * THE KEY. Read once, registered with the http module so that every message
 * this package produces is redacted, and passed only into a header. It is
 * never in a URL, never in a log line, never in a thrown error, and never
 * written to a file — and the tests set a canary key and assert that neither
 * output stream ever contains it.
 */
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { download, registerSecret, send, redact } from './net/http.js'
import { fill, firstString, routeFor, type ProviderRoute, type ProviderTable } from './providers.js'

export class MissingKeyError extends Error {
  constructor(readonly variable: string) {
    // The variable's NAME and nothing else. Not the provider's docs, not a
    // guess at where the person should get one: a name they can act on, and
    // no sentence that could ever contain a value.
    super(variable)
  }
}

export interface JobRequest {
  readonly providerModelId: string
  readonly input: Readonly<Record<string, unknown>>
  readonly out: string
  readonly timeoutMs?: number
  readonly pollIntervalMs?: number
  /** Called with each status word, so a command can show progress without
   *  this module knowing anything about a terminal. */
  readonly onStatus?: (status: string, elapsedMs: number) => void
}

export interface JobResult {
  readonly out: string
  readonly bytes: number
  readonly jobId: string
  readonly statuses: readonly string[]
}

/** The key for a route, or a `MissingKeyError` naming the variable. */
export function keyFor(route: ProviderRoute, env: NodeJS.ProcessEnv = process.env): string {
  const value = env[route.keyEnv]
  if (typeof value !== 'string' || value.trim() === '') throw new MissingKeyError(route.keyEnv)
  const key = value.trim()
  registerSecret(key)
  return key
}

const DEFAULT_JOB_TIMEOUT_MS = 15 * 60 * 1000

export async function runJob(
  providers: ProviderTable,
  providerId: string,
  req: JobRequest,
  env: NodeJS.ProcessEnv = process.env,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms))
): Promise<JobResult> {
  const route = routeFor(providers, providerId)
  if (route === undefined) throw new Error(`no route for the provider "${providerId}" in data/providers.json`)
  const key = keyFor(route, env)
  const headers = { [route.auth.header]: route.auth.format.replace('{key}', key), 'content-type': 'application/json' }
  const values = { providerModelId: req.providerModelId }

  const submitted = await send({
    url: fill(route.submit.urlTemplate, values),
    method: 'POST',
    headers,
    body: JSON.stringify(req.input)
  })
  if (submitted.status >= 400) throw new Error(redact(`${route.label} refused the job (${submitted.status}): ${firstLine(submitted.body)}`))
  let parsed: unknown
  try { parsed = JSON.parse(submitted.body) } catch { throw new Error(`${route.label} answered with something that is not JSON`) }
  const jobId = firstString(parsed, route.submit.jobIdPaths)
  if (jobId === undefined) {
    throw new Error(`${route.label} accepted the job and this route does not know where it put the job id — it looked at ${route.submit.jobIdPaths.join(', ')}. The route is unverified data; correcting it is an edit to data/providers.json`)
  }

  const deadline = Date.now() + (req.timeoutMs ?? DEFAULT_JOB_TIMEOUT_MS)
  const started = Date.now()
  const statuses: string[] = []
  const pollUrl = fill(route.poll.urlTemplate, { ...values, jobId })
  for (;;) {
    const res = await send({ url: pollUrl, method: 'GET', headers })
    if (res.status >= 400) throw new Error(redact(`${route.label} answered ${res.status} while the job was running: ${firstLine(res.body)}`))
    let body: unknown
    try { body = JSON.parse(res.body) } catch { throw new Error(`${route.label} answered with something that is not JSON while polling`) }
    const status = firstString(body, route.poll.statusPaths) ?? ''
    if (statuses[statuses.length - 1] !== status) statuses.push(status)
    req.onStatus?.(status, Date.now() - started)

    if (route.poll.failedStates.includes(status)) {
      const why = firstString(body, route.poll.errorPaths ?? []) ?? 'no reason given'
      throw new Error(redact(`${route.label} failed the job: ${why}`))
    }
    if (route.poll.doneStates.includes(status)) break
    const working = route.poll.workingStates
    if (status !== '' && working !== undefined && working.length > 0 && !working.includes(status)) {
      throw new Error(`${route.label} reported the state "${status}", which this route does not know. It knows ${[...working, ...route.poll.doneStates, ...route.poll.failedStates].join(', ')} — the route is unverified data`)
    }
    if (Date.now() > deadline) throw new Error(`${route.label} was still "${status}" after ${Math.round((Date.now() - started) / 1000)}s — giving up. The job may still finish there; nothing was downloaded.`)
    await sleep(req.pollIntervalMs ?? route.poll.intervalMs)
  }

  const finished = await send({ url: fill(route.result.urlTemplate, { ...values, jobId }), method: 'GET', headers })
  if (finished.status >= 400) throw new Error(redact(`${route.label} answered ${finished.status} for the finished job: ${firstLine(finished.body)}`))
  let result: unknown
  try { result = JSON.parse(finished.body) } catch { throw new Error(`${route.label} answered with something that is not JSON for the finished job`) }
  const url = firstString(result, route.result.outputUrlPaths)
  if (url === undefined) {
    throw new Error(`${route.label} finished the job and this route does not know where it put the file — it looked at ${route.result.outputUrlPaths.join(', ')}. The route is unverified data; correcting it is an edit to data/providers.json`)
  }

  const out = resolve(req.out)
  mkdirSync(dirname(out), { recursive: true })
  const bytes = await download(url, out)
  return { out, bytes, jobId, statuses }
}

function firstLine(text: string): string {
  return text.split('\n')[0]?.slice(0, 200) ?? ''
}
