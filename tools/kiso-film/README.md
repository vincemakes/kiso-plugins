# @vincemakes/kiso-film

The command-line tool the [`kiso-film`](../../plugins/video/kiso-film) plugin
declares. Install it globally; the plugin's skills call it by name.

```bash
npm i -g @vincemakes/kiso-film
```

**Exactly one file in this package reaches the network**, and a test keeps it
that way. `models`, `config`, `estimate` and `compose` work on files you
already have; `image` and `video` generate, and everything they send goes
through `src/net/http.ts` and nowhere else.

## Commands

| command | what it does |
|---|---|
| `kiso-film models [--json] [--kind video\|image] [--reachable]` | What the table knows, and which models a key is present for |
| `kiso-film config [--dir <path>] [--set field=value ...]` | Read or write the project's `film.config.json` |
| `kiso-film estimate <shots.json>` | Price a shot list from the table, before anything is spent |
| `kiso-film compose <cut.json> --out <film.mp4> [--dry-run]` | Join the clips a cut names, with fades, under one audio track |
| `kiso-film image --prompt <text> --out <file.png> [--ref <file> ...]` | Generate a still |
| `kiso-film video --prompt <text> --out <file.mp4> --duration <s> [--start <f>] [--end <f>] [--motion-ref <f>]` | Generate a clip |

`--motion-ref` is refused, before anything is sent, when the table says the
model does not take one — and the refusal names the models that do. A model
given a reference it cannot use either ignores it, and you pay for a shot that
did not do what you asked, or fails with the provider's own error, which says
nothing about why.

`--dry-run` prints the request body that would be sent and sends nothing.

Exit codes, because a skill reads them: `0` worked, `1` bad input, `2` a
required environment variable is not set, `3` a declared command is missing,
`4` not built yet.

## Two things are unverified, and both say so everywhere

**The model table** and **the provider routes**. A route is where a job is
submitted, what its states are called, and where the finished file's URL sits;
it lives in `data/providers.json` as data, for the same reason the table does
— it is the part most likely to be wrong, and a wrong one should be an edit
rather than a release.

`kiso-film models` names any unverified route beside the unverified prices,
and `image` and `video` say so on the way past.

What the test suite proves is that **the driver does what the descriptor
says** — submit, poll, tell a failure from a delay, give up at a deadline, put
the bytes where you asked. What it cannot prove is that **the descriptor
matches the provider**: the fake server it runs against was written here, and
a fake cannot disconfirm a belief about somebody else's API. Only a real call
does that, and a real call costs money and is yours to make.

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
file, printed, or logged.** `film.config.json` refuses a field whose name
looks like a credential, and a missing key is exit 2 carrying the variable's
name and nothing else.

A key is read in exactly two places, and a test names both: one asks whether
the variable is *set*, for the reachable marker, and never reads the value;
the other reads it once, registers it for redaction on the next line, and puts
it in a header. It is never in a URL, because URLs reach logs and proxies.

A canary key is set in the environment for every command in the suite,
including the failure paths, and neither output stream may contain it.

## ffmpeg

`compose` needs `ffmpeg` on the machine. It is checked for, and its absence is
exit 3 and a sentence naming what to install. Nothing is ever fetched.

## Development

```bash
npm install
npm test          # builds, then runs the suite — 71 tests, no real call
npm pack          # the tarball, which is what `npm i -g` installs
```

Publishing is the maintainer's act and happens by hand.
