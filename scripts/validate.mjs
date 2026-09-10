#!/usr/bin/env node
/**
 * The collection's validator.
 *
 * Every plugin in `plugins/` is read by the SAME RULES the kiso desktop app
 * applies at install time, so a plugin that is green here installs there.
 * Those rules live in the App's `src/main/tools/plugins.ts` (the manifest) and
 * `src/main/tools/skills.ts` (the skill files behind it).
 *
 * THE CHECKS ARE PORTED, NOT IMPORTED, and that is deliberate: importing the
 * App would make this public repository depend on a closed-source one, and
 * pin it to a version. The cost is the thing every port costs — the two can
 * drift. `docs/plugin-format.md` is written against the App's source and names
 * it, so a drift is found by reading one file against the other.
 *
 * WHERE THIS IS STRICTER THAN THE APP, ON PURPOSE. The App is lenient about
 * malformed *sub-fields* so that a person's plugin still installs: a `secrets`
 * entry that is not an UPPER_CASE name is dropped, a `commands` entry that is
 * not a plain executable name is dropped, an unparseable MCP server is
 * dropped. Dropping is right for an install and wrong for a collection: here
 * the author is present, the fix is one character, and a silently-dropped
 * declaration is a plugin whose manifest says something the App will not do.
 * Every such case is reported as an error and labelled STRICTER.
 *
 * Usage:
 *   node scripts/validate.mjs              validate plugins/ (exit 0 = green)
 *   node scripts/validate.mjs --selftest   prove each rejection actually fires
 */
import { closeSync, existsSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, readSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const PLUGINS = join(root, 'plugins')

export const MANIFEST = 'kiso-plugin.json'
/** plugins.ts: the id is the directory name and the registry key. */
const ID_RE = /^[a-z0-9][a-z0-9-]*$/
/** projects.ts `isExecutableName` — a name, never a path, never a command line. */
const EXECUTABLE_RE = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/
/** A category is a directory name and a path segment, so it is shaped like an
 *  id. This collection's rule, not the App's. */
const CATEGORY_RE = /^[a-z0-9][a-z0-9-]*$/
/** plugins.ts: a secret is a NAME shaped like an environment variable. */
const SECRET_RE = /^[A-Z][A-Z0-9_]*$/
/** plugins.ts `parseMcpServers`: env keys are C identifiers. */
const ENV_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/
const ICON_EXT = new Set(['.png', '.svg', '.jpg', '.jpeg', '.webp'])
const ICON_MAX_BYTES = 64 * 1024
const MCP_MAX_SERVERS = 16
/** skills.ts: the frontmatter must be inside the probe the App actually reads. */
const FRONTMATTER_PROBE = 8 * 1024
const MAX_DESCRIPTION = 200

/**
 * The one reserved field this repository adds (docs/plugin-format.md).
 * The App ignores unknown fields, so this costs the App nothing today and
 * tells a READER which host a directory is for — the point of the whole
 * repository, since the runtime is extended by npm packages and not by these.
 */
const HOST = 'kiso-app'

/** `looksLikeImage`, ported from plugins.ts. */
function looksLikeImage(name, b) {
  const ext = extname(name).toLowerCase()
  if (ext === '.png') return b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
  if (ext === '.jpg' || ext === '.jpeg') return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
  if (ext === '.webp') return b.length > 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP'
  return /<svg[\s>]/i.test(b.subarray(0, 2048).toString('utf8'))
}

/** `findSymlink`, ported. A plugin may contain no link, anywhere. */
function findSymlink(dir, depth = 0) {
  if (depth > 24) return null
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return null
  }
  for (const e of entries) {
    if (e.isSymbolicLink()) return join(dir, e.name)
    if (e.isDirectory()) {
      const hit = findSymlink(join(dir, e.name), depth + 1)
      if (hit !== null) return hit
    }
  }
  return null
}

/** `parseFrontmatter`, ported from skills.ts — the Claude Code subset. */
function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return null
  const end = text.indexOf('\n---', 4)
  if (end < 0) return null
  const meta = {}
  for (const line of text.slice(4, end).split('\n')) {
    const m = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line)
    if (m !== null) meta[m[1]] = m[2].trim()
  }
  return meta
}

/** `readHead`, ported: the App reads only the first 8 KB looking for `---`. */
function readHead(path) {
  const fd = openSync(path, 'r')
  try {
    const buf = Buffer.allocUnsafe(FRONTMATTER_PROBE)
    const n = readSync(fd, buf, 0, FRONTMATTER_PROBE, 0)
    return buf.subarray(0, n).toString('utf8')
  } finally {
    closeSync(fd)
  }
}

/**
 * Validate one plugin directory. Returns a list of problems; empty is green.
 * Each problem is a sentence an author can act on, in the App's own words
 * wherever the App has words for it.
 */
export function validatePlugin(dir, dirName, categoryName) {
  const errors = []
  const warnings = []
  const bad = (m) => errors.push(m)

  const path = join(dir, MANIFEST)
  let raw
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'))
  } catch (err) {
    bad(existsSync(path) ? `${MANIFEST} is not valid JSON (${err instanceof Error ? err.message : String(err)})` : `no ${MANIFEST} at the root`)
    return { errors, warnings }
  }
  if (typeof raw !== 'object' || raw === null) {
    bad(`${MANIFEST} must be a JSON object`)
    return { errors, warnings }
  }
  const m = raw

  // ADR-008 clause 2, checked FIRST — as the App checks it, so a plugin that
  // is refused is refused before anything else about it is considered valid.
  if (m['extension'] !== undefined || m['extensions'] !== undefined) {
    bad('this manifest declares in-process extension code, which the App installs from nobody')
    return { errors, warnings }
  }

  const id = typeof m['id'] === 'string' ? m['id'] : ''
  if (!ID_RE.test(id)) bad(`"id" must match ${ID_RE.source} (got ${JSON.stringify(m['id'])})`)
  // listPlugins skips a directory whose manifest id is not its name, silently.
  // A plugin can therefore be perfect and invisible; here it is an error.
  else if (dirName !== undefined && id !== dirName) bad(`"id" is ${JSON.stringify(id)} but the directory is ${JSON.stringify(dirName)} — the id IS the directory name, and the App skips a plugin where they differ`)

  const name = typeof m['name'] === 'string' ? m['name'].trim() : ''
  if (name === '') bad('"name" is required')

  if (m['version'] !== undefined && typeof m['version'] !== 'string') bad('"version" must be a string')
  if (m['description'] !== undefined && typeof m['description'] !== 'string') bad('"description" must be a string')
  // Not the App's rule — the collection's. A row with no sentence under it is
  // a plugin nobody can choose from a list.
  if (typeof m['description'] !== 'string' || m['description'].trim() === '') bad('STRICTER: "description" is required in this collection — it is the only sentence a person reads before installing')

  // The reserved field. Absent is an error here and nothing at all to the App.
  if (m['host'] === undefined) bad(`"host" is required in this collection — write "host": ${JSON.stringify(HOST)} (docs/plugin-format.md)`)
  else if (m['host'] !== HOST) bad(`"host" must be exactly ${JSON.stringify(HOST)} (got ${JSON.stringify(m['host'])}) — this repository holds plugins for the kiso desktop app, not extensions for the kiso runtime`)

  /*
   * THE CATEGORY IS THE PARENT DIRECTORY, AND THE MANIFEST HAS TO AGREE.
   *
   * Same rule as `id` one level up, for the same reason: the PATH is the
   * claim a reader makes when they browse the repository, and the MANIFEST is
   * the fact the App reads. Two ways of saying one thing drift, and the one
   * that drifts silently is the one nothing checks. So they are checked
   * against each other.
   *
   * The App ignores `category` as it ignores `host` — it is this collection's
   * field, for people reading a directory listing.
   */
  const category = m['category']
  if (category === undefined) bad(`"category" is required in this collection — a plugin lives at plugins/<category>/<id>/ (docs/plugin-format.md)`)
  else if (typeof category !== 'string' || !CATEGORY_RE.test(category)) bad(`"category" must match ${CATEGORY_RE.source} (got ${JSON.stringify(category)})`)
  else if (categoryName !== undefined && category !== categoryName) bad(`"category" is ${JSON.stringify(category)} but the directory above this one is ${JSON.stringify(categoryName)} — the path is the claim and the manifest is the fact, and they have to agree`)

  const skillsRaw = m['skills']
  let skills = []
  if (!Array.isArray(skillsRaw) || skillsRaw.some((x) => typeof x !== 'string')) {
    bad('"skills" must be an array of directory names')
  } else {
    const trimmed = skillsRaw.map((s) => s.trim()).filter((s) => s !== '')
    skills = [...new Set(trimmed)]
    if (skills.length !== trimmed.length) bad('STRICTER: "skills" contains the same directory twice — the App deduplicates it, so the manifest and what installs would differ')
    const escaping = skills.find((s) => s.includes('/') || s.includes('\\') || s === '.' || s === '..')
    if (escaping !== undefined) bad(`"skills" entries are directory names, not paths (got ${JSON.stringify(escaping)})`)
    if (skills.length === 0) bad('"skills" is empty — a plugin with nothing in it installs nothing')
  }

  // secrets / commands: the App FILTERS these; here a bad entry is an error.
  if (m['secrets'] !== undefined) {
    if (!Array.isArray(m['secrets'])) bad('"secrets" must be an array of names')
    else
      for (const s of m['secrets']) {
        if (typeof s !== 'string' || !SECRET_RE.test(s)) bad(`STRICTER: "secrets" entry ${JSON.stringify(s)} is not an UPPER_CASE environment variable name — the App would drop it silently`)
      }
  }
  if (m['commands'] !== undefined) {
    if (!Array.isArray(m['commands'])) bad('"commands" must be an array of executable names')
    else
      for (const c of m['commands']) {
        if (typeof c !== 'string' || !EXECUTABLE_RE.test(c)) bad(`STRICTER: "commands" entry ${JSON.stringify(c)} is not a plain executable name — a name (ffmpeg), never a path and never a command line. The App would drop it silently`)
      }
  }

  // mcp: declaring is not starting. The App drops what it cannot parse.
  if (m['mcp'] !== undefined) {
    const raw2 = m['mcp']
    if (typeof raw2 !== 'object' || raw2 === null) bad('"mcp" must be an object of the shape { "servers": { "<name>": { "command": "...", "args": [], "env": {} } } }')
    else {
      const servers = raw2.servers
      if (typeof servers !== 'object' || servers === null) bad('"mcp" declares no "servers" object — the App would read no server out of it')
      else {
        const names = Object.keys(servers)
        if (names.length === 0) bad('"mcp.servers" is empty — declare a server or leave "mcp" out')
        if (names.length > MCP_MAX_SERVERS) bad(`"mcp.servers" declares ${names.length} servers; the App reads the first ${MCP_MAX_SERVERS}`)
        for (const [sname, v] of Object.entries(servers)) {
          if (!ID_RE.test(sname)) bad(`STRICTER: MCP server name ${JSON.stringify(sname)} must match ${ID_RE.source} — the App would drop it silently`)
          if (typeof v !== 'object' || v === null) {
            bad(`STRICTER: MCP server ${JSON.stringify(sname)} must be an object — the App would drop it silently`)
            continue
          }
          if (typeof v.command !== 'string' || v.command.trim() === '') bad(`STRICTER: MCP server ${JSON.stringify(sname)} needs a non-empty "command" — the App would drop it silently`)
          if (v.args !== undefined && (!Array.isArray(v.args) || v.args.some((a) => typeof a !== 'string'))) bad(`STRICTER: MCP server ${JSON.stringify(sname)} "args" must be an array of strings — the App would drop the non-strings`)
          if (v.env !== undefined) {
            if (typeof v.env !== 'object' || v.env === null) bad(`STRICTER: MCP server ${JSON.stringify(sname)} "env" must be an object`)
            else
              for (const [k, val] of Object.entries(v.env)) {
                if (!ENV_KEY_RE.test(k) || typeof val !== 'string') bad(`STRICTER: MCP server ${JSON.stringify(sname)} env ${JSON.stringify(k)} must be an identifier with a string value — the App would drop it silently`)
              }
          }
        }
      }
    }
    warnings.push('declares an MCP server: the App installs the plugin and starts nothing — a person starts it from the plugin row (ADR-L018)')
  }

  // icon: the App REFUSES a bad one rather than dropping it.
  const iconRaw = m['icon']
  if (iconRaw !== undefined) {
    if (typeof iconRaw !== 'string' || iconRaw.trim() === '') bad('"icon" must be a file name inside the plugin directory')
    else {
      const named = iconRaw.trim()
      if (basename(named) !== named || named.startsWith('.')) bad(`"icon" must be a plain file name inside the plugin directory, not a path (got ${JSON.stringify(named)})`)
      else if (!ICON_EXT.has(extname(named).toLowerCase())) bad(`"icon" must be an image — ${[...ICON_EXT].join(', ')} (got ${JSON.stringify(named)})`)
      else {
        let bytes
        try {
          bytes = readFileSync(join(dir, named))
        } catch {
          bytes = null
          bad(`"icon" names ${JSON.stringify(named)}, which is not in the plugin directory`)
        }
        if (bytes !== null) {
          if (bytes.byteLength > ICON_MAX_BYTES) bad(`"icon" is ${Math.round(bytes.byteLength / 1024)}KB — the limit is ${ICON_MAX_BYTES / 1024}KB`)
          else if (!looksLikeImage(named, bytes)) bad(`"icon" is named ${JSON.stringify(named)} but its bytes are not that kind of image`)
        }
      }
    }
  } else {
    warnings.push('no "icon": the row shows the plug glyph')
  }

  // validateContents, ported.
  const link = findSymlink(dir)
  if (link !== null) bad(`this plugin contains a symbolic link (${link.slice(dir.length + 1)}); plugins must not link outside themselves`)
  for (const s of skills) {
    if (s.includes('/') || s.includes('\\') || s === '.' || s === '..') continue
    const sdir = join(dir, 'skills', s)
    const p = join(sdir, 'SKILL.md')
    if (!existsSync(p)) {
      bad(`"${s}" is declared but skills/${s}/SKILL.md is missing`)
      continue
    }
    if (lstatSync(sdir).isSymbolicLink()) {
      bad(`"${s}" is a symbolic link`)
      continue
    }
    // skills.ts: a SKILL.md the App cannot read frontmatter out of installs
    // and is listed BROKEN. The plugin looks fine and teaches nothing, which
    // is the failure worth catching before it ships.
    const head = readHead(p)
    const meta = parseFrontmatter(head)
    if (meta === null) {
      bad(`skills/${s}/SKILL.md has no --- frontmatter block in its first ${FRONTMATTER_PROBE / 1024}KB — the App would list the skill as broken`)
      continue
    }
    const description = (meta['description'] ?? '').replace(/\s+/g, ' ').trim()
    if (description === '') bad(`skills/${s}/SKILL.md has no "description" — the App would list the skill as broken`)
    else if (description.length > MAX_DESCRIPTION) warnings.push(`skills/${s}: description is ${description.length} chars; the App's index cuts it at ${MAX_DESCRIPTION}`)
  }

  // Directories under skills/ that no manifest entry names are not installed
  // as skills. They are copied and never read, which is a surprise worth one
  // line rather than a silent omission.
  const skillsRoot = join(dir, 'skills')
  if (existsSync(skillsRoot)) {
    for (const d of readdirSync(skillsRoot, { withFileTypes: true })) {
      if (d.isDirectory() && !skills.includes(d.name)) warnings.push(`skills/${d.name} is not named in "skills" — it will be copied and never read`)
    }
  }

  return { errors, warnings }
}

/**
 * THE LAYOUT: `plugins/<category>/<id>/`.
 *
 * A category is a directory. It exists because a plugin is in it — there is no
 * list of categories anywhere and there should not be one, because a second
 * place to say what the directories are is a second thing to keep in step.
 *
 * Separated from `run` so the self-test can walk a tree the way the runner
 * does. The three layout rules are as easy to get wrong as any manifest field
 * and just as invisible when they are: a plugin at the wrong depth is not
 * refused by anything the App does, it is simply never found.
 *
 * Returns every problem it found and every plugin it will validate, so the
 * caller decides how to report and the self-test can assert on both.
 */
export function scanCollection(root) {
  const problems = []
  const plugins = []
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    problems.push('there is no plugins/ directory')
    return { problems, plugins, empty: false }
  }
  const categories = readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()

  /*
   * A PLUGIN AT THE FLAT DEPTH. `plugins/<id>/kiso-plugin.json` was the layout
   * until 2026-09-10 and is refused now — not because it would fail to
   * install (copied by hand it installs fine) but because the collection's
   * index is built by reading the directory, and a plugin outside the shape
   * is a plugin nobody browsing this repository will find.
   */
  for (const c of categories) {
    if (existsSync(join(root, c, MANIFEST))) {
      problems.push(`plugins/${c}/${MANIFEST} — a plugin lives at plugins/<category>/<id>/, so this one is one level too high`)
    }
  }

  /*
   * AN EMPTY COLLECTION IS GREEN, AND SAYS SO.
   *
   * This refused an empty `plugins/` until 2026-09-10, on the grounds that a
   * green run over nothing proves nothing. That is true of a glob that finds
   * nothing WHERE SOMETHING IS, which is the case below — a category with no
   * plugin in it. It is not true of a collection that is genuinely empty and
   * says which it is. The guard moved to where it bites.
   */
  if (categories.length === 0) return { problems, plugins, empty: true }

  for (const c of categories) {
    const ids = readdirSync(join(root, c), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
    // A category exists because a plugin is in it. An empty one is a directory
    // somebody made and did not fill, or a plugin somebody removed and left
    // the shelf behind — and either way the index would list a category a
    // reader can click into and find nothing.
    if (ids.length === 0) problems.push(`plugins/${c}/ has no plugin in it — a category exists because a plugin is in it`)
    for (const id of ids) plugins.push({ category: c, id, dir: join(root, c, id) })
  }
  return { problems, plugins, empty: false }
}

function run() {
  const { problems, plugins, empty } = scanCollection(PLUGINS)

  if (problems.length > 0) {
    console.error('validate: RED — the collection\'s layout')
    for (const x of problems) console.error(`        ${x}`)
    process.exit(1)
  }
  if (empty) {
    console.log('validate: green — no plugins yet; the collection is empty')
    process.exit(0)
  }

  let failed = 0
  for (const { category, id, dir } of plugins) {
    const { errors, warnings } = validatePlugin(dir, id, category)
    const where = `${category}/${id}`
    if (errors.length === 0) {
      console.log(`  OK    ${where}`)
      for (const w of warnings) console.log(`        note: ${w}`)
    } else {
      failed++
      console.error(`  FAIL  ${where}`)
      for (const e of errors) console.error(`        ${e}`)
    }
  }
  const n = plugins.length
  const cats = new Set(plugins.map((x) => x.category)).size
  if (failed === 0) {
    console.log(`\nvalidate: green — ${n} plugin${n === 1 ? '' : 's'} in ${cats} categor${cats === 1 ? 'y' : 'ies'}, read by the App's own rules`)
    process.exit(0)
  }
  console.error(`\nvalidate: RED — ${failed} of ${n} plugin${n === 1 ? '' : 's'} would not install as written`)
  process.exit(1)
}

/**
 * The self-test.
 *
 * Every check above is a claim that something is REFUSED. A run over three
 * valid plugins cannot tell a check that works from a check that never fires,
 * so each rejection gets a fixture that must trigger it. This is the reason
 * `npm run check` runs the validator twice.
 */
function selftest() {
  const base = mkdtempSync(join(tmpdir(), 'kiso-plugins-selftest-'))
  let pass = 0
  const failures = []

  /** A plugin that is valid in every way, as the starting point each case breaks. */
  const good = () => ({
    manifest: { id: 'sample', name: 'Sample', version: '1.0.0', description: 'A valid plugin.', host: HOST, category: 'video', skills: ['one'], commands: ['ffmpeg'], secrets: ['SAMPLE_KEY'], icon: 'icon.svg' },
    files: { 'icon.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>', 'skills/one/SKILL.md': '---\nname: one\ndescription: Does one thing.\n---\n\n# One\n' }
  })

  const build = (label, mutate) => {
    const g = good()
    mutate(g)
    const dir = join(base, label.replace(/[^a-z0-9]+/gi, '-'))
    mkdirSync(dir, { recursive: true })
    if (g.manifest !== null) writeFileSync(join(dir, MANIFEST), typeof g.manifest === 'string' ? g.manifest : JSON.stringify(g.manifest, null, 2))
    for (const [rel, body] of Object.entries(g.files)) {
      const at = join(dir, rel)
      mkdirSync(join(at, '..'), { recursive: true })
      writeFileSync(at, body)
    }
    return dir
  }

  /** `expect` is a substring of the message the case must produce. */
  const cases = [
    ['the control: a valid plugin passes', (g) => g, null, 'sample'],
    ['in-process extension code', (g) => (g.manifest.extension = { main: 'index.js' }), 'in-process extension code'],
    ['a bad id', (g) => (g.manifest.id = 'Sample Plugin'), '"id" must match'],
    ['id differs from the directory', (g) => (g.manifest.id = 'other'), 'the id IS the directory name'],
    ['no name', (g) => delete g.manifest.name, '"name" is required'],
    ['no description', (g) => delete g.manifest.description, '"description" is required in this collection'],
    ['no host', (g) => delete g.manifest.host, '"host" is required'],
    ['the wrong host', (g) => (g.manifest.host = 'kiso-runtime'), '"host" must be exactly'],
    ['no category', (g) => delete g.manifest.category, '"category" is required'],
    ['a category that is not a path segment', (g) => (g.manifest.category = 'Video Tools'), '"category" must match'],
    ['a category that is not the parent directory', (g) => (g.manifest.category = 'audio'), 'the directory above this one is'],
    ['skills is not an array', (g) => (g.manifest.skills = 'one'), '"skills" must be an array'],
    ['skills is empty', (g) => (g.manifest.skills = []), '"skills" is empty'],
    ['a skill entry that is a path', (g) => (g.manifest.skills = ['a/b']), 'directory names, not paths'],
    ['a duplicated skill', (g) => (g.manifest.skills = ['one', ' one ']), 'the same directory twice'],
    ['a declared skill with no SKILL.md', (g) => (g.manifest.skills = ['one', 'two']), 'skills/two/SKILL.md is missing'],
    ['a SKILL.md with no frontmatter', (g) => (g.files['skills/one/SKILL.md'] = '# One\n'), 'no --- frontmatter block'],
    ['a SKILL.md with no description', (g) => (g.files['skills/one/SKILL.md'] = '---\nname: one\n---\n# One\n'), 'has no "description"'],
    ['a lower-case secret', (g) => (g.manifest.secrets = ['sample_key']), 'not an UPPER_CASE environment variable name'],
    ['a command that is a path', (g) => (g.manifest.commands = ['/usr/bin/ffmpeg']), 'not a plain executable name'],
    ['a command with an argument', (g) => (g.manifest.commands = ['ffmpeg -y']), 'not a plain executable name'],
    ['an icon that is a path', (g) => (g.manifest.icon = 'assets/icon.svg'), 'not a path'],
    ['an icon that escapes', (g) => (g.manifest.icon = '../icon.svg'), 'not a path'],
    ['an icon of the wrong kind', (g) => ((g.manifest.icon = 'icon.txt'), (g.files['icon.txt'] = 'x')), '"icon" must be an image'],
    ['an icon that is not there', (g) => ((g.manifest.icon = 'missing.png'), delete g.files['icon.svg']), 'which is not in the plugin directory'],
    ['an icon whose bytes lie', (g) => ((g.manifest.icon = 'icon.png'), (g.files['icon.png'] = 'not a png')), 'its bytes are not that kind of image'],
    ['an oversized icon', (g) => (g.files['icon.svg'] = `<svg>${'x'.repeat(ICON_MAX_BYTES + 1)}</svg>`), 'the limit is 64KB'],
    ['an mcp block with no servers', (g) => (g.manifest.mcp = {}), 'declares no "servers" object'],
    ['an mcp server with no command', (g) => (g.manifest.mcp = { servers: { s: {} } }), 'needs a non-empty "command"'],
    ['a manifest that is not JSON', (g) => (g.manifest = '{ nope'), 'is not valid JSON'],
    ['a manifest that is not an object', (g) => (g.manifest = '"a string"'), 'must be a JSON object'],
    ['no manifest at all', (g) => (g.manifest = null), `no ${MANIFEST} at the root`]
  ]

  for (const [label, mutate, expect] of cases) {
    const dir = build(label, mutate)
    const { errors } = validatePlugin(dir, 'sample', 'video')
    if (expect === null) {
      if (errors.length === 0) pass++
      else failures.push(`${label}: expected green, got — ${errors.join('; ')}`)
      continue
    }
    const hit = errors.find((e) => e.includes(expect))
    if (hit !== undefined) pass++
    else failures.push(`${label}: no error contained ${JSON.stringify(expect)} (errors: ${errors.length === 0 ? 'NONE — the check did not fire' : errors.join('; ')})`)
  }

  // The symlink rule needs a real link, which JSON cannot express.
  {
    const dir = build('symlink', (g) => g)
    try {
      symlinkSync('/etc/hosts', join(dir, 'skills', 'one', 'linked.md'))
      const { errors } = validatePlugin(dir, 'sample', 'video')
      if (errors.some((e) => e.includes('symbolic link'))) pass++
      else failures.push(`a symbolic link inside the plugin: no error mentioned it (errors: ${errors.length === 0 ? 'NONE — the check did not fire' : errors.join('; ')})`)
    } catch (err) {
      failures.push(`a symbolic link inside the plugin: the fixture could not be built (${err instanceof Error ? err.message : String(err)})`)
    }
  }

  /*
   * THE LAYOUT RULES, walked the way the runner walks them.
   *
   * These three live in `scanCollection` rather than in a manifest, and they
   * are the ones a repository gets wrong silently: a plugin at the wrong depth
   * is not refused by anything, it is simply never found. The empty-collection
   * case is here for the opposite reason — it is the one that must stay GREEN,
   * and a rule that must not fire needs a fixture as much as one that must.
   */
  const tree = (label, build) => {
    const root = join(base, `tree-${label}`, 'plugins')
    mkdirSync(root, { recursive: true })
    build(root)
    return scanCollection(root)
  }
  const plugin = (at) => {
    mkdirSync(join(at, 'skills', 'one'), { recursive: true })
    writeFileSync(join(at, MANIFEST), JSON.stringify(good().manifest, null, 2))
    writeFileSync(join(at, 'skills', 'one', 'SKILL.md'), '---\nname: one\ndescription: Does one thing.\n---\n')
  }
  const layout = [
    ['a plugin in its category is found', (root) => plugin(join(root, 'video', 'sample')),
      (r) => r.problems.length === 0 && r.empty === false && r.plugins.length === 1 && r.plugins[0].category === 'video' && r.plugins[0].id === 'sample'],
    ['an empty collection is GREEN and says which it is', () => {},
      (r) => r.problems.length === 0 && r.empty === true && r.plugins.length === 0],
    ['a plugin at the flat depth is refused', (root) => plugin(join(root, 'sample')),
      (r) => r.problems.some((x) => x.includes('one level too high'))],
    ['a category with no plugin in it is refused', (root) => mkdirSync(join(root, 'video'), { recursive: true }),
      (r) => r.problems.some((x) => x.includes('has no plugin in it'))]
  ]
  for (const [label, build, holds] of layout) {
    let r
    try { r = tree(label.replace(/[^a-z0-9]+/gi, '-'), build) } catch (err) { failures.push(`${label}: the fixture could not be built (${err instanceof Error ? err.message : String(err)})`); continue }
    if (holds(r)) pass++
    else failures.push(`${label}: scanCollection returned ${JSON.stringify({ problems: r.problems, empty: r.empty, plugins: r.plugins.map((x) => `${x.category}/${x.id}`) })}`)
  }

  rmSync(base, { recursive: true, force: true })
  const total = pass + failures.length
  if (failures.length === 0) {
    console.log(`validate --selftest: green — ${pass}/${total} checks fire on a fixture that breaks them`)
    process.exit(0)
  }
  console.error(`validate --selftest: RED — ${failures.length} of ${total} checks did not fire\n`)
  for (const f of failures) console.error(`  ${f}`)
  process.exit(1)
}

if (process.argv.includes('--selftest')) selftest()
else run()
