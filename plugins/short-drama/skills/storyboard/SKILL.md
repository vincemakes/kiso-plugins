---
name: storyboard
description: Turn a script into a shot list with framing notes.
offers:
  - from: markdown
    says: "Turn this script into a shot list"
    makes: table
---

# Storyboard

Second stage. Reads `script.md`, produces `storyboard.csv`.

## The output

One row per shot. A shot is one camera setup — if the camera moves to a new
position, it is a new row.

```csv
shot,beat,duration,framing,subject,action,audio
1,1,3s,"wide","kitchen, morning","she puts the phone down","room tone"
2,1,2s,"close","her hands","the screen lights up again","buzz"
```

- `duration` in seconds, and **the sum must match the script's target length**.
  If it does not, say so with both numbers rather than quietly rounding.
- `framing` from a fixed vocabulary: `wide` / `medium` / `close` / `insert` /
  `over-shoulder`. A vocabulary the asset stage can act on beats a description
  it has to interpret.
- `subject` names a character from the script, spelled the same way.

## Then

```
emit_artifact(path="storyboard.csv", type="table",
              facts=["<n> shots", "<total>s"], from=["script.md"])
```
