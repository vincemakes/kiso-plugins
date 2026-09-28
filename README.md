# kiso plugins

**This repository holds plugins for the kiso desktop app.** It is not the kiso
runtime and it does not extend it. The runtime — the open-source engine at
[github.com/vincemakes/kiso](https://github.com/vincemakes/kiso) — is extended
by `kiso-*-ext` npm packages, and none of those live here. If you are looking
for a way to add a tool, a provider or a capability to the runtime, this is
the wrong repository. What is here is the other thing: folders of **skills**
that teach the desktop app's agent how to do a particular kind of work.

[中文说明](README.zh.md)

## What a plugin is

A folder with a manifest and some skills. Nothing more.

```
plugins/video/kiso-film/
  kiso-plugin.json
  icon.svg
  README.md
  skills/<skill>/SKILL.md
```

A **category** is a directory, and a plugin lives one level inside it. A
category exists because a plugin is in it — there is no list of categories
anywhere, and the index below is built from the directories rather than from a
list somebody has to remember to update.

**A plugin is declarative. It ships no code and nothing in it ever runs in the
app's processes.** A skill is a recipe written for the agent to read; the
manifest names the command-line tools the recipes call and the secrets they
need, by name only. Installing is a validated file copy: it starts no server,
grants no command, and executes nothing, at install time or ever.

That is the whole trust boundary, and it is small on purpose.

## The plugins

### video

| plugin | what it does | needs |
|---|---|---|
| [`kiso-film`](plugins/video/kiso-film) | One sentence in, a film out. v0 is the writing chain: brief, screenplay, characters, shot list, prompts | `ffmpeg` for one skill; `kiso-film` when the tool lands |

The index is the directories. A category is a directory and it exists because
a plugin is in it, so a heading here is never one you can click into and find
nothing.

Until 2026-09-10 this repository carried three plugins copied from the kiso
desktop app's own `packs/`. They went back to being the app's alone; what was
worth keeping was the format, the validator and the shape.

## Installing one

In the app, 0.2.0 and later: **Settings → Integrations → Plugins → Add**.
This collection is listed there as **kiso plugins**. **Open** lists its
plugins by category, and **Install** copies the one you choose. Pasting this
repository's URL into the box opens the same list.

One plugin installs straight from its URL, with its path after `#`:

```
https://github.com/vincemakes/kiso-plugins#plugins/video/kiso-film
```

The app reaches GitHub only when you press **Open** or **Clone**, and an
installed plugin changes only when you press **Check for update** on its
row. Installing from a folder still works: clone this repository and choose
`plugins/<category>/<id>`. An app older than 0.2.0 installs only that way.
[docs/plugin-format.md](docs/plugin-format.md) says exactly what the app
reads.

## Writing one

[docs/plugin-format.md](docs/plugin-format.md) documents every manifest field
as the app reads it, what installing does and never does, and the rules a
`SKILL.md` has to follow.

```bash
npm run check
```

`check` validates every plugin here by the app's own rules, proves those
checks still fire against fixtures that break them, and holds the repository
to English. A plugin that is green here installs there.

On an empty collection it says so in one line and exits 0. What it refuses is
a category with nothing in it, a plugin outside `plugins/<category>/<id>/`, or
a manifest whose `id` or `category` disagrees with the path it sits on.

## Licence

MIT — see [LICENSE](LICENSE).
