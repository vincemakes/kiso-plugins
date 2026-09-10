---
name: assets
description: Produce or collect the images and audio each shot needs.
offers:
  - from: table
    says: "Make the assets these shots need"
    makes: image
---

# Assets

Third stage. Reads `storyboard.csv`, produces one file per asset under
`assets/`.

## What to make

One asset per shot that needs one, named for the shot so the cut stage can
find it without a lookup table: `assets/shot-01.png`, `assets/shot-01.wav`.

If a shot can be filmed or already exists as footage the user dropped in, say
so and skip it — generating a replacement for something the user already has
is waste, and it looks like progress.

## Before you generate anything

**Say what you are about to generate and what it will cost**, then let the user
answer. Image and audio generation is the expensive stage; a wrong read of the
brief is cheapest to catch here.

## Then

Emit each asset separately, so the canvas shows the fan-out:

```
emit_artifact(path="assets/shot-01.png", type="image",
              facts=["1080x1920"], from=["storyboard.csv"])
```

Mechanical facts only — dimensions, duration, format. Never "on brief".
