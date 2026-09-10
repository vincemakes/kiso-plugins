# Short drama

Four stages from a one-line brief, each reading what the last one wrote:

```
brief → script.md → storyboard.csv → assets/ → episode.mp4
```

Each stage is a separate skill, so you can stop after any of them, look at
what it made, change it by hand, and carry on. The storyboard is a CSV
because a shot list is a table and a person should be able to edit it in one.

## Skills

| skill | reads | makes |
|---|---|---|
| `script` | a one-line brief | `script.md` |
| `storyboard` | `script.md` | `storyboard.csv` — a shot list with framing notes |
| `assets` | `storyboard.csv` | one file per asset under `assets/` |
| `cut` | `storyboard.csv` and `assets/` | `episode.mp4` |

## Needs

`ffmpeg` and `ffprobe` for the last stage. The recipe checks for them and
stops with `brew install ffmpeg` if they are missing — it never installs
anything itself. The first three stages need no binary.

The `assets` stage is the one that costs money: it generates images and audio.
It is written to say what it is about to generate, and what that will cost,
and then wait for you — a wrong read of the brief is cheapest to catch there.
It also skips any shot you already have footage for, rather than generating a
replacement for something you own.
