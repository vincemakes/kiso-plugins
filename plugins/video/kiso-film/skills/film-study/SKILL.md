---
name: film-study
description: Read a reference clip shot by shot and write out its camera language as a shot list you can borrow from.
---

# Film study

A reference clip in, a shot list with its camera language out. Produces
`study/<name>.json` and, where it helps, `study/<name>-frames.png`.

Someone who wants a scene "like the one in that film" can now point at the
clip. This reads it and says, in the same vocabulary the rest of this plugin
uses, what it actually does — so the answer to "like that" is a shot list
rather than an adjective.

## What this skill may run, and what it may not

`ffprobe` and `ffmpeg`, both declared in this plugin's manifest, on a file the
person already has. That is all.

- **Check first, and stop if they are missing.** `command -v ffmpeg || echo
  MISSING`. On `MISSING`, tell the person what to install (`brew install
  ffmpeg` on macOS) and stop. Never fetch a binary.
- **It downloads nothing.** If the person names a film rather than a file,
  ask them for a file they have. Do not fetch a clip from anywhere, and do not
  suggest how they might obtain one.
- **It calls no model of its own.** Looking at the extracted frames is the
  agent's own reading, through the App. There is no provider call here — this
  skill costs nothing but time.

## What it studies, and what it does not

It reads **craft**: where the cuts are, how long shots run, what size and
angle and move each one is, how it is lit. That is the grammar of the medium,
and describing it is how every film school in the world teaches.

It does not reproduce the work. It writes no transcript of the dialogue, does
not summarise the plot beyond one line of context per shot, and the frames it
extracts are working material for this reading, not an artifact to publish. If
what the person actually wants is a copy of somebody's film, say plainly that
this makes a shot list and not a copy.

## How

**1. Find the cuts.** ffmpeg's scene detection gives the boundaries:

```
ffprobe -v error -show_entries format=duration -of csv=p=0 <file>
ffmpeg -i <file> -vf "select='gt(scene,0.3)',showinfo" -vsync vfr -f null - 2>&1
```

The `showinfo` lines carry `pts_time` — those are the cut points. A threshold
of `0.3` is a starting point: a clip cut on movement needs it lower, one with
a lot of camera motion needs it higher. If the count is obviously wrong — two
shots found in a two-minute clip — say the threshold you used and try another
rather than reporting the number as a fact.

**2. Take one frame per shot**, a little after each cut so the frame is not a
dissolve:

```
ffmpeg -ss <pts_time + 0.3> -i <file> -frames:v 1 study/<name>/shot-<nn>.png
```

**3. Read each frame** against `references/cinematography.md` and write the
row. Judge the move from the first and last frames of the shot, taking a
second frame just before the next cut where the move is not obvious from one.

**4. A contact sheet**, where there are enough shots that a person would want
to see them together:

```
ffmpeg -i study/<name>/shot-%02d.png -filter_complex "tile=4x3" study/<name>-frames.png
```

## The output

The same flat JSON array shape as `shots.json`, so a row can be lifted
straight into a film's own shot list, with three extra columns:

```json
[
  {
    "id": "01",
    "start_s": 0.0,
    "duration_s": 2.4,
    "size": "extreme-close",
    "angle": "eye",
    "move": "static",
    "lighting": "low-key",
    "subject": "a hand on a door handle",
    "note": "holds two beats longer than the cut rhythm before it"
  }
]
```

Flat, and every value a string or a number — the canvas draws this as a table
and a nested value renders as `[object Object]`.

The `note` column is the point of the whole skill. A size and an angle can be
copied; **why the shot works where it is** is what a person is actually asking
for when they point at a clip.

## Then

```
plan_artifacts(nodes=[
  {"path": "study/<name>.json",        "type": "table", "from": []},
  {"path": "study/<name>-frames.png",  "type": "image", "from": ["study/<name>.json"]}
])
emit_artifact(path="study/<name>.json", type="table",
              facts=["<n> shots", "<duration>s", "scene threshold 0.3"])
```

Say the threshold in the facts. It is the one number in this reading that was
chosen rather than measured, and a later reader deserves to know which.

If the contact sheet was not worth making, withdraw it rather than leaving the
promise standing:

```
withdraw_artifact(path="study/<name>-frames.png")
```
