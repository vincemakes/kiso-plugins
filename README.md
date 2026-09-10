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
plugins/short-drama/
  kiso-plugin.json
  icon.svg
  README.md
  skills/script/SKILL.md
  skills/storyboard/SKILL.md
  skills/assets/SKILL.md
  skills/cut/SKILL.md
```

**A plugin is declarative. It ships no code and nothing in it ever runs in the
app's processes.** A skill is a recipe written for the agent to read; the
manifest names the command-line tools the recipes call and the secrets they
need, by name only. Installing is a validated file copy: it starts no server,
grants no command, and executes nothing, at install time or ever.

That is the whole trust boundary, and it is small on purpose.

## The plugins

| id | what it does | needs |
|---|---|---|
| [`fix-and-prove`](plugins/fix-and-prove) | Fix something in a repository and leave the proof beside it: the diff, the test run, the screenshot | `git`, `npm` |
| [`short-drama`](plugins/short-drama) | Four stages from a one-line brief: script, storyboard, assets, cut | `ffmpeg`, `ffprobe` |
| [`shorts-pack`](plugins/shorts-pack) | Cut a long recording into vertical shorts | a `whisper`, `ffmpeg`, `ffprobe` |

These three are official plugins, maintained here. Community plugins are
welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

**This repository is the source of truth for them.** The desktop app keeps its
own copy under `packs/` for its proof suite; that copy follows this one.

## Installing one

Clone this repository, then in the app: **Settings → Integrations → Plugins →
Add**, from a folder, and choose `plugins/<id>`.

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

## Licence

MIT — see [LICENSE](LICENSE).
