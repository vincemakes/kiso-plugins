---
name: find-moments
description: Pick the candidate moments worth cutting from a timestamped transcript.
offers:
  - from: markdown
    says: "Find the moments worth cutting"
    makes: table
---

# Find the moments

Reads `transcript.md`, produces `moments.csv` — the second node of
`source → transcript → moments → clips`.

## What a moment is

A span that stands on its own with no setup: a claim, a story with a punchline,
a number that surprises, a disagreement. **Not** a topic and not a summary — a
short needs a beginning and an end that a stranger can follow cold.

## The output

One row per candidate, and nothing else in the file:

```csv
start,end,hook,why
00:04:11,00:04:38,"setup breath to punchline","the only place he says the number out loud"
00:09:52,00:10:29,"\"nobody warns you about\"","complete thought, no callback needed"
```

- `start` / `end` are `HH:MM:SS` taken from the transcript, not estimated.
- Aim for 20–45 seconds. Shorter than 15 rarely lands; longer than 60 is a
  different format.
- Pick more than the user asked for — they will cut some — but never pad with
  spans you would not defend.

## Then

```
plan_artifacts(nodes=[
  {"path": "transcript.md", "type": "markdown"},
  {"path": "moments.csv",   "type": "table", "from": ["transcript.md"]},
  {"path": "clips/clip-01.mp4", "type": "video", "from": ["moments.csv"]}
  # ...one node per row you kept
])
```

Re-plan with the real clip count now that the rows are counted — this is the
stage that knows it, and the previous plan's single placeholder clip is
replaced. Anything already emitted stays.

Then emit the table itself:

```
emit_artifact(path="moments.csv", type="table",
              facts=["<n> rows"], from=["transcript.md"])
```

Do not score them. A `why` in the user's language is worth more than a number,
and an unsourced rating is exactly what this product does not do.
