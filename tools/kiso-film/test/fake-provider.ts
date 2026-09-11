/**
 * A provider, in this process.
 *
 * WHAT THIS CAN AND CANNOT SHOW. It exercises the driver — that a job is
 * submitted with the right header, polled until it settles, that a failure is
 * told from a delay, that the bytes land where they were asked for, and that
 * no key reaches an output stream. All of that is real behaviour and worth
 * testing.
 *
 * It CANNOT show that a provider descriptor matches the real provider. This
 * server answers in the shape the descriptor expects because both were
 * written here; a fake cannot disconfirm a belief about somebody else's API,
 * it can only encode it. That is why the descriptors carry `verified: false`
 * and why the record says the descriptor is unproven while the driver is not.
 */
import { createServer, type Server } from 'node:http'
import { writeFileSync } from 'node:fs'

export interface FakeOptions {
  /** Status words handed out in order; the last one repeats. */
  readonly statuses?: readonly string[]
  readonly failWith?: string
  readonly submitStatus?: number
  readonly jobIdField?: string
  /** Bytes the "finished file" is made of. */
  readonly fileBody?: string
  readonly omitJobId?: boolean
  readonly omitOutputUrl?: boolean
  /** Answer the POST with the result itself, the way an OpenAI-style images
   *  endpoint does: `{data:[{url}]}` and no job id. */
  readonly synchronous?: boolean
  /** …or with the bytes inline. */
  readonly synchronousBase64?: string
  /** THE TRAP. A URL *and* a job id: the URL is the slot the file will
   *  occupy, and it is a 404 until the job finishes. Taking it is the
   *  incident this path exists to prevent. */
  readonly urlAndJobId?: boolean
  /** What the "not there yet" URL answers with. */
  readonly slotBody?: string
}

export interface Fake {
  readonly port: number
  readonly calls: Array<{ method: string; url: string; auth: string | undefined; body: string }>
  close(): Promise<void>
}

export async function startFake(options: FakeOptions = {}): Promise<Fake> {
  const statuses = options.statuses ?? ['IN_QUEUE', 'IN_PROGRESS', 'COMPLETED']
  const calls: Fake['calls'] = []
  let polls = 0

  const server: Server = createServer((req, res) => {
    let body = ''
    req.on('data', (c) => { body += String(c) })
    req.on('end', () => {
      const url = req.url ?? ''
      calls.push({ method: req.method ?? '', url, auth: req.headers['authorization'] as string | undefined, body })
      const json = (status: number, value: unknown): void => {
        res.writeHead(status, { 'content-type': 'application/json' })
        res.end(JSON.stringify(value))
      }
      if (url.endsWith('/file.bin')) {
        res.writeHead(200, { 'content-type': 'application/octet-stream' })
        res.end(options.fileBody ?? 'the finished file')
        return
      }
      if (url.endsWith('/not-there-yet.png')) {
        // The slot. It answers, and what it answers with is not a file.
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(options.slotBody ?? '')
        return
      }
      if (req.method === 'POST') {
        if (options.submitStatus !== undefined && options.submitStatus >= 400) { json(options.submitStatus, { error: 'no' }); return }
        if (options.synchronousBase64 !== undefined) { json(200, { data: [{ b64_json: Buffer.from(options.synchronousBase64).toString('base64') }] }); return }
        if (options.urlAndJobId === true) { json(200, { data: [{ url: `http://127.0.0.1:${port}/not-there-yet.png`, task_id: 'job-1', status: 'submitted' }] }); return }
        if (options.synchronous === true) { json(200, { data: [{ url: `http://127.0.0.1:${port}/file.bin` }] }); return }
        if (options.omitJobId === true) { json(200, { nothing: 'useful' }); return }
        json(200, { [options.jobIdField ?? 'request_id']: 'job-1' })
        return
      }
      if (url.includes('/status')) {
        const status = options.failWith !== undefined && polls >= 1 ? 'FAILED' : (statuses[Math.min(polls, statuses.length - 1)] ?? 'COMPLETED')
        polls += 1
        json(200, options.failWith !== undefined && status === 'FAILED' ? { status, error: options.failWith } : { status })
        return
      }
      if (options.omitOutputUrl === true) { json(200, { nothing: 'here' }); return }
      json(200, { video: { url: `http://127.0.0.1:${port}/file.bin` } })
    })
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const address = server.address()
  const port = typeof address === 'object' && address !== null ? address.port : 0
  return {
    port,
    calls,
    close: () => new Promise<void>((r) => server.close(() => r()))
  }
}

/** A providers.json pointed at the fake, written where a test can load it. */
export function writeFakeRoutes(dir: string, port: number, overrides: Record<string, unknown> = {}): void {
  const base = `http://127.0.0.1:${port}`
  const provider = {
    id: 'fake',
    label: 'Fake provider',
    keyEnv: 'FAKE_KEY',
    verified: false,
    auth: { header: 'authorization', format: 'Key {key}' },
    submit: { urlTemplate: `${base}/{providerModelId}`, jobIdPaths: ['request_id'] },
    poll: {
      urlTemplate: `${base}/{providerModelId}/requests/{jobId}/status`,
      statusPaths: ['status'],
      doneStates: ['COMPLETED'],
      failedStates: ['FAILED'],
      workingStates: ['IN_QUEUE', 'IN_PROGRESS'],
      errorPaths: ['error'],
      intervalMs: 100
    },
    result: { urlTemplate: `${base}/{providerModelId}/requests/{jobId}`, outputUrlPaths: ['video.url', 'data.0.url'], outputBase64Paths: ['data.0.b64_json'] },
    ...overrides
  }
  writeFileSync(`${dir}/providers.json`, JSON.stringify({ schemaVersion: 1, providers: [provider] }, null, 2))
}
