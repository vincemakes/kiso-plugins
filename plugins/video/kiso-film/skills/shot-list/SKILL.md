---
name: shot-list
description: Break a screenplay into a shot list — size, angle, move, blocking, lighting, duration and dialogue, one row per shot.
offers:
  - from: markdown
    says: "Break this into shots"
    makes: table
---

# Shot list

Reads `screenplay.md`, produces `shots.json`.

This is where a story becomes a plan a machine can execute. Every row is one
shot: what is in frame, where the camera is, what it does, how long, and which
scene it came from.

## Read the reference first

`references/cinematography.md` in this plugin holds the vocabulary — the shot
sizes, the angles, the moves and the lighting words. **Use those words
exactly.** They are a fixed set for a reason: the next skill turns each row
into a prompt, and a prompt built from words that vary run to run produces
shots that do not cut together.

## The file is a flat JSON array, and that is not a style choice

`shots.json` is drawn on the canvas as a table. The renderer accepts a
top-level JSON **array of flat objects** — it reads the keys as columns. An
object at the top level, or a value that is itself an object, does not draw as
a table: a nested value renders as the words `[object Object]`, and the person
looking at the node sees nothing they can read.

So: an array at the top level, and every value a string or a number. Where a
field is naturally a list, join it with `, ` into one string.

```json
[
  {
    "id": "1-01",
    "scene": 1,
    "size": "medium-close",
    "angle": "eye",
    "move": "static",
    "duration_s": 3,
    "subject": "Alice",
    "blocking": "Alice sits at the shelter's edge, phone face down beside her.",
    "lighting": "practical low-key",
    "dialogue": "You said you'd call.",
    "speaker": "",
    "sound": "rain on the roof, a bus two streets away",
    "from_scene": "Scene 1 — EXT. BUS SHELTER — NIGHT"
  }
]
```

Every row carries all of those keys — `speaker` and `trim_to_s` included, empty or absent when they do not apply. A key that is empty for a shot is an
empty string, not a missing key — the table's columns come from the union of
the keys, and a row missing one leaves a hole a reader has to interpret.

## Rules that matter more than the format

- **`id` is `<scene>-<nn>`**, zero-padded, in order. Later skills and later
  files are named from it, so it has to be stable and sortable.
- **Change something at every cut.** Two consecutive rows with the same
  `size`, `angle` and `subject` are one shot written twice.
- **`static` is the default move.** A move earns its place by doing something
  a cut cannot. If most rows have a move, most rows are wrong.
- **One move per shot**, and say the speed in the move where it matters:
  `slow push-in`, not `push-in` when the pace is the point.
- **`lighting` is one word, or two where two sources are the truth.** A phone
  torch in an unlit room is `practical low-key` — the lamp is in the frame and
  the room is shadow, and picking one of those loses half the shot. Two is the
  limit; three is a description, not a vocabulary. Name the source itself in
  `blocking`, where a prompt can find it.
- **`duration_s` is what the shot needs**, floored by what can be read — the
  reference's last section gives those floors, and the paragraph after them
  gives the other kind.

  **A generated clip has a floor as well as a ceiling, and the floor binds more
  often.** Where a shot is shorter than the model's minimum, it is not split:
  it is **generated at the model's floor and trimmed in the cut**, and the row
  says so in `trim_to_s` — the length the film should use, with `duration_s`
  the length the generation is asked for.

  ```json
  { "id": "2-02", "duration_s": 3, "trim_to_s": 2 }
  ```

  `kiso-film compose` reads `trim_to_s` from the cut, so a row that says it is
  a row the film obeys. Leave it out when it equals `duration_s`.

  **Never invent the floor.** It is a fact about a model, not a rule of
  film-making. When the tool is installed, `kiso-film models` prints it and
  that is the number to use. When it is not, ask the person which model they
  will generate with, or leave `duration_s` as the shot needs and say in one
  line that the floor is unknown — a duration shortened to a guessed minimum is
  a cut made by nobody.
- **`blocking` is what a camera sees.** Where people are and what they do.
  Not what they feel.
- **`dialogue` is the line as it is spoken**, or an empty string. Do not
  paraphrase it: the same words appear in the screenplay and a person will
  compare them.
- **`speaker` is who says it, and is empty when that is the shot's own
  `subject`.** A line from off screen — a voice through a door, someone behind
  the camera — is the case this exists for, and it is usually the most
  important line in the scene. The canvas draws this file as a table, and a
  reader of a table attributes a line to the subject beside it unless something
  says otherwise.
- **Cover the whole screenplay.** Every scene has at least one row; a scene
  with no row is a scene that will not exist in the film.

## Then

```
emit_artifact(path="shots.json", type="table",
              facts=["<n> shots", "<n> scenes", "<total>s total"],
              from=["screenplay.md"])
```

Facts are mechanical — counts and a total. The total is the sum of
`duration_s`, and it is worth stating because it is the first place the film's
real length becomes visible, and it is often not the length the brief asked
for. If it is not, say so in the thread in one sentence rather than silently
trimming: the length is the person's decision, not yours.
