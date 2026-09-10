# Bootstrap — the collection of plugins for the kiso desktop app

## 0. In one line

An empty directory became a public repository that holds the three official
plugins, documents the manifest format as the desktop app actually reads it,
and refuses on every pull request anything that would not install.

## 1. What the clauses required

The app's plugin architecture is decided in **ADR-008** ("Skills teach,
plugins declare, the App owns the index") and **ADR-L009** (the install trust
boundary), both in the desktop app's own repository. The clauses this
repository had to honour:

- **ADR-008 clause 2** — a plugin is *declarative*: no code, no binaries.
  `commands` names the executables the skills invoke; `secrets` names
  credentials by name only; `mcp` is accepted, shown, and off until a person
  starts it; **unknown fields are ignored**; installing reads and copies files
  and runs nothing; a manifest that declares in-process code is refused; git
  installs are shallow with hooks disabled, validated in a temporary
  directory; only a person installs.
- **ADR-008 clause 3** — declaring is not granting. A project's own page
  grants a command; a plugin never grants itself one by being installed.
- **ADR-008 clause 5** — the resident cost of a skill is one index line
  (description cut at 200 characters); the body pages in on `read_skill`,
  capped at 32 KB.
- **ADR-008 clause 9** — a secret is declared by name, lives in the keychain,
  and reaches exactly one place. The reason it is a rule and not a detail is
  the log: append-only and byte-stable, so a secret that reaches it cannot be
  removed without breaking replay.
- **ADR-L005** — source and records are English. Two files are exempt here
  rather than one, and the exemption is the point of the second file.

## 2. What changed

Everything is new; the repository was an empty directory.

| path | what it does now |
|---|---|
| `README.md` | Draws the line in its first paragraph: this holds plugins for the desktop **app**; the open-source **runtime** is extended by `kiso-*-ext` npm packages and none live here. Lists the three plugins, says how to install one, and says plainly that installing by git URL does not work yet |
| `README.zh.md` | The same, in Chinese. With `README.md`, the only two files exempt from the language gate |
| `docs/plugin-format.md` | Every manifest field as the app reads it — `id`, `name`, `version`, `description`, the reserved `host`, `skills`, `commands`, `secrets`, `icon`, `mcp`, and the refusal of `extension`. What installing does and never does. The `SKILL.md` rules, including the two that silently produce a broken skill. What would be needed to install a collection by its URL |
| `plugins/fix-and-prove/` | Copied from the app's `packs/`, plus `host` and a README |
| `plugins/short-drama/` | Same |
| `plugins/shorts-pack/` | Same |
| `scripts/validate.mjs` | Reads every `plugins/*/kiso-plugin.json` by the app's own rules, ported rather than imported. `--selftest` builds 30 fixtures and proves each rejection fires |
| `scripts/gates/cjk-gate.mjs` | The app's gate, copied; roots and the two-file exemption are the only configuration changed, plus a missing named file now being a finding rather than a stack trace |
| `.github/workflows/check.yml` | One job, `npm run check`, on push to `main` and on every pull request. No build, no container |
| `CONTRIBUTING.md` | One directory, one pull request, with the checklist and what gets a plugin turned down |
| `LICENSE` | MIT |
| `package.json` | `check` = validate + validate --selftest + the language gate. No dependencies |

### The manifests gained one field

```json
"host": "kiso-app"
```

Written into all three, documented as reserved, and required by the
validator. The app ignores fields it does not know, so it costs the app
nothing today; what it buys is that a reader of a directory full of skills can
tell in one line which of the two kiso projects it belongs to.

### Where the validator is deliberately stricter than the app

The app is lenient about malformed *sub-fields* so that a person's plugin
still installs: a `secrets` entry that is not an UPPER_CASE name is dropped, a
`commands` entry that is not a bare executable name is dropped, an unparseable
MCP server is dropped. **Dropping is right for an install and wrong for a
collection** — here the author is present and the fix is one character, and a
silently-dropped declaration is a manifest that says something the app will
not do. Each such case is an error, labelled `STRICTER` in its message.

Three further requirements are the collection's own and not the app's: a
`description` on the plugin, `"host": "kiso-app"`, and the directory name
matching the manifest id.

## 3. Proof

```
$ npm run check
  OK    fix-and-prove
  OK    short-drama
  OK    shorts-pack
validate: green — 3 plugins read by the App's own rules
validate --selftest: green — 30/30 checks fire on a fixture that breaks them
cjk gate: green — source and records are English (ADR-L005)
```

Exit code 0.

**Why the validator runs twice.** Every check is a claim that something is
*refused*, and a run over three valid plugins cannot tell a check that works
from a check that never fires. `--selftest` builds a valid fixture, breaks it
one way at a time, and requires the specific message each time; the valid
fixture itself is one of the 30 cases, so a self-test that passed by
rejecting everything would fail. The counts to compare on any future change
are **3 plugins** and **30 fixtures**.

**What is NOT proven here.** No claim in this record was verified by running
the desktop app; this repository cannot build it. In particular *"the app
ignores unknown fields"* — the sentence that makes `host` safe — is read from
the app's manifest parser, where every field is fetched by explicit name and
only `extension`/`extensions` cause a refusal. It is a source reading, not a
run. §4 says what would turn it into a run.

**The privacy sweep**, run over everything copied in, before the first
commit. This repository is public and the three plugins came from a private
one:

```
$ grep -rnIE "(/Users/|/home/)[a-z]|@[a-z0-9.-]+\.(com|net|org)|localhost:[0-9]|(sk|pk)-[A-Za-z0-9]|(api[_-]?key|token|password)[\"' ]*[:=]|[0-9]{1,3}(\.[0-9]{1,3}){3}" -i plugins/
$ echo $?
1
```

No output; grep exits 1 when it matches nothing. **A sweep that finds nothing
and a sweep whose pattern is broken look identical**, so the same pattern was
run against a copy carrying one planted line of each shape:

```
canary.md:1:home path /Users/someone/Desktop
canary.md:2:mail someone@example.com
canary.md:3:key sk-ABCDEF123
canary.md:4:api_key = "x"
canary.md:5:host 192.168.1.4
canary.md:6:port localhost:3000
```

Six of six fire. Separately: no CJK outside the two exempt files, and no
symbolic link anywhere in `plugins/`.

## 4. Open ruling points

**1. The validator is stricter than the app in six places.**
*Recommendation: keep it, as built.* A collection's job is to be the place
where a mistake is caught while the author is still holding it. The risk is
drift in the other direction — that this repository refuses a plugin the app
would happily install, and an author believes the repository. Every stricter
message says `STRICTER` and says what the app would do instead, so the author
can tell which rule they are up against.

**2. `host` is unproven against the app.** *Recommendation: prove it in the
app, not here.* The app's `packs.mjs` proof installs from the app's own
`packs/` copy, which does not carry the field. One line — adding `host` to
those three manifests — would put the claim under an existing proof that
already asserts both packs install and their skills reach the index. That is a
change to the app and therefore the leader's; **I did not make it.**

**3. MIT.** *Recommendation: MIT, as instructed — confirmed by the owner on 2026-09-10; the `LICENSE` file stands.* It matches the runtime
(`@vincemakes/kiso-core` is MIT) and a person copying a recipe out of a
`SKILL.md` into their own workflow should not have to think about it. Noting
only that the contents are almost entirely prose rather than code, and MIT
grants what prose needs regardless — there is no reason to reach for a
documentation licence and add a second one to reason about.

**4. This record is public, and the app's record shape assumes it is not.**
The shape asks for transcript paths and gate output tails. Those carry
absolute paths from the machine that ran them and, in the app's case,
references to a closed repository. §3 above quotes command output with the
machine paths removed and cites no transcript. *Recommendation: the shape
stays, and a public record cites repository-relative paths only.* If the
leader wants the raw run, it belongs in the app's own record, not here.

**5. Should the app's `packs/` become a copy of this repository, or stay a
fork?** Both READMEs now say this repository is the source of truth. Nothing
enforces it, and the two will drift the first time someone edits a `SKILL.md`
in the app to make a proof pass. *Recommendation: a check in the app's gate
that diffs `packs/` against a pinned commit of this repository.* Not built —
it is a change to the app.

## 5. Upstream findings

Four, all read from the desktop app's `src/main/tools/plugins.ts` and
`src/main/tools/skills.ts`. None was reproduced by running the app.

**A collection repository cannot be installed by its URL.** `installFromGit`
clones and calls `installFromDir(checkout)`, which reads the manifest at the
**root** of the clone. A collection has no manifest at its root and cannot
have one — it holds several plugins, and a root manifest would have to be one
of them. The URL is passed straight to `git clone` with no fragment handling,
so there is no sub-path to reach for either. What would close it, either:

- **a sub-path on the URL** — `https://…/kiso-plugins#plugins/short-drama`,
  split before the clone and resolved *inside* the validated temporary
  directory so the containment story is unchanged; or
- **a root index the app reads** — a file naming the directories that are
  plugins, so one URL offers a choice rather than a single install.

Documented in `docs/plugin-format.md` under *Installing from this repository*,
which says plainly that copying the directory is how it works today. **The app
change is the leader's.**

**A plugin whose id differs from its directory name is skipped silently.** The
index requires them equal and `continue`s past a mismatch, so a plugin can be
perfectly valid and simply never appear, with nothing said anywhere. The
validator makes it an error; the app might reasonably surface it as a broken
row instead of a silence.

**A malformed sub-field is dropped without a word.** A `secrets` entry that is
not UPPER_CASE, a `commands` entry with a path or an argument, an MCP server
missing its `command` — each is filtered out and the plugin installs looking
complete. The person who wrote it has no way to learn that the app is not
doing what their manifest says. A note on the plugin's row — *"3 declarations
in this manifest were not understood"* — would cost one line and close it.

**A `SKILL.md` with no `description` installs and teaches nothing.** It is
listed as broken, which is right, but the *plugin* still looks installed and
fine. This is the failure most worth catching before shipping, so the
validator refuses it here.

## 6. What was left out and why

- **Nothing was pushed.** The remote is the owner's to create. Commits are
  local on `main`.
- **The app's `packs/README.md` is not written by me.** Both READMEs were
  asked to name this repository as the source of truth; this one does. The
  app's copy lives on `a0-revive` in the leader's own checkout, and committing
  there would collide with a merge chain. The text is delivered separately for
  the leader to land.
- **No catalog, no index file, no marketplace.** ADR-008 clause 8 says there
  is no catalog until a first-party plugin exists to list and no marketplace
  in v1. Three plugins in a table in a README is what that allows.
- **No plugin was written for this repository.** The three are the app's,
  copied. Writing a fourth is a slice, not a bootstrap.
- **The workflow builds nothing and containerises nothing.** `npm run check`
  is dependency-free Node. The Actions minutes on this account are shared
  across several repositories, and a docker step here would be most of the
  bill for no coverage.
- **No `npm ci` step and no lockfile.** There are no dependencies to install,
  so the workflow would spend time proving an empty tree is empty. The day a
  dependency arrives, both come with it.
