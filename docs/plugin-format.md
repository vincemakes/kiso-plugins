# The plugin format

A plugin for the kiso desktop app is **a folder with a manifest and some
skills**. There is no plugin runtime, no lifecycle and nothing to execute:
installing one is a validated file copy. That is the whole trust boundary, and
it is why the format is small enough to read in one sitting.

This document describes the manifest **as the App actually reads it**. The
reading code is `src/main/tools/plugins.ts` in the kiso desktop app, which is
closed source — so every rule below is stated in full here rather than by
reference, and `scripts/validate.mjs` in this repository enforces the same
rules on every pull request. If the two ever disagree, the App is right and
this document and that script are the bug.

## The layout

**A category is a directory, and a plugin lives one level inside it.**

```
plugins/<category>/<id>/
  kiso-plugin.json      the manifest — required, at the root of the directory
  icon.svg              optional, a plain file name the manifest points at
  README.md             for people reading this repository, not read by the App
  skills/
    <skill>/SKILL.md    one directory per skill the manifest names
```

For example, `plugins/video/kiso-film/kiso-plugin.json`.

**A category exists because a plugin is in it.** There is no list of
categories anywhere and there should not be one: a second place to say what
the directories are is a second thing to keep in step. So a category
directory with no plugin in it is an error — it would put a heading in the
index that a reader can click into and find nothing.

**Two names have to agree with the path**, and both for the same reason: the
path is the claim a reader makes when they browse this repository, and the
manifest is the fact the App reads.

| the path says | the manifest must say |
|---|---|
| `plugins/<category>/` | `"category": "<category>"` |
| `plugins/<category>/<id>/` | `"id": "<id>"` |

The App enforces neither. It skips a directory whose manifest names a
different id, silently — a plugin can be perfect and invisible — and it
ignores `category` entirely. `scripts/validate.mjs` makes both an error.

**A plugin at `plugins/<id>/`, with no category above it, is refused.** That
was the layout until 2026-09-10. Copied by hand such a plugin still installs;
what it does not do is appear anywhere a person browsing this repository would
look, and the validator reads the same directory the index is built from.

**An empty collection is fine and says so.** `npm run check` on a repository
with no plugins in it prints *no plugins yet; the collection is empty* and
exits 0. What it refuses is a category with nothing in it — a glob finding
nothing where something is.

## The manifest, field by field

### `id` — required

```json
"id": "shorts-pack"
```

Must match `^[a-z0-9][a-z0-9-]*$`: lower-case letters, digits and hyphens,
starting with a letter or digit. The id is the directory name on disk and the
key in the registry, so it has to be a safe path segment as well as a stable
identity. Changing it later is installing a different plugin.

### `name` — required

```json
"name": "Shorts pack"
```

Any non-empty string; it is trimmed. This is what a person reads on the
Plugins page.

### `version` — optional

```json
"version": "1.0.0"
```

Any string. The App does not parse it, compare it, or require semver — it is
shown, not interpreted. Non-strings are ignored rather than refused.

### `description` — optional to the App, **required in this repository**

```json
"description": "Cut a long recording into vertical shorts with whisper and ffmpeg."
```

Whitespace is collapsed to single spaces and the result trimmed, so a
multi-line JSON string is fine. The App will install a plugin without one;
this collection will not, because the description is the only sentence a
person reads before choosing to install.

### `host` — **reserved by this repository**

```json
"host": "kiso-app"
```

**Required here, and meaningless to the App today.** It says which host the
directory is for. The App ignores fields it does not know, so writing it costs
nothing and is safe to add now.

It exists because of a confusion this repository was created partly to
prevent: the **kiso runtime** (`github.com/vincemakes/kiso`) is a different
piece of software from the **kiso desktop app**, and it is extended by
`kiso-*-ext` npm packages, not by anything in this folder. A reader who finds
a directory with skills in it should be able to tell in one line which of the
two it belongs to. The only accepted value is `"kiso-app"`.

### `category` — **required by this repository**

```json
"category": "video"
```

Lower-case letters, digits and hyphens, starting with a letter or digit — it
is a directory name and a path segment, so it is shaped like an `id`.

**It must equal the name of the directory above the plugin's own.** See *The
layout* above for why both names are checked against the path.

Like `host`, it means nothing to the App, which ignores fields it does not
know. It is here for people reading a directory listing, and for the index in
the README, which is built from these directories rather than from a list
somebody maintains.

### `skills` — required

```json
"skills": ["transcribe", "find-moments", "cut-clips"]
```

An array of strings, each naming a **directory** under `skills/`, never a
path. Entries are trimmed, blanks dropped, and duplicates collapsed; an entry
containing `/` or `\`, or equal to `.` or `..`, is refused. The array must not
end up empty — a plugin with nothing in it installs nothing.

Every named directory must contain a `SKILL.md`, and neither the directory nor
anything in the tree may be a symbolic link (see below). A directory under
`skills/` that the manifest does **not** name is copied and never read; the
validator says so as a note.

A plugin's skills are namespaced by its id — `shorts-pack/transcribe` — so two
plugins may both ship a `cut` and neither shadows the other.

### `commands` — optional

```json
"commands": ["mlx_whisper", "ffmpeg", "ffprobe"]
```

The executables this plugin's skills invoke. Each must match
`^[A-Za-z0-9][A-Za-z0-9._+-]*$`: **a name, never a path and never a command
line**. `ffmpeg` is valid; `/usr/bin/ffmpeg` and `ffmpeg -y` are not. The App
filters out anything else silently; this repository refuses it, because a
silently-dropped entry is a manifest that says something the App will not do.

**Declaring is not granting.** A plugin that granted its own commands by being
installed would hand a project a capability nobody asked for. This list is
what a project's page *offers*, one click each; a person grants them.

A missing binary is reported with whatever install hint the skill itself
carries — the App never fetches one.

### `secrets` — optional

```json
"secrets": ["ELEVENLABS_API_KEY"]
```

**Names only**, each matching `^[A-Z][A-Z0-9_]*$`. A manifest that carried a
value would be a secret in a file people copy, sync and paste into issues.

A person enters each value once, per project, on the plugin's row. It is
stored through the OS keychain and injected as an environment variable into
the process of a granted command whose plugin declared it — and nowhere else.
Never into the model's context, never into a tool's input, and a tool result
containing it is redacted before it is written. The reason that is a rule and
not a detail is the session log: it is append-only and byte-stable, so a
secret that reaches it cannot be removed without breaking replay.

The App drops an entry that is not an UPPER_CASE name; this repository refuses
it.

### `icon` — optional

```json
"icon": "icon.svg"
```

**A plain file name inside the plugin directory** — `basename(icon)` must
equal `icon`, and it may not start with a dot. `assets/icon.svg` and
`../icon.svg` are both refused; the installer copies what the manifest names,
and a plugin that could name a path could name one outside itself.

- Extensions: `.png`, `.svg`, `.jpg`, `.jpeg`, `.webp`.
- At most **64 KB**. This is a row's glyph, not an asset.
- The bytes must match the name. A `.png` that is not a PNG is refused rather
  than shipped as a broken image.

A **bad icon fails the install**; no icon at all is fine and the row shows a
plug glyph. An SVG is only ever used as an `<img>` source, where it is a
replaced element: no script, no external fetch, nothing of the page reachable
from it.

### `mcp` — optional

```json
"mcp": {
  "servers": {
    "my-server": {
      "command": "my-server-binary",
      "args": ["--stdio"],
      "env": { "MY_SERVER_MODE": "read-only" }
    }
  }
}
```

A server name must match `^[a-z0-9][a-z0-9-]*$`; `command` is a non-empty
string; `args` are strings; `env` keys are identifiers with string values. At
most 16 servers are read.

**Declaring is not starting.** Installing connects nothing. The plugin's row
shows what it declared, with a Start and Stop only a person presses, because
the act that grants a capability is always a person's. The App drops a server
declaration it cannot parse and installs the plugin anyway; this repository
refuses it.

### `extension` / `extensions` — **refused**

A manifest carrying either is rejected outright, before anything else about it
is considered. The runtime SPI runs arbitrary code in the app's own process,
and there is no mechanism yet to establish that a plugin is first-party — so
this version installs in-process code from nobody. That relaxes only through a
new architecture decision that supplies an identity mechanism, not through a
convenient field.

### Anything else

**Unknown fields are ignored.** Every field the App wants is fetched by name;
nothing enumerates the manifest looking for surprises. That is what makes
`host` safe to add today.

## The skill files

A `SKILL.md` is an ordinary Claude Code skill: a `---`-delimited frontmatter
block, then markdown.

```markdown
---
name: transcribe
description: Turn an audio or video file into a timestamped transcript with whisper.
---

# Transcribe a recording
...
```

- The frontmatter must be **inside the first 8 KB** of the file — that is all
  the App reads looking for it.
- `description` is **required**; a skill without one is installed and listed
  as *broken*, which is the worst outcome available: the plugin looks fine and
  teaches nothing. The validator refuses it.
- The description is cut at **200 characters** in the resident index. Write
  the first sentence to survive the cut.
- The full body enters a run only when the agent calls `read_skill`, capped at
  **32 KB**; anything larger is read as ordinary files. Keep the recipe in
  `SKILL.md` and put bulk beside it.

A skill may also carry an `offers:` block, which is read separately from the
flat frontmatter above and which the App uses to propose an action on an
artifact of a given type:

```yaml
offers:
  - from: video
    says: "Transcribe this into a timestamped transcript"
    makes: markdown
```

A malformed `offers` block is skipped, not fatal: a capability must never wait
on an App release, and a skill must never become unloadable because one of its
sentences was typed wrong.

## What installing does, and never does

**Does:**

- Reads and validates the manifest, then copies the directory into the App's
  plugins directory.
- Builds the replacement completely in a staging directory and swaps it into
  place, restoring the previous version if the swap fails.
- Excludes `.git` from the copy — a clone's config can contain
  `https://user:TOKEN@host/x.git`, and copying it would leave that credential
  on disk.
- Refuses a plugin containing a symbolic link **anywhere** in its tree. An
  earlier version dereferenced them, which copied the *target's* bytes into
  the plugin; refusing outright is the honest fix.

**Never:**

- Runs anything the plugin ships, at install time or ever.
- Starts a declared MCP server.
- Grants a declared command.
- Reads a secret out of a manifest.
- Installs on the agent's behalf. There is no tool for it, deliberately: only
  a person installs.

For a git URL the clone is `--depth 1 --no-tags --single-branch`, with no
submodule recursion and `core.hooksPath` pointed at an empty directory so a
repository's own hooks cannot be the thing that runs, into a temporary
directory that is validated **before** anything moves into place. Only
`https://`, `git@` and `ssh://` URLs are accepted. A repository is untrusted
input until its manifest parses.

## Installing from this repository

**A plugin here installs by copying its directory.** Clone the repository and
point the App at `plugins/<category>/<id>` — Settings → Integrations →
Plugins → Add, from a folder.

**Installing this repository by its URL does not work, and that is a
limitation of the App rather than of the layout here.** The App's git install
clones the URL and looks for `kiso-plugin.json` at the **root** of the clone.
A collection has no manifest at its root and cannot have one: it holds several
plugins, and a root manifest would have to be one of them.

Closing that gap needs a change in the App, one of:

- **a sub-path on the URL** — `https://…/kiso-plugins#plugins/video/kiso-film`,
  resolved inside the validated temporary clone, or
- **a root index the App reads** — a file at the repository root listing the
  directories that are plugins, so one URL offers a choice.

Neither is decided here. Until one lands, copy the directory.
