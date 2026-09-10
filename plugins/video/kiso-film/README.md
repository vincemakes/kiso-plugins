# kiso film

One sentence in, a film out — and every part of it is a thing on the canvas
you can take hold of and change.

```
brief.md → screenplay.md → characters/*.md
                        → shots.json → prompts.md
```

Each stage is a separate skill reading what the last one wrote, so you can
stop after any of them, look at what it made, edit it by hand, and carry on.
The screenplay is the last place where changing something is cheap, and the
skill stops there and asks.

**This is v0: the writing chain.** The frames, the clips and the cut come with
the command-line tool, which is the next thing to land. What is here today
takes an idea to the point where every shot has a prompt written for it.

## Skills

| skill | reads | makes |
|---|---|---|
| `brief` | one sentence | `brief.md` — premise, genre, tone, protagonist, conflict, length |
| `screenplay` | `brief.md` | `screenplay.md` — scenes, dialogue, and a continuity bible |
| `characters` | `screenplay.md` | `characters/<name>.md`, one sheet per character |
| `shot-list` | `screenplay.md` | `shots.json` — one row per shot |
| `shot-prompts` | `shots.json` and the sheets | `prompts.md` — a first-frame prompt and a clip prompt per shot |
| `drama` | — | nothing. A genre skill: it changes how the three above decide |
| `film-study` | a reference clip you have | `study/<name>.json` — that clip's camera language, as a shot list |

`references/cinematography.md` holds the vocabulary the shot skills use — shot
sizes, angles, moves, lighting. It is a fixed set on purpose: the prompts are
built from those words, and words that vary between runs produce shots that do
not cut together.

## Needs

| command | for | if it is missing |
|---|---|---|
| `kiso-film` | the frames, the clips, the cut | `npm i -g @vincemakes/kiso-film` — **not published yet**; nothing in v0 calls it |
| `ffmpeg`, `ffprobe` | `film-study` only, on a file you already have | `brew install ffmpeg` on macOS |

All three are declared in the manifest and granted per project by a person.
Declaring is not granting, and a missing one is reported with its install hint
rather than fetched.

**No secrets in v0.** Nothing here calls a provider: the writing chain is the
agent's own work, and `film-study` reads frames with ffmpeg. The provider keys
arrive with the tool, declared by name, entered once per project, and kept in
the OS keychain.

## What it will not do

- **Download a film.** `film-study` reads a file you already have. If you name
  a title, it will ask you for a file.
- **Copy someone's work.** `film-study` writes a shot list — sizes, angles,
  moves, lighting, and why a shot works where it is. It does not transcribe
  dialogue or reproduce the film.
- **Name a living artist or a studio as a style.** The prompts describe the
  look — the lens, the palette, the era of the lighting — instead.
- **Write an appearance prompt for a child character**, or for a real person's
  likeness. Where a shot needs one, the skill says so and says why.
