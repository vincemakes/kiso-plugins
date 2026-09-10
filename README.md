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

**None yet.** The collection is open, and the first is on its way:
`plugins/video/kiso-film`.

Until 2026-09-10 this repository carried three plugins copied from the kiso
desktop app's own `packs/`. They went back to being the app's alone; what was
worth keeping was the format, the validator and the shape.

## Installing one

Clone this repository, then in the app: **Settings → Integrations → Plugins →
Add**, from a folder, and choose `plugins/<category>/<id>`.

Installing the repository by its git URL does not work yet: the app's git
install expects a manifest at the root of the clone, and a collection has
none. [docs/plugin-format.md](docs/plugin-format.md) says what would close
that gap.

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
