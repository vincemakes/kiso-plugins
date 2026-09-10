---
name: transcribe
description: Turn an audio or video file into a timestamped transcript with whisper.
offers:
  - from: video
    says: "Transcribe this into a timestamped transcript"
    makes: markdown
  - from: audio
    says: "Transcribe this into a timestamped transcript"
    makes: markdown
---

# Transcribe a recording

Produces `transcript.md` — the first node of the graph
`source → transcript → moments → clips`.

## Plan the whole graph first

This is the first stage, so declare the shape before doing any of it. The
person then sees what is coming instead of waiting for the first result, and
every later stage fills a node that is already on the canvas.

```
plan_artifacts(nodes=[
  {"path": "transcript.md", "type": "markdown", "from": ["<the dropped file's workspace path>"]},
  {"path": "moments.csv",   "type": "table",    "from": ["transcript.md"]},
  {"path": "clips/clip-01.mp4", "type": "video", "from": ["moments.csv"]}
])
```

`transcript.md` and `moments.csv` are exactly what the next two stages emit.
The clip count is **not knowable yet** — it comes out of `moments.csv`, which
does not exist — so plan one clip as a placeholder and **re-plan from
`find-moments` once the rows are counted**, one `clips/clip-NN.mp4` per row. A
re-plan replaces the previous plan and anything already emitted stays, so
correcting the count costs nothing and leaves no phantom.

## Before you start

This needs `whisper` on the machine. Check, and if it is missing **say so and
stop** rather than working around it:

```bash
command -v mlx_whisper || command -v whisper-cli || command -v whisper || echo MISSING
```

- `MISSING` → tell the user which one to install and what it is for. On Apple
  silicon `pip install mlx-whisper` is the fast one; `brew install
  whisper-cpp` gives `whisper-cli`. Do not try to transcribe without it and do
  not substitute a guess.

## Do it

Work from the file the user dropped in — its workspace path is in the
attachment marker on their message.

```bash
# Apple silicon (fastest)
mlx_whisper "<input>" --output-dir . --output-format srt --word-timestamps True

# or whisper.cpp
whisper-cli -f "<input>" -osrt -of transcript
```

Then fold the SRT into one markdown file with the timestamps kept — the
timestamps are the whole point, because everything downstream cuts on them.

```markdown
# Transcript — <file name>

**00:00:04** first line of speech
**00:00:11** the next one
```

## Then

Emit it:

```
emit_artifact(path="transcript.md", type="markdown",
              facts=["<n> words", "<duration>"],
              from=["<the dropped file's workspace path>"])
```

`facts` are mechanical only — a word count and a duration are facts, "good
transcript" is not.
