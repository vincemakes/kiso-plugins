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

## Consistency comes from copying — but only about what is in frame

The generations are separate calls with no memory of each other, so the only
thing holding a face the same across twelve shots is that the same words were
sent. That is why the words are copied rather than summarised.

**What is copied depends on what the camera can see.** There are three cases
and they are not a matter of taste:

**1. The character's face or body is in frame.** Paste that character's
**appearance paragraph verbatim** from their sheet. Not a summary, not "Alice
as before" — the paragraph, every time.

**2. An insert: only a part of them is in frame** — a hand on a door, a sleeve
at the edge, a shoulder from behind. Paste **only the sentence about that
part**, verbatim from the sheet, and nothing else about them.

> Her hands are broad and short-nailed, with a dark line of graphite under the
> right thumbnail.

That one sentence does the whole job, because the hand is the only thing being
held consistent. **The full paragraph here is worse than useless: it is
wrong.** A model told about a scar through the left eyebrow while being asked
for a photograph of a phone screen may put a face in the frame — and if it does
not, you have paid for a hundred words of instruction about things outside the
picture, in every insert, in every shot list.

**3. The character is not in the shot at all.** Say nothing about them. Not
their name, not their clothes, not "Alice's flat". The frame is what the prompt
describes.

The same rule applies to a place: the screenplay's continuity entry for it,
copied — when the place is what the shot is of.

**The sheets have to support this**, which is a requirement on `characters`
and not on you: an appearance sheet carries one sentence per part that a camera
can isolate — hands, the jacket, the shoes — so an insert has something exact
to quote. If the sentence you need is not there, quote the nearest thing that
is and say in one line under the prompt that the sheet has no sentence for that
part. Do not write one: a detail invented here and pasted twelve times is a
detail the sheet does not know about.

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
- **Everything in the prompt is in the frame.** Read the finished prompt and
  ask of each sentence: could the camera see this? A sentence that fails is a
  sentence the model will try to satisfy anyway.
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
that is not padding. A sheet quoted for one sentence counts: the sentence came
from it, and changing it makes this file stale. Those paragraphs are in this file verbatim; if a person
changes Alice's sheet, this file is stale, and the graph is what tells them
so. A sheet that no prompt quoted is not listed.

The rule is the tool's own: say what you actually worked from. It cuts both
ways — do not list a file you merely opened, and do not leave out a file whose
words you copied.
