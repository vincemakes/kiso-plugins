# Contributing

A plugin here is a folder with a manifest and some skills. It ships no code,
and nothing in it ever runs in the app's processes — read
[docs/plugin-format.md](docs/plugin-format.md) before you start, because that
boundary is what keeps installing one cheap and safe.

## One directory, one pull request

A pull request touches **one** `plugins/<id>/` directory. Not two, not a
directory plus a refactor of the validator.

The reason is review: a plugin is judged on whether its recipes are any good
and whether its declarations are honest, and both of those are read whole. Two
plugins in one pull request get half the reading each.

Repository-level changes — the validator, the gate, the documents — are their
own pull request, and they touch no plugin.

## The checklist

Before you open it:

- [ ] `npm run check` is green. It runs the same manifest rules the app runs,
      proves those rules still fire against fixtures that break them, and
      holds the repository to English.
- [ ] The directory name equals the manifest's `id`. The app skips a plugin
      where they differ, silently.
- [ ] `"host": "kiso-app"` is in the manifest.
- [ ] There is a `description` on the plugin and on **every** skill. A skill
      without one installs and is listed as broken.
- [ ] `commands` are bare executable names — `ffmpeg`, never `/usr/bin/ffmpeg`
      and never `ffmpeg -y`.
- [ ] `secrets` are names only. **No values, ever.** If you have pasted a key
      into a file to test something, it is in your git history now: start a
      new branch from a clean tree rather than deleting the line.
- [ ] Every skill your manifest names has a `skills/<name>/SKILL.md`, and
      nothing in the directory is a symbolic link.
- [ ] A skill that needs a binary **checks for it and says what to install**
      when it is missing, and stops. It never downloads one.
- [ ] `plugins/<id>/README.md` says what the plugin does, what it needs, and
      what it produces.
- [ ] Nothing in the directory is private. This repository is public: no
      absolute paths from your machine, no account names, no internal URLs, no
      sample data you would not publish.

## Commits

Conventional commits, with the plugin id as the scope:

```
feat(short-drama): a fifth stage that renders subtitles
fix(shorts-pack): transcribe stops when no whisper is installed
docs(fix-and-prove): say which test runners the recipe knows
```

For repository-level changes the scope is the area — `chore(repo)`,
`docs(format)`, `feat(validate)`.

Write the subject in the imperative, and use a body to say **why**. English,
everywhere except `README.zh.md`.

## What gets a plugin turned down

- **Code.** A manifest declaring `extension` or `extensions` is refused by the
  app itself. So is a plugin that ships a binary and asks a skill to run it
  from inside its own directory: declare the tool and let a person grant it.
- **A recipe that installs things.** Check, report, stop. A skill that runs a
  package manager is doing something the person did not agree to.
- **Secrets in files.** See above.
- **A description that does not describe.** It is the one sentence a person
  reads before installing.
- **Skills that only wrap a single shell command.** A plugin earns its row by
  teaching a shape of work, not by aliasing a binary.
