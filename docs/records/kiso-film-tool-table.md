# kiso-film tool, part one — the table and the commands that need no network

## 0. In one line

`tools/kiso-film` is a TypeScript package, `@vincemakes/kiso-film`, carrying a
twenty-two model table with its schema, four commands that touch nothing but
files, and a test that proves the whole half cannot reach the network.

## 1. What was decided

**The tool lives at the repository root, not inside the plugin.** The plugin's
directory is what the host copies onto a person's machine at install; a
package's sources, tests and `node_modules` must not ride along. The plugin
declares the command by name, and the package provides it. The validator only
ever reads `plugins/`, so `tools/` is outside it by construction rather than
by exception.

**The lane was split at the network, not at the commands.** The original shape
was "the table and the commands first, the providers second" — right in
substance, but two of the six commands *are* the provider: `image` and `video`
are a submit, a poll and a download, and nothing is left of them once the
client is taken out. So the seam is by network surface:

- **this lane** — the package, the table, and `models`, `config`, `estimate`,
  `compose`. Nothing in it can make a call.
- **the next** — the two provider clients, the keys, the fake provider, and
  `image` and `video`, including the motion-reference switch.

The reason to split there was so that this half could be reviewed with none of
the risk in it, and so the half that carries API keys does not also carry a
twenty-two entry transcription.

**No language models in the table.** The tool never calls one — the host's
runtime is the model — and a table listing what the tool cannot reach is a
promise.

**Nothing is verified.** Every entry carries `verified: false` until a real
call or a person's reading against the provider's own documentation says
otherwise, `kiso-film models` prints it on the row, and `estimate` says so in
its own output. Unverified data that announces itself is honest every time it
is read; unverified data mentioned in a record is honest once.

## 2. What changed

| path | what it is |
|---|---|
| `tools/kiso-film/package.json` | `@vincemakes/kiso-film`, ESM, Node 20+, bin `kiso-film`, one devDependency (TypeScript). No runtime dependencies |
| `tools/kiso-film/data/models.json` | 18 video and 4 image models: capabilities, route parameter names, durations, resolutions, aspect ratios, prices. All `verified: false` |
| `tools/kiso-film/data/models.schema.json` | The shape, and the only statement of it |
| `tools/kiso-film/src/schema.ts` | A checker for the subset of JSON Schema the schema uses, and a report of any keyword it does *not* act on |
| `tools/kiso-film/src/models.ts` | Load, validate, query. The provider key **names**, and no base URLs |
| `tools/kiso-film/src/config.ts` | `film.config.json`, which refuses a field whose name looks like a credential |
| `tools/kiso-film/src/estimate.ts` | The price of a graph before it is made |
| `tools/kiso-film/src/compose.ts` | The cut, as ffmpeg arguments — returned rather than run, so a test can read them |
| `tools/kiso-film/src/cli.ts` | The four commands, `--help`, and five exit codes a skill can read |
| `tools/kiso-film/test/*.ts` | 47 tests |
| `plugins/video/kiso-film/kiso-plugin.json` | Gains `secrets: ["FAL_KEY", "BYTEPLUS_API_KEY"]` |
| `package.json`, `.github/workflows/check.yml` | `npm run check` runs the package's suite; CI gains one `npm ci` for the repository's first dependency |
| `scripts/gates/cjk-gate.mjs` | Reaches `tools/`, and skips `build/` — generated output would report every finding twice, at a line nobody can edit |

### The schema file is load-bearing, not documentation

A hand-written validator plus a schema file would be two statements of one
shape, and the one nothing reads goes stale. So `data/models.schema.json` is
the only statement, and `src/schema.ts` walks it — a hundred lines covering
exactly the keywords the schema uses.

Which raises the obvious question, and it has a test: **what if the schema
grows a keyword the checker ignores?** `unsupportedKeywords` reports every
keyword used anywhere in the schema that the checker does not act on, and a
test asserts that list is empty. Without it, adding `maxLength` to the schema
would look like a tightening and be nothing at all.

### Exit codes, because a skill reads them

`0` worked · `1` bad input · `2` a required environment variable is not set ·
`3` a declared command is missing · `4` not built yet.

`image` and `video` exit **4** with *"Nothing was sent anywhere"* rather than
failing as unknown commands. A person who reads the plugin's README and types
the command should be told which of the two it is.

## 3. Proof

```
$ npm run check
  OK    video/kiso-film
        note: 3 offers read and checked against the renderer words
validate: green — 1 plugin in 1 category, read by the App's own rules
validate --selftest: green — 43/43 checks fire on a fixture that breaks them
cjk gate: green — source and records are English (ADR-L005)
# tests 47
# pass 47
# fail 0
```

Exit code 0.

### The tarball, which is the thing that actually ships

`npm pack` produces a 16 KB tarball carrying `build/src`, `data` and the
README, and nothing else — no sources, no tests, no lockfile. Installed into a
clean prefix with `npm install -g --prefix`, it runs:

```
$ kiso-film --version
0.1.0
$ kiso-film models --kind image
4 models

?· flux-dev             fal       $0.03/image
?· flux-pro             fal       $0.05/image
?· flux-dev-lora        fal       $0.03/image
?· seedream-4-5         fal       $0.01/image
```

**Publishing is the owner's act.** Nothing in this lane runs `npm publish`,
and nothing in it can.

### This half cannot reach the network, and that is a test rather than a claim

Four tests scan the source **and the built output** for every way a Node
program reaches the network — `fetch`, the eight networking core modules under
both import forms, `XMLHttpRequest`, `WebSocket`, `undici`, and an http URL
built into a `URL`. The built output is scanned as well as the source, because
the tarball is what ships.

And the scan is red-proved against a fixture that uses three of them:

```
the scan FIRES — it is not a grep that matches nothing
  expected three, got three
```

A fourth test holds every environment read in the source to the two forms this
half uses, so a debug print of the environment would fail rather than pass.

### A key is never printed, proved with a canary

`FAL_KEY` and `BYTEPLUS_API_KEY` are set to a value no code should ever read,
and four commands are run with it in the environment. Neither stream may
contain it. This half reads no key at all — only the *names*, so `models` can
say which variable it would want — and the test is what keeps that true when
the next lane adds one that does.

### The arithmetic that has a test because it is invisible when wrong

A cross-fade overlaps its two sides, so every later offset is short by the
fades already spent. Three clips of four seconds with one-second fades put the
second fade at **6**, not at 8. Getting it wrong drifts the film further out of
sync with every clip, and it is invisible until the last one — so the offsets
are asserted, and the wrong answer is asserted against.

## 4. Open ruling points

**1. The table is unverified and no test here can change that.** A schema test
proves it is well formed. A price out by a factor of ten, a capability flag
the wrong way round, or a parameter named as the reference names it internally
rather than as the endpoint takes it, all validate perfectly. *Recommendation:
the `verified` field flips per entry, never per table*, and only on one of two
grounds — a real call that worked, or a person reading that entry against the
provider's own documentation. The next lane's real calls will verify the two
or three models the spike touches, and no more.

**2. One route per model.** The reference carries fallback routes — the same
model reachable through a second provider. They are not carried over.
*Recommendation: leave it out until a route actually fails*, because a
fallback nobody has watched fail is a code path nobody has tested.

**3. `estimate` prices one first frame per shot.** That is what the writing
chain produces today. A shot needing a re-generation, or a model charging per
attempt rather than per image, would make it an under-estimate — and this
number exists to be approved before money is spent, so it should err high.
*Recommendation: revisit when the next lane knows what a retry costs*, and
until then the paragraph about unverified prices carries the caveat.

**4. `compose` computes fade offsets from durations it does not measure.**
`ffprobe` is declared by the plugin and would give the real ones; this lane
passes zeros, because nothing in it may run a subprocess for a value that
would change the output. *Recommendation: read them with `ffprobe` in the next
lane*, where a subprocess is already part of the picture. Until then a cut
with fades is correct only if the clips are the length the shot list said, and
`--dry-run` prints the arguments so a person can see what would run.

## 5. Upstream findings

None, and the host application was not touched: nothing in this lane wrote to
it or ran any part of it.

The reference product was **read for data, not for code**. What crossed is
facts about third-party models — what a model can do, what its route calls
things, what it costs — re-expressed in a schema written here. No code, no
prose, no file. The reference's own registry holds more than this table does:
fallback routes, its own commercial mark-up, tiers and editorial flags. None
of that is a fact about a third-party model and none of it came over.

## 6. What was left out and why

- **Nothing was pushed, and nothing was published.**
- **The providers, the keys, `image` and `video`.** The next lane. Named in
  the help and exiting 4, so they are visibly absent rather than mysteriously
  broken.
- **Language models.** The tool never calls one.
- **Fallback routes, mark-ups, tiers, editorial flags.** §5.
- **Real durations in `compose`.** §4.4.
- **A checked-in `build/`.** The tarball carries it; the repository does not.
  A committed build is a second copy that can disagree with its source.
- **A lockfile at the root.** The root still has no dependencies. The one
  lockfile is the tool's, and CI installs from it.
