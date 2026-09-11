---
name: characters
description: Write one sheet per character, in the words an image model needs, from the screenplay's continuity bible.
---

# Characters

Reads `screenplay.md`, produces `characters/<name>.md` — one file per named
character.

A character sheet is not a biography. It is **the paragraph that will be
pasted into every image prompt that character appears in**, plus the few
things a performance needs. If a line on this sheet would not change a
drawing or a delivery, it does not belong on it.

## Why one file each, and not one file

Each sheet is its own artifact with its own `from` edge, so the canvas shows
the fan-out from the screenplay and a person can point at one character and
change them. One combined file would be one node, and changing Bob would
re-emit Alice.

## The shape

```markdown
# Alice

## Appearance
<One paragraph, present tense, concrete and visual. Age range, build, hair,
face, the clothing that does not change between scenes, and one distinctive
thing. This paragraph is copied verbatim into image prompts — write it so that
it can be.>

<Then ONE SENTENCE PER PART a camera can isolate on its own: the hands, the
jacket, the shoes — whatever this character's shots will hold in close-up. Each
must stand alone, because an insert quotes exactly one of them and nothing
else. `shot-prompts` pastes the sentence about the hand into a shot of a hand,
and the whole paragraph only when the face or body is in frame; without these
sentences it has nothing exact to quote and must either over-describe or
invent.>

> Her hands are broad and short-nailed, with a dark line of graphite under the
> right thumbnail.

**Each sentence begins with the thing it is about.** That is what makes it
findable: a shot of a hand is answered by reading down the openings until one
says *hands*. The same sentence written the other way round is equally good
prose and no longer addressable —

> Broad and short-nailed, with a dark line of graphite under the right
> thumbnail, are her hands.

— because nothing at its front says which part it describes.

## Wardrobe
- **Default.** <what she wears in most scenes>
- **Scene <n>.** <only where it changes, and why>

## Performance
- **Speech.** <short and clipped | formal | hesitant>, and one verbal habit.
- **Body.** <how she stands, what she does with her hands>
- **What the camera should catch.** <the one thing that reads on a face>

## Continuity
<Anything that must stay true across shots: a scar on the left hand, a phone
with a cracked screen, hair always tied back.>
```

Rules that matter more than the format:

- **The appearance paragraph is written to be pasted.** No pronoun that needs
  the sentence before it, no reference to another character, no plot. A model
  receiving it alone must be able to draw the person.
- **Concrete over evocative.** "Mid-thirties, tall, dark hair cut short,
  square jaw, grey wool coat with a torn left pocket" can be drawn.
  "Weathered, guarded, carrying her history" cannot.
- **Take it from the bible, do not invent past it.** Where the screenplay is
  silent, choose — and then say so in one line at the foot of the sheet, so
  the person can see which details are theirs and which are yours.
- **No ages under 18 in an appearance paragraph, and no real person's name or
  likeness.** If the screenplay calls for a child character, write the sheet
  in terms of the performance and the wardrobe and say plainly that the
  appearance paragraph is deliberately not written, and why. This is not a
  formatting rule; do not work around it.
- **The person's own language for the prose**, English for the field names —
  the shot skills read the field names.

## Then

One emission per character:

```
emit_artifact(path="characters/alice.md", type="markdown",
              facts=["<n> scenes", "<n> wardrobe changes"],
              from=["screenplay.md"])
```

**Withdraw a sheet only for a character with no performance either** — a
crowd, a name in a line of dialogue, someone spoken about and never heard:

```
withdraw_artifact(path="characters/<name>.md")
```

**A voice is not that.** A character who is never seen but is heard has a
performance, and the next scene — or the next episode — needs it to stay the
same. Write them a sheet with no *Appearance* section, say in one line that it
is deliberately absent and why, and fill *Performance* as fully as for anyone
else. Same shape as the child-character rule above, for the same reason: what
cannot be drawn is not therefore nothing.

The test is not *can I draw them*. It is *will anything downstream have to be
consistent about them* — a voice, a way of speaking, a name always said in
full. If yes, they get a sheet.
