import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

/**
 * EXACTLY ONE FILE IN THIS PACKAGE REACHES THE NETWORK, and that is a
 * property a reviewer should be able to check rather than take on trust.
 *
 * Until the providers landed, the answer was "none". It is now "one", and the
 * difference is the whole reason the allow-list is a single named path rather
 * than a directory: a second file added to `src/net/` would pass a
 * directory-shaped rule and fail this one.
 *
 * The test asserts BOTH directions. Nothing outside `src/net/http.ts` may
 * reach the network, and `src/net/http.ts` MUST — an allow-list pointing at a
 * file that no longer calls anything is a rule that has quietly stopped
 * describing the program.
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

/** The one file allowed to call out, by exact path from the package root. */
const ALLOWED = ['src/net/http.ts', 'build/src/net/http.js']

const outside = (dir: string): string[] =>
  offenders(sources(dir).filter((f) => !ALLOWED.includes(f.slice(ROOT.length + 1))))

test('nothing in src/ reaches the network except the one file that is allowed to', () => {
  assert.deepEqual(outside(join(ROOT, 'src')), [])
})

test('and nothing in the BUILT output either — the tarball is what ships', () => {
  assert.deepEqual(outside(join(ROOT, 'build', 'src')), [])
})

test('the allowed file DOES reach the network — an allow-list pointing at nothing is not a rule', () => {
  for (const allowed of ALLOWED) {
    const hits = offenders([join(ROOT, allowed)])
    assert.ok(hits.length > 0, `${allowed} is on the allow-list and calls nothing — either it moved or the rule has stopped describing the program`)
  }
})

test('the allow-list names FILES, not a directory — a second file beside it is caught', () => {
  // A rule written as "anything under src/net" would let a second client in
  // without a word. This asserts the shape of the rule itself.
  for (const entry of ALLOWED) assert.match(entry, /\.(ts|js)$/)
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

/**
 * A KEY IS READ IN EXACTLY TWO PLACES, AND EACH DOES ONE THING WITH IT.
 *
 * This test said "no key is read anywhere" until the providers landed, which
 * was true then and is not now. It is rewritten rather than relaxed: the
 * invariant that matters is no longer *none*, it is *these two and no
 * others*.
 *
 *   models.ts   asks whether the variable is SET, and never reads the value
 *               into anything — that is how `kiso-film models` marks a row
 *               reachable.
 *   generate.ts reads the value once, registers it for redaction on the very
 *               next line, and puts it in a header.
 *
 * A third place is what this catches, and a third place is how a key ends up
 * in a log line.
 */
const ENV_READERS = ['src/models.ts', 'src/generate.ts']

test('a key is read in exactly two places, and the test names both', () => {
  const found = new Set<string>()
  for (const file of sources(join(ROOT, 'src'))) {
    const rel = file.slice(ROOT.length + 1)
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (/ENV_READERS|environment variable/.test(line)) continue
      if (/\benv\[|process\.env\b/.test(line)) found.add(rel)
    }
  }
  assert.deepEqual([...found].sort(), [...ENV_READERS].sort())
})

test('the one that reads a VALUE registers it for redaction in the same function', () => {
  const text = readFileSync(join(ROOT, 'src', 'generate.ts'), 'utf8')
  const fn = /export function keyFor[\s\S]*?\n}/.exec(text)
  assert.ok(fn !== null, 'keyFor is not where this test expects it')
  assert.match(fn[0], /registerSecret\(key\)/, 'a key is read and not registered — every message after this point could carry it')
  assert.match(fn[0], /return key/)
})

test('the one that only checks PRESENCE never puts the value anywhere', () => {
  const text = readFileSync(join(ROOT, 'src', 'models.ts'), 'utf8')
  const fn = /export function isReachable[\s\S]*?\n}/.exec(text)
  assert.ok(fn !== null)
  // It may compare the value; it may not return it, print it or store it.
  assert.doesNotMatch(fn[0], /return value(?!\s*!==|\s*===)|console\.|process\.stdout|process\.stderr|writeFileSync/)
})
