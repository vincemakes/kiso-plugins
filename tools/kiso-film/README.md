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
| `kiso-film compose <cut.json> --out <film.mp4> [--dry-run]` | Join the clips a cut names, with fades and trims, under one audio track |
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

## The first real call

Nothing in this repository has ever called a provider. Every model and every
route is marked unverified because of that, and the only thing that changes it
is a real call. This is that call: **one image, through APImart, with
`gpt-image-2`.** No video, and no other model.

**You hold the key. Nothing here should ever see it.**

**1. Build the tool.**

```bash
npm ci --prefix tools/kiso-film && npm run build --prefix tools/kiso-film
```

**2. Put your key in your own shell.** Type it; do not paste it into a file,
and do not put it in the command you are about to run — a key in a command
line is a key in your shell history.

```bash
export APIMART_API_KEY=…
```

**3. Check the tool can see it.**

```bash
node tools/kiso-film/build/src/cli.js models --kind image
```

`gpt-image-2` should have lost its `·`, which is the mark for "no key for this
provider". It keeps its `?`: that means unverified, and it is still true —
a key being present says nothing about whether the route is right.

**4. Make the call.**

```bash
node tools/kiso-film/build/src/cli.js image \
  --model gpt-image-2 \
  --prompt "a bus shelter at night, rain, one working streetlamp" \
  --out /tmp/first.png
```

Before it sends, it will print:

> the route to APImart is unverified — it has not been checked against a real
> call. If this fails oddly, `data/providers.json` is the first place to look.

That line is what this whole arrangement is for. It is accurate until the
moment this call succeeds.

**If it works**, `/tmp/first.png` is an image and the path is printed.

**If it fails**, the route is the first place to look, and the message will
usually say so itself. The likely ones:

| what you see | what it means |
|---|---|
| *does not know where it put the file* | the answer came back in a shape `data/providers.json` does not name. The message lists the paths it tried; the answer's real shape is one line away |
| *answered with text where a file should be* | the URL pointed at something that is not the image — often an error body |
| *An empty file is not a result* | the URL answered, with nothing. Usually a slot the file has not reached yet |
| *reported the state "…", which this route does not know* | the job is being polled and its state word is not in the route's list |

All four are edits to `data/providers.json`, not to code. That is deliberate:
the part most likely to be wrong is the part that is data.

**5. Afterwards, flip `verified` by hand.**

There is no command for this, on purpose. `verified` moves **one entry at a
time**, and only on one of two grounds: a real call that worked, or a person
reading that entry against the provider's own documentation.

- `data/providers.json` — set `"verified": true` on the `apimart` route.
- `data/models.json` — set `"verified": true` on `gpt-image-2`.

Commit them together, and **name the call in the message**: what was asked
for, what came back, and what it cost. A `verified` flag whose commit does not
say which call earned it is a flag nobody can check later.

Nothing else becomes verified. `fal`, `byteplus`, and the other twenty-two
entries have still never been called.

## The cut

`cut.json` is a running order:

```json
{
  "clips": [
    "1-01.mp4",
    { "path": "2-02.mp4", "trimToSeconds": 2 },
    { "path": "2-03.mp4", "fadeInSeconds": 0.5 }
  ],
  "audio": "score.wav",
  "audioFadeOutSeconds": 2
}
```

**`trimToSeconds` is the length the film uses.** Most video models will not
generate a clip below a floor of a few seconds, and a short insert is exactly
the shot a film wants shortest — so the shot list asks for the floor and
records what the cut should use, and this is where that second number is
obeyed. A trim longer than the clip loses to the clip.

**A trim that does not shorten is not a trim.** The shot list writes one on
every row so its column is numeric and sums to the film's length, so most cuts
declare a trim on every clip and cut nothing. Only a trim shorter than the clip
— by more than a frame — sends the cut down the re-encoding path.

A cut with fades or trims is re-encoded and needs `ffprobe` for the clips' real
lengths; a cut with neither is joined without re-encoding.

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
npm test          # builds, then runs the suite — 96 tests, no real call
npm pack          # the tarball, which is what `npm i -g` installs
```

Publishing is the maintainer's act and happens by hand.
