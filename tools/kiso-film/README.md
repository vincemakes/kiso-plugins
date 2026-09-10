# @vincemakes/kiso-film

The command-line tool the [`kiso-film`](../../plugins/video/kiso-film) plugin
declares. Install it globally; the plugin's skills call it by name.

```bash
npm i -g @vincemakes/kiso-film
```

**This half of the tool makes no network call.** The model table, the project
config, the price estimate and the final cut all work on files you already
have. Generating images and clips arrives with the provider clients, and until
then `kiso-film image` and `kiso-film video` say so and exit 4.

## Commands

| command | what it does |
|---|---|
| `kiso-film models [--json] [--kind video\|image] [--reachable]` | What the table knows, and which models a key is present for |
| `kiso-film config [--dir <path>] [--set field=value ...]` | Read or write the project's `film.config.json` |
| `kiso-film estimate <shots.json>` | Price a shot list from the table, before anything is spent |
| `kiso-film compose <cut.json> --out <film.mp4> [--dry-run]` | Join the clips a cut names, with fades, under one audio track |

Exit codes, because a skill reads them: `0` worked, `1` bad input, `2` a
required environment variable is not set, `3` a declared command is missing,
`4` not built yet.

## The model table is unverified, and says so everywhere

`data/models.json` carries facts about twenty-two third-party image and video
models — what each can do, what its route calls things, and what it costs.
Every entry has `verified: false`, and nothing changes that until a real call
or a person's reading against the provider's own documentation does.

A schema test proves the table is well **formed**. It cannot prove it is
**right**: a price out by a factor of ten, or a capability flag set the wrong
way, validates perfectly. So `kiso-film models` marks every unverified row
with `?`, and `estimate` prints a paragraph saying the total is an order of
magnitude rather than a quote.

## Keys

Keys arrive in the environment and nowhere else — the host injects a declared
secret into this process, from the OS keychain. **No key is ever written to a
file, printed, or logged**, and `film.config.json` refuses a field whose name
looks like a credential.

This half of the tool reads no key at all. It reads the *names* of the
variables, so `kiso-film models` can say which models a key is present for and
which variable it would need.

## ffmpeg

`compose` needs `ffmpeg` on the machine. It is checked for, and its absence is
exit 3 and a sentence naming what to install. Nothing is ever fetched.

## Development

```bash
npm install
npm test          # builds, then runs the suite — 47 tests, no network
npm pack          # the tarball, which is what `npm i -g` installs
```

Publishing is the maintainer's act and happens by hand.
