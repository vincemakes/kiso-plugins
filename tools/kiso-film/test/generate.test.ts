import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { startFake, writeFakeRoutes } from './fake-provider.js'
import { loadProviders } from '../src/providers.js'
import { MissingKeyError, runJob, keyFor } from '../src/generate.js'
import { redact } from '../src/net/http.js'

const PKG = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..')
const KEY = 'canary-key-2f8a17-never-appears'

/** A package root whose data/ holds the fake's routes and the real table. */
function fakeRoot(port: number, overrides: Record<string, unknown> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'kiso-film-fake-'))
  mkdirSync(join(dir, 'data'), { recursive: true })
  cpSync(join(PKG, 'data', 'providers.schema.json'), join(dir, 'data', 'providers.schema.json'))
  writeFakeRoutes(join(dir, 'data'), port, overrides)
  return dir
}

test('a job is submitted, polled until it settles, and written where it was asked for', async () => {
  const fake = await startFake()
  const root = fakeRoot(fake.port)
  try {
    const out = join(root, 'clips', 'shot.mp4')
    const result = await runJob(loadProviders(root), 'fake', {
      providerModelId: 'some/model', input: { prompt: 'x' }, out, pollIntervalMs: 1
    }, { FAKE_KEY: KEY })
    assert.equal(result.jobId, 'job-1')
    assert.deepEqual(result.statuses, ['IN_QUEUE', 'IN_PROGRESS', 'COMPLETED'])
    assert.equal(readFileSync(out, 'utf8'), 'the finished file')
    assert.equal(result.bytes, 'the finished file'.length)
  } finally { await fake.close(); rmSync(root, { recursive: true, force: true }) }
})

test('THE KEY GOES IN A HEADER AND NOWHERE ELSE', async () => {
  const fake = await startFake()
  const root = fakeRoot(fake.port)
  try {
    await runJob(loadProviders(root), 'fake', { providerModelId: 'some/model', input: { prompt: 'x' }, out: join(root, 'o.mp4'), pollIntervalMs: 1 }, { FAKE_KEY: KEY })
    assert.ok(fake.calls.length >= 3)
    for (const call of fake.calls) {
      assert.doesNotMatch(call.url, new RegExp(KEY), 'the key reached a URL')
      assert.doesNotMatch(call.body, new RegExp(KEY), 'the key reached a request body')
    }
    // The submit and the polls carry it in the header, and the download does not.
    assert.equal(fake.calls[0]?.auth, `Key ${KEY}`)
  } finally { await fake.close(); rmSync(root, { recursive: true, force: true }) }
})

test('a missing key is exit-2 material and carries the variable NAME and nothing else', () => {
  const table = { schemaVersion: 1, providers: [{ id: 'fake', label: 'Fake', keyEnv: 'FAKE_KEY', verified: false, auth: { header: 'a', format: '{key}' }, submit: { urlTemplate: 'https://x/', jobIdPaths: ['id'] }, poll: { urlTemplate: 'https://x/', statusPaths: ['s'], doneStates: ['d'], failedStates: ['f'], intervalMs: 100 }, result: { urlTemplate: 'https://x/', outputUrlPaths: ['u'] } }] }
  const route = table.providers[0]
  assert.ok(route !== undefined)
  assert.throws(() => keyFor(route, {}), MissingKeyError)
  assert.throws(() => keyFor(route, { FAKE_KEY: '   ' }), (err: unknown) => err instanceof MissingKeyError && err.message === 'FAKE_KEY')
})

test('a failure is told from a delay, and the provider\'s reason is carried', async () => {
  const fake = await startFake({ failWith: 'the prompt was refused' })
  const root = fakeRoot(fake.port)
  try {
    await assert.rejects(
      runJob(loadProviders(root), 'fake', { providerModelId: 'm', input: {}, out: join(root, 'o.mp4'), pollIntervalMs: 1 }, { FAKE_KEY: KEY }),
      /the prompt was refused/
    )
  } finally { await fake.close(); rmSync(root, { recursive: true, force: true }) }
})

test('a state the route does not know is refused rather than polled for ever', async () => {
  const fake = await startFake({ statuses: ['MOULTING'] })
  const root = fakeRoot(fake.port)
  try {
    await assert.rejects(
      runJob(loadProviders(root), 'fake', { providerModelId: 'm', input: {}, out: join(root, 'o.mp4'), pollIntervalMs: 1 }, { FAKE_KEY: KEY }),
      /does not know/
    )
  } finally { await fake.close(); rmSync(root, { recursive: true, force: true }) }
})

test('a job that never settles gives up at the deadline, and says nothing was downloaded', async () => {
  const fake = await startFake({ statuses: ['IN_PROGRESS'] })
  const root = fakeRoot(fake.port)
  try {
    await assert.rejects(
      runJob(loadProviders(root), 'fake', { providerModelId: 'm', input: {}, out: join(root, 'o.mp4'), pollIntervalMs: 1, timeoutMs: 5 }, { FAKE_KEY: KEY }),
      /giving up.*nothing was downloaded/s
    )
  } finally { await fake.close(); rmSync(root, { recursive: true, force: true }) }
})

test('a route that looks in the wrong place SAYS SO, and says the route is the thing to fix', async () => {
  // The most likely failure of an unverified descriptor, and the message has
  // to point at the descriptor rather than at the provider.
  for (const [what, options, expected] of [
    ['the job id', { omitJobId: true }, /does not know where it put the job id/],
    ['the output url', { omitOutputUrl: true }, /does not know where it put the file/]
  ] as const) {
    const fake = await startFake(options)
    const root = fakeRoot(fake.port)
    try {
      await assert.rejects(
        runJob(loadProviders(root), 'fake', { providerModelId: 'm', input: {}, out: join(root, 'o.mp4'), pollIntervalMs: 1 }, { FAKE_KEY: KEY }),
        (err: unknown) => expected.test(String(err)) && /data\/providers\.json/.test(String(err)),
        `${what}: the message did not name the route as the thing to fix`
      )
    } finally { await fake.close(); rmSync(root, { recursive: true, force: true }) }
  }
})

test('a refusal at submit carries the status and the provider\'s first line', async () => {
  const fake = await startFake({ submitStatus: 422 })
  const root = fakeRoot(fake.port)
  try {
    await assert.rejects(
      runJob(loadProviders(root), 'fake', { providerModelId: 'm', input: {}, out: join(root, 'o.mp4'), pollIntervalMs: 1 }, { FAKE_KEY: KEY }),
      /refused the job \(422\)/
    )
  } finally { await fake.close(); rmSync(root, { recursive: true, force: true }) }
})

test('REDACTION replaces a registered key wherever it appears in a message', () => {
  const secret = 'another-canary-b91d3e-value'
  const route = { id: 'x', label: 'X', keyEnv: 'X_KEY', verified: false, auth: { header: 'a', format: '{key}' }, submit: { urlTemplate: 'https://x/', jobIdPaths: ['id'] }, poll: { urlTemplate: 'https://x/', statusPaths: ['s'], doneStates: ['d'], failedStates: ['f'], intervalMs: 100 }, result: { urlTemplate: 'https://x/', outputUrlPaths: ['u'] } }
  keyFor(route, { X_KEY: secret })
  assert.equal(redact(`the server said ${secret} was wrong`), 'the server said «redacted» was wrong')
  assert.doesNotMatch(redact(`prefix ${secret} suffix`), new RegExp(secret))
})
