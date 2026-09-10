import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

/**
 * THIS HALF OF THE TOOL CANNOT MAKE A CALL, and that is a property a reviewer
 * should be able to check rather than take on trust.
 *
 * The seam between this lane and the next one is exactly the network. The
 * providers, the keys and the money all arrive together in the next lane, and
 * the reason to split there was so that this one could be reviewed without
 * any of it. A promise in a record is worth nothing next to a test.
 */
const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..')

/** Every way a Node program reaches the network, by the name it has to use. */
const NETWORK = [
  /\bfetch\s*\(/,
  /\bnode:(https?|net|tls|dgram|dns|http2)\b/,
  /\brequire\(\s*['"](https?|net|tls|dgram|dns|http2)['"]/,
  /\bfrom\s+['"](https?|net|tls|dgram|dns|http2)['"]/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bundici\b/,
  /\bnew\s+URL\(.*https?:\/\//
]

function sources(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) { out.push(...sources(full)); continue }
    if (/\.(ts|js|mjs|cjs)$/.test(entry)) out.push(full)
  }
  return out
}

function offenders(files: readonly string[]): string[] {
  const hits: string[] = []
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    text.split('\n').forEach((line, i) => {
      // A line that only NAMES the rule is not a use of it. This test is one.
      if (/no-network|NETWORK = \[|cannot make a call/.test(line)) return
      for (const pattern of NETWORK) {
        if (pattern.test(line)) hits.push(`${file.slice(ROOT.length + 1)}:${i + 1}: ${line.trim().slice(0, 80)}`)
      }
    })
  }
  return hits
}

test('nothing in src/ can reach the network', () => {
  assert.deepEqual(offenders(sources(join(ROOT, 'src'))), [])
})

test('and nothing in the BUILT output can either — the tarball is what ships', () => {
  assert.deepEqual(offenders(sources(join(ROOT, 'build', 'src'))), [])
})

test('the scan FIRES — it is not a grep that matches nothing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kiso-film-net-'))
  try {
    writeFileSync(join(dir, 'a.ts'), 'const r = await fetch("https://example.com")\n')
    writeFileSync(join(dir, 'b.ts'), "import { request } from 'node:https'\n")
    writeFileSync(join(dir, 'c.ts'), "import { connect } from 'net'\n")
    const hits = offenders(sources(dir))
    assert.equal(hits.length, 3, `expected three, got ${JSON.stringify(hits)}`)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('no key is read anywhere in this half — only key NAMES, for saying what is missing', () => {
  // `PROVIDER_KEY_ENV` maps a provider to the variable its key would arrive
  // in, and `isReachable` asks whether that variable is set. Neither reads a
  // value into anything that could print, log or write it.
  const text = sources(join(ROOT, 'src')).map((f) => readFileSync(f, 'utf8')).join('\n')
  for (const line of text.split('\n')) {
    if (!/process\.env|\benv\[/.test(line)) continue
    assert.match(line, /PROVIDER_KEY_ENV|env\[name\]|NodeJS\.ProcessEnv|process\.env\b/, `an environment read this test does not know about: ${line.trim()}`)
  }
})
