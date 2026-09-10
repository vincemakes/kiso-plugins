---
name: script
description: Write a short-drama episode script from a one-line brief.
offers:
  - from: markdown
    says: "Write an episode script from this brief"
    makes: markdown
---

# Script

The first stage of `script → storyboard → assets → cut`. Produces
`script.md`.

## Plan the whole graph first

Before writing anything, declare the four nodes so the person can see the
pipeline they are getting:

```
plan_artifacts(nodes=[
  {"path": "script.md",          "type": "markdown", "from": []},
  {"path": "storyboard.csv",     "type": "table",    "from": ["script.md"]},
  {"path": "assets/shot-01.png", "type": "image",    "from": ["storyboard.csv"]},
  {"path": "assets/shot-01.wav", "type": "audio",    "from": ["storyboard.csv"]},
  {"path": "episode.mp4",        "type": "video",    "from": ["storyboard.csv", "assets/shot-01.png"]}
])
```

These are the paths the later stages actually emit — `storyboard.csv`, not a
markdown storyboard; `episode.mp4`, not `final.mp4`. A plan that names a path
no stage produces leaves an outline nobody will ever fill, and *promised and
not delivered* is exactly what the canvas will show.

Do this even before the questions below: a plan is free, and a person who can
see the shape asks better questions about it. **Re-plan once the shot count is
known** — one `assets/shot-NN.png` and one `assets/shot-NN.wav` per shot — and
the newest plan replaces the previous one, with anything already emitted
staying. Until then one shot stands for the set.

## Ask before you write, but only once

A one-line brief leaves three things open, and getting them wrong wastes the
three stages after this one. Ask them **together, in one message**, and only
the ones the brief did not already answer:

- how long (60s / 90s / 3min);
- where it plays (vertical short, or a wide cut);
- the ending — does it land, or hook a next episode?

A question costs seconds. Guessing costs the whole pipeline.

## The shape

```markdown
# <working title>

**Logline.** One sentence: who wants what, and what is in the way.

## Beat 1 — <name> (0:00–0:12)
What happens. What changes by the end of it.

### Dialogue
> A: line
> B: line
```

Rules that matter more than style:

- **every beat changes something.** A beat where nothing changes is a beat to
  cut, however good the line is.
- open in the middle of the situation. A vertical short has no room for a
  runway.
- **name every character on first use** and keep the names stable — the
  storyboard and asset stages key off them.

## Then

```
emit_artifact(path="script.md", type="markdown",
              facts=["<n> beats", "<target length>"])
```

No `from` — this is the root of the graph.
