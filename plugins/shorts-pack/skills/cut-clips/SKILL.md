---
name: cut-clips
description: Cut vertical shorts from a source recording and a moments table with ffmpeg.
offers:
  - from: table
    says: "Cut the clips these rows describe"
    makes: video
---

# Cut the clips

Reads the source file and `moments.csv`, produces one file per clip — the last
node of `source → transcript → moments → clips`.

## Before you start

```bash
command -v ffmpeg || echo MISSING
```

`MISSING` → tell the user (`brew install ffmpeg`) and stop. Do not attempt a
cut without it.

## Do it

One clip per row, cutting on the row's own timestamps:

```bash
mkdir -p clips
ffmpeg -nostdin -y -ss <start> -to <end> -i "<source>" \
  -vf "crop=ih*9/16:ih,scale=1080:1920:flags=lanczos" \
  -c:v libx264 -preset veryfast -crf 20 -c:a aac -b:a 128k \
  "clips/clip-01.mp4"
```

- `-ss` **before** `-i` seeks fast; the re-encode is what makes the cut frame
  accurate, so do not add `-c copy`.
- The crop takes the centre 9:16. If the speaker is off centre, say so and ask
  before guessing an offset — you cannot see the frame.
- Audio-only source: drop the `-vf` and `-c:v` flags and produce `.m4a`.

Check each one rather than assuming:

```bash
ffprobe -v error -show_entries format=duration -of csv=p=0 "clips/clip-01.mp4"
```

## Then

Emit each clip separately, so the canvas shows one node per clip:

```
emit_artifact(path="clips/clip-01.mp4", type="video",
              facts=["00:27", "1080x1920"], from=["moments.csv"])
```

`from` is `moments.csv` — that is what you cut from, and the graph is only
worth looking at if the edges are true.

## When the user asks for a change

"The first two seconds are slow" means re-cut that one clip with a later
`start` and emit **the same path again** — that records a new version rather
than a second artifact.
