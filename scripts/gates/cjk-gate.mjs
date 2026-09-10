#!/usr/bin/env node
/**
 * CJK gate — source and records are written in English (ADR-L005).
 *
 * Copied from kiso-app, whose ruling this repository inherits. Two things
 * differ and both are configuration, not mechanics: the scanned roots are
 * this repository's, and the exemption is TWO files rather than one —
 * README.md and README.zh.md, the pair that says the same thing in two
 * languages to two audiences. There is no grandfathered list: this
 * repository has no record that predates the ruling.
 *
 * Rationale in the ADR; the mechanics here. Two escape hatches, both
 * explicit, because a lint rule with no honest exit becomes a rule people
 * route around:
 *
 *   1. Inline  — a line carrying `cjk-gate:allow` is exempt. Reserved for
 *      DATA that happens to be CJK (legacy on-disk marker forms whose
 *      literals must keep parsing, or old sessions stop replaying
 *      byte-for-byte). Never for prose.
 *   2. File    — the two READMEs, exempt by the ruling (below).
 *
 * README.md and README.zh.md are exempt by the ruling.
 *
 * Usage: node scripts/gates/cjk-gate.mjs   (exit 0 = green)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '../..')

/** Scanned roots. Everything else (node_modules, out, artifacts) is ignored. */
const ROOTS = ['plugins', 'scripts', 'docs', 'tools']
const ALSO = ['CONTRIBUTING.md']
const EXT = new Set(['.ts', '.tsx', '.mjs', '.js', '.md', '.css', '.html', '.json'])

/** Exempt by the ruling. README.zh.md exists to be read by people who do not
 *  read English; a gate that forbade it would forbid the point of the file. */
const EXEMPT = new Set(['README.md', 'README.zh.md'])

/**
 * CJK ranges. U+00B7 MIDDLE DOT is Latin-1 and deliberately NOT here — it
 * is used as a separator throughout the product copy and is not CJK.
 */
const CJK = /[ᄀ-ᇿ⺀-⻿　-〿぀-ゟ゠-ヿ㄰-㆏㐀-䶿一-鿿ꥠ-꥿가-퟿豈-﫿︰-﹏＀-｠￠-￦]/u // cjk-gate:allow the range literal itself

const ALLOW = 'cjk-gate:allow'
const findings = []

function scanFile(abs) {
  const rel = relative(root, abs)
  if (EXEMPT.has(rel)) return
  let text
  try {
    text = readFileSync(abs, 'utf8')
  } catch {
    // Only reachable for ALSO, which names files by hand. A stack trace here
    // would say "ENOENT" where the gate should say which file is missing.
    findings.push({ rel, line: 0, chars: '-', text: 'this file is named by the gate and is not there' })
    return
  }
  const lines = text.split('\n')
  lines.forEach((line, i) => {
    if (!CJK.test(line)) return
    if (line.includes(ALLOW)) return
    const chars = [...new Set([...line].filter((c) => CJK.test(c)))].slice(0, 12).join('')
    findings.push({ rel, line: i + 1, chars, text: line.trim().slice(0, 88) })
  })
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'artifacts' || entry === 'build' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full)
    else if (EXT.has(entry.slice(entry.lastIndexOf('.')))) scanFile(full)
  }
}

for (const r of ROOTS) walk(join(root, r))
for (const f of ALSO) scanFile(join(root, f))

if (findings.length === 0) {
  console.log('cjk gate: green — source and records are English (ADR-L005)')
  process.exit(0)
}

console.error(`cjk gate: RED — ${findings.length} finding(s)\n`)
for (const f of findings) {
  console.error(`  ${f.rel}:${f.line}  [${f.chars}]`)
  console.error(`      ${f.text}`)
}
console.error(`\nWrite it in English. If the CJK is DATA that must keep parsing`)
console.error(`(a legacy on-disk form), append "${ALLOW} <reason>" on that line.`)
process.exit(1)
