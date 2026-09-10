/**
 * THE ONE FILE IN THIS PACKAGE THAT REACHES THE NETWORK.
 *
 * Everything else — the table, the config, the estimate, the cut, the
 * provider adapters — builds requests and reads responses without being able
 * to send anything. `test/no-network.test.ts` scans every source file for the
 * ways a Node program reaches the network and allows exactly this one, so a
 * call added anywhere else fails the suite rather than passing review.
 *
 * That is the whole point of the arrangement. A reviewer does not have to
 * read the package to know where it talks to the world; they have to read one
 * file, and a test keeps that true.
 *
 * WHAT IT REFUSES TO DO WITH A KEY. It puts the key in a header and nowhere
 * else. It never puts it in a URL (URLs reach logs, proxies and error
 * messages), it never returns it, and every error it raises is built by
 * `redact` below, which removes any value it was given as a secret before the
 * message leaves this file.
 */
import { request as httpsRequest } from 'node:https'
import { request as httpRequest } from 'node:http'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'

export interface HttpResponse {
  readonly status: number
  readonly headers: Readonly<Record<string, string>>
  readonly body: string
}

export interface HttpRequest {
  readonly url: string
  readonly method: 'GET' | 'POST'
  readonly headers?: Readonly<Record<string, string>>
  readonly body?: string
  readonly timeoutMs?: number
}

/** Values that must never appear in anything this module says. Registered by
 *  the caller when it reads a key, so the redaction knows what to look for
 *  without this file ever learning where the value came from. */
const secrets = new Set<string>()

export function registerSecret(value: string): void {
  const trimmed = value.trim()
  // Below four characters a "secret" would redact ordinary text out of every
  // message, which is its own kind of damage.
  if (trimmed.length >= 4) secrets.add(trimmed)
}

/** Every registered secret replaced, wherever it appears. Exported because
 *  the commands redact their own output with the same function — one
 *  implementation, so the two cannot disagree. */
export function redact(text: string): string {
  let out = text
  for (const s of secrets) out = out.split(s).join('«redacted»')
  return out
}

export class HttpError extends Error {
  constructor(readonly status: number, message: string, readonly body: string) {
    super(redact(message))
  }
}

const DEFAULT_TIMEOUT_MS = 120_000

export async function send(req: HttpRequest): Promise<HttpResponse> {
  const url = new URL(req.url)
  if (url.protocol !== 'https:' && url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
    // Plain http is allowed only to this machine, which is what the fake
    // provider in the test suite is. A key must never cross a network in the
    // clear, and the check is here rather than in a review comment.
    throw new Error(`refusing to send to ${url.protocol}//${url.host} — https, or a server on this machine`)
  }
  if (url.search !== '') {
    for (const value of url.searchParams.values()) {
      if (secrets.has(value)) throw new Error('refusing to put a key in a URL — it would reach logs and proxies')
    }
  }
  const call = url.protocol === 'https:' ? httpsRequest : httpRequest
  return await new Promise<HttpResponse>((resolve, reject) => {
    const r = call(url, {
      method: req.method,
      headers: { 'user-agent': 'kiso-film', ...(req.headers ?? {}) },
      timeout: req.timeoutMs ?? DEFAULT_TIMEOUT_MS
    }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => {
        const headers: Record<string, string> = {}
        for (const [k, v] of Object.entries(res.headers)) headers[k] = Array.isArray(v) ? v.join(', ') : String(v ?? '')
        resolve({ status: res.statusCode ?? 0, headers, body: Buffer.concat(chunks).toString('utf8') })
      })
    })
    r.on('timeout', () => { r.destroy(new Error(`no answer from ${url.host} in ${(req.timeoutMs ?? DEFAULT_TIMEOUT_MS) / 1000}s`)) })
    r.on('error', (err) => reject(new Error(redact(err.message))))
    if (req.body !== undefined) r.write(req.body)
    r.end()
  })
}

/** Straight to a file, never through a string: a video is tens of megabytes
 *  and a string of it is the same bytes twice. */
export async function download(url: string, to: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<number> {
  const u = new URL(url)
  if (u.protocol !== 'https:' && u.hostname !== '127.0.0.1' && u.hostname !== 'localhost') {
    throw new Error(`refusing to download from ${u.protocol}//${u.host} — https, or a server on this machine`)
  }
  const call = u.protocol === 'https:' ? httpsRequest : httpRequest
  return await new Promise<number>((resolve, reject) => {
    const r = call(u, { method: 'GET', headers: { 'user-agent': 'kiso-film' }, timeout: timeoutMs }, (res) => {
      if ((res.statusCode ?? 0) >= 400) { res.resume(); reject(new HttpError(res.statusCode ?? 0, `the download answered ${res.statusCode}`, '')); return }
      let bytes = 0
      res.on('data', (c: Buffer) => { bytes += c.length })
      pipeline(res, createWriteStream(to)).then(() => resolve(bytes)).catch((err: unknown) => reject(err instanceof Error ? err : new Error(String(err))))
    })
    r.on('timeout', () => { r.destroy(new Error(`the download from ${u.host} stalled`)) })
    r.on('error', (err) => reject(new Error(redact(err.message))))
    r.end()
  })
}
