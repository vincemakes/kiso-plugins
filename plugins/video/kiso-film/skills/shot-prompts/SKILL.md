---
name: shot-prompts
description: Write a first-frame prompt and a clip prompt for every shot, model-agnostic, from the shot list and the character sheets.
offers:
  - from: table
    says: "Write the prompts for every shot"
    makes: markdown
---

# Shot prompts

Reads `shots.json` and `characters/*.md`, produces `prompts.md`.

Two prompts per shot, because they are two different jobs:

- **the first frame** — a still image. Composition, subject, wardrobe,
  lighting, lens. What the shot looks like at its first instant.
- **the clip** — what happens over the shot's seconds. Movement of the
  subject, movement of the camera, and nothing else.

## Model-agnostic, on purpose

These prompts name no model and use no model's syntax — no weights, no
negative-prompt blocks, no parameter flags. The tool that runs them adapts
them to whichever model a project chose, and a prompt written for one model's
grammar is a prompt that has to be rewritten when the project changes its
mind. Plain declarative sentences travel.

## Consistency comes from copying, not from remembering

Every shot's first-frame prompt that includes a character **pastes that
character's appearance paragraph verbatim** from their sheet. Not a summary,
not "Alice as before" — the paragraph, every time. The generations are
separate calls with no memory of each other, so the only thing holding a face
the same is that the same words were sent.

The same goes for a place: the screenplay's continuity entry for it, copied.

## The shape

````markdown
# Prompts

## 1-01 — medium-close, eye, static, 3s

**First frame**

```
<Alice's appearance paragraph, verbatim.> She sits at the edge of a bus
shelter at night, phone face down on the bench beside her. Medium-close
framing, camera at eye level. Lit by the shelter's own strip light and a
streetlamp behind, cool practical light, rain visible outside the frame's
edges. Shallow depth of field. Photographic, 9:16.
```

**Clip**

```
She does not move. Her eyes drop to the phone and back up. The camera holds
still. Rain continues outside the shelter. 3 seconds.
```
````

One section per row of `shots.json`, in `id` order, with the row's `size`,
`angle`, `move` and `duration_s` in the heading so a person can scan against
the table.

## Rules that matter more than the format

- **The first-frame prompt describes one instant.** No "then", no "as she
  turns". A still cannot show a sequence, and asking it to produces a blurred
  compromise.
- **The clip prompt describes only change.** What moves, and how the camera
  moves. Do not restate the appearance or the lighting: the first frame
  already fixed them, and repeating them invites the model to redraw them.
- **One camera move, named in the words the reference uses**, and the duration
  at the end of the clip prompt.
- **Say the format once per prompt** — `9:16` or `16:9`, from the brief.
- **No style words that name a living artist or a studio.** Describe the look
  — the lens, the stock, the palette, the era of the lighting — rather than
  borrowing a name.
- **No real person's likeness**, and no appearance prompt for a character the
  screenplay establishes as a child. Where a shot needs one, write the clip
  prompt and say in one line that the first frame is deliberately not written,
  and why. Do not work around this.
- **Write the prompts in English** even when the film is in another language,
  and keep the spoken line in its own language in `dialogue`. Image and video
  models are trained overwhelmingly on English; the dialogue is not their
  business.

## Then

```
emit_artifact(path="prompts.md", type="markdown",
              facts=["<n> shots", "<n> characters referenced"],
              from=["shots.json", "characters/alice.md", "characters/bob.md"])
```

**`from` lists the shot list AND every character sheet a prompt quotes**, and
that is not padding. Those paragraphs are in this file verbatim; if a person
changes Alice's sheet, this file is stale, and the graph is what tells them
so. A sheet that no prompt quoted is not listed.

The rule is the tool's own: say what you actually worked from. It cuts both
ways — do not list a file you merely opened, and do not leave out a file whose
words you copied.
