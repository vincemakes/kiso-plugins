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
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { download, registerSecret, send, redact } from './net/http.js'
import { fill, firstString, routeFor, type ProviderRoute, type ProviderTable } from './providers.js'

/**
 * THE BODY THAT IS ACTUALLY SENT.
 *
 * Exported, and used by `--dry-run` as well as by the send, because a dry run
 * that prints a different body from the one that would go is worse than no
 * dry run: it is a check that agrees with itself.
 *
 * THE MODEL ID HAS TO REACH THE PROVIDER, and routes differ on where. One
 * names it in the URL; the others take it as a body field. A route that does
 * neither sends a prompt and no model, and the provider answers about
 * whatever its default is — a call that costs money and produces the wrong
 * thing, with nothing in the answer to say so.
 */
export function finalBody(route: ProviderRoute, providerModelId: string, input: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const namesModelInUrl = route.submit.urlTemplate.includes('{providerModelId}')
  if (!namesModelInUrl && (route.submit.modelParam ?? '') === '') {
    throw new Error(`the route to ${route.label} names the model neither in its URL nor in a body field, so ${providerModelId} would never reach it. The route is unverified data; correcting it is an edit to data/providers.json`)
  }
  const body: Record<string, unknown> = { ...input }
  if (!namesModelInUrl) body[route.submit.modelParam as string] = providerModelId
  return body
}

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

  const url = fill(route.submit.urlTemplate, values)
  const body = finalBody(route, req.providerModelId, req.input)

  const submitted = await send({
    url,
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
  if (submitted.status >= 400) throw new Error(redact(`${route.label} refused the job (${submitted.status}): ${firstLine(submitted.body)}`))
  let parsed: unknown
  try { parsed = JSON.parse(submitted.body) } catch { throw new Error(`${route.label} answered with something that is not JSON`) }
  const jobId = firstString(parsed, route.submit.jobIdPaths)

  /*
   * SYNCHRONOUS IS A PROPERTY OF THE ANSWER, NOT OF THE PROVIDER.
   *
   * One provider's image endpoint answers in two shapes. Sometimes the answer
   * IS the result: a URL, and no job id. Sometimes it is a job, and it carries
   * BOTH a job id and a URL — and that URL is the slot the file will occupy,
   * which is a 404 until the job finishes.
   *
   * So the rule is not "this provider is synchronous". It is: **a job id, if
   * one is there, wins over any URL beside it.** Taking the URL when a job id
   * is present downloads a 404 and reports success, which is worse than
   * failing, and it is a mistake somebody has already made and paid for.
   *
   * The job id is therefore looked for FIRST, and this branch is reached only
   * when there is none.
   */
  if (jobId === undefined && route.submit.synchronousWhenNoJobId === true) {
    const out = await writeOutput(parsed, route.submit.outputUrlPaths ?? [], route.submit.outputBase64Paths ?? [], req.out, route.label, 'the answer')
    return { out: out.out, bytes: out.bytes, jobId: '', statuses: ['synchronous'] }
  }
  if (jobId === undefined) {
    throw new Error(`${route.label} accepted the job and this route does not know where it put the job id — it looked at ${route.submit.jobIdPaths.join(', ')}. The route is unverified data; correcting it is an edit to data/providers.json`)
  }
  if (route.poll === undefined) {
    throw new Error(`${route.label} answered with a job id and this route has no poll — the route says it is only ever synchronous, and it is not. The route is unverified data; correcting it is an edit to data/providers.json`)
  }
  const poll = route.poll

  const deadline = Date.now() + (req.timeoutMs ?? DEFAULT_JOB_TIMEOUT_MS)
  const started = Date.now()
  const statuses: string[] = []
  const pollUrl = fill(poll.urlTemplate, { ...values, jobId })
  for (;;) {
    const res = await send({ url: pollUrl, method: 'GET', headers })
    if (res.status >= 400) throw new Error(redact(`${route.label} answered ${res.status} while the job was running: ${firstLine(res.body)}`))
    let body: unknown
    try { body = JSON.parse(res.body) } catch { throw new Error(`${route.label} answered with something that is not JSON while polling`) }
    const status = firstString(body, poll.statusPaths) ?? ''
    if (statuses[statuses.length - 1] !== status) statuses.push(status)
    req.onStatus?.(status, Date.now() - started)

    if (poll.failedStates.includes(status)) {
      const why = firstString(body, poll.errorPaths ?? []) ?? 'no reason given'
      throw new Error(redact(`${route.label} failed the job: ${why}`))
    }
    if (poll.doneStates.includes(status)) break
    const working = poll.workingStates
    if (status !== '' && working !== undefined && working.length > 0 && !working.includes(status)) {
      throw new Error(`${route.label} reported the state "${status}", which this route does not know. It knows ${[...working, ...poll.doneStates, ...poll.failedStates].join(', ')} — the route is unverified data`)
    }
    if (Date.now() > deadline) throw new Error(`${route.label} was still "${status}" after ${Math.round((Date.now() - started) / 1000)}s — giving up. The job may still finish there; nothing was downloaded.`)
    await sleep(req.pollIntervalMs ?? poll.intervalMs)
  }

  const finished = await send({ url: fill(route.result.urlTemplate, { ...values, jobId }), method: 'GET', headers })
  if (finished.status >= 400) throw new Error(redact(`${route.label} answered ${finished.status} for the finished job: ${firstLine(finished.body)}`))
  let result: unknown
  try { result = JSON.parse(finished.body) } catch { throw new Error(`${route.label} answered with something that is not JSON for the finished job`) }
  const written = await writeOutput(result, route.result.outputUrlPaths, route.result.outputBase64Paths ?? [], req.out, route.label, 'the finished job')
  return { out: written.out, bytes: written.bytes, jobId, statuses }
}

/**
 * The file, from a URL or from base64, wherever the route says it is.
 *
 * AND A CHECK ON WHAT ARRIVED. A route that hands back a URL whose file is not
 * there yet answers 200 with nothing useful, and a zero-byte or plainly
 * non-image file reported as a success is the failure this whole lane is
 * about. Size is checked, and for the kinds with a signature the first bytes
 * are read — a wrong answer here says so rather than sitting on disk.
 */
async function writeOutput(
  body: unknown,
  urlPaths: readonly string[],
  base64Paths: readonly string[],
  to: string,
  label: string,
  which: string
): Promise<{ out: string; bytes: number }> {
  const out = resolve(to)
  mkdirSync(dirname(out), { recursive: true })

  const inline = firstString(body, base64Paths)
  if (inline !== undefined) {
    const buffer = Buffer.from(inline, 'base64')
    if (buffer.byteLength === 0) throw new Error(`${label} returned an empty base64 field for ${which}`)
    writeFileSync(out, buffer)
    checkLooksLikeMedia(out, buffer, label)
    return { out, bytes: buffer.byteLength }
  }

  const url = firstString(body, urlPaths)
  if (url === undefined) {
    throw new Error(`${label} answered ${which} and this route does not know where it put the file — it looked at ${[...urlPaths, ...base64Paths].join(', ')}. The route is unverified data; correcting it is an edit to data/providers.json`)
  }
  const bytes = await download(url, out)
  if (bytes === 0) throw new Error(`${label} gave a URL for ${which} and it answered with nothing. An empty file is not a result — the route is unverified data, and a URL that is a slot the file has not reached yet looks exactly like this`)
  checkLooksLikeMedia(out, readFileSync(out, { encoding: null }).subarray(0, 16), label)
  return { out, bytes }
}

/** The first bytes of the common kinds. Not a security check — a sanity one:
 *  a JSON error body saved as a .png is a failure wearing a success. */
function checkLooksLikeMedia(out: string, head: Buffer, label: string): void {
  const text = head.toString('latin1')
  if (text.startsWith('{') || text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
    throw new Error(`${label} answered with text where a file should be, and it was written to ${out}. That is usually a route pointing at something that is not the file — the route is unverified data`)
  }
}

function firstLine(text: string): string {
  return text.split('\n')[0]?.slice(0, 200) ?? ''
}
