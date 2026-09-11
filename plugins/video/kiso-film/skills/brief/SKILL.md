---
name: brief
description: Turn one sentence into a brief a film can be built from — premise, genre, tone, protagonist, conflict, length.
---

# Brief

The first stage of `brief → screenplay → characters → shots → prompts`.
Produces `brief.md`.

A one-sentence idea is not missing detail because the person was lazy. It is
missing detail because those decisions have not been made yet. This stage
makes them, out loud, in a file they can edit — so that everything downstream
argues with a document rather than with a guess.

## Plan the graph first, before you ask anything

```
plan_artifacts(nodes=[
  {"path": "brief.md",      "type": "markdown", "from": []},
  {"path": "screenplay.md", "type": "markdown", "from": ["brief.md"]},
  {"path": "shots.json",    "type": "table",    "from": ["screenplay.md"]},
  {"path": "prompts.md",    "type": "markdown", "from": ["shots.json"]}
])
```

A plan is free, and a person who can see the shape asks better questions
about it. Characters and per-shot files are not in this plan: their count is
not known yet, and a plan that names `characters/alice.md` before anyone is
called Alice leaves an outline nobody will ever fill.

**This plan is therefore incomplete in one edge, and `screenplay` completes
it.** `prompts.md` is derived from the shot list *and from every character
sheet it quotes* — `shot-prompts` says so and emits that way. It cannot be
drawn here because the names do not exist yet, so the re-plan in `screenplay`
is not a tidy-up: it is where this edge arrives. Say so if the person asks what
the graph will become; a canvas whose character sheets lead nowhere is a canvas
that is about to change.

## Ask once, together

Three things decide everything after this stage. Ask only the ones the
sentence did not already answer, and ask them **in one message**:

- **How long.** Under a minute, one to three minutes, or longer.
- **Where it plays.** Vertical, or wide.
- **What it is for.** A story that ends, or an episode that hooks the next
  one.

A question costs seconds. Guessing costs every stage after this one.

Do not ask about genre, tone or characters. Those are yours to propose here —
proposing something specific and being told it is wrong is faster for the
person than being asked an open question about their own idea.

## The shape

```markdown
# <working title>

**Premise.** One sentence: who wants what, and what is in the way.

- **Genre.** <one, and the sub-genre if it changes the shooting>
- **Tone.** <three adjectives that would change a lighting choice>
- **Length.** <target, in seconds>
- **Format.** <vertical 9:16 | wide 16:9>
- **Ending.** <lands | hooks the next episode>

## Protagonist
Name, what they want, what they are afraid of, and the one thing about them a
camera can see.

## Conflict
What stands in the way, and why it cannot simply be walked around.

## The world
Where and when. Two or three concrete things a set dresser could buy.
```

Rules that matter more than the format:

- **Tone in adjectives that change a decision.** "Warm" changes the lighting;
  "good" changes nothing. If an adjective would not move a choice in the
  cinematography reference, it is not doing any work.
- **One protagonist.** A short film with two leads is a longer film that has
  not admitted it yet.
- **The world in things, not in atmosphere.** A skill later has to draw this
  place. "Rain on a bus shelter, a broken phone screen, one working streetlamp"
  can be drawn; "melancholy urban decay" cannot.
- **Write in the person's own language.** If they wrote to you in one
  language, `brief.md` is in that language. This file is in English because
  it is a recipe; what it produces belongs to them.

## Then

```
emit_artifact(path="brief.md", type="markdown",
              facts=["<n>s target", "<vertical 9:16 | wide 16:9>", "<genre>"])
```

No `from` — this is the root of the graph. Facts are mechanical: a length, a
format, a genre. Never "strong premise" — a rating is refused, and rightly.
