---
name: drama
description: The genre rules for short drama — the hook, the beat pattern, and the cliff an episode ends on.
---

# Drama

A genre skill, not a stage. It changes how `brief`, `screenplay` and
`shot-list` make their decisions; it emits nothing of its own and adds no node
to the graph.

Read it when the brief's genre is drama, a short serial, or anything whose
job is to keep someone watching to the end and then start the next one.

## The hook is the first three seconds, and it is not a teaser

A short drama is watched in a feed. The decision to keep watching is made
before the first line has finished. So the first shot is not establishing, not
a title, and not a slow reveal: it is **the most abnormal thing in the story,
happening**.

Three that work, and why:

- **Mid-consequence.** Open after the worst has already happened. The question
  the viewer is answering is "what did I miss?", which is a stronger pull than
  "what will happen?".
- **A line that cannot be walked back.** Someone says the thing. The scene is
  the fallout.
- **A wrong detail.** The frame is ordinary and one thing in it is not. Do not
  explain it for at least two beats.

What does not work: a character waking up, a character arriving somewhere, or
anyone explaining the situation to someone who already knows it.

## The beat pattern

For an episode under three minutes, five beats:

1. **Hook.** The abnormal thing, happening. No context.
2. **Ground.** The minimum a viewer needs to read the hook — the shortest
   scene in the episode, and the one most often written twice as long as it
   needs to be.
3. **Turn.** Something the protagonist did not know. This is the middle, and
   it is where an episode that is going to fail starts marking time.
4. **Cost.** They act on it and it costs them something specific and visible.
5. **Cliff.** See below.

Each beat changes the situation. A beat that only develops a feeling is a beat
to fold into its neighbour.

## The cliff

An episode ends on a question a viewer would wait a day to have answered.
Three shapes, in descending order of how well they hold:

- **A revelation the viewer has and the protagonist does not.** Strongest,
  because the wait is uncomfortable rather than merely curious.
- **An arrival.** Someone who should not be there, is.
- **A choice, unmade.** Weakest — it depends entirely on the viewer caring
  which way it goes, which is a lot to have earned in three minutes.

**Do not resolve and then hook.** A resolved episode followed by a new problem
is two things, and the viewer has already had the satisfaction. Cut on the
turn, not after it.

## What this changes in the other stages

- **In `brief`.** Ending is `hooks the next episode`. Length is the lower end
  of what the person said: drama runs long in the writing and is cut in the
  edit, so budget for that here.
- **In `screenplay`.** Scene one starts on the hook — if the screenplay's
  first scene is grounding, the scenes are in the wrong order. Dialogue runs
  shorter than feels right; people interrupt.
- **In `shot-list`.** The hook shot is `close` or `extreme-close` and holds
  one second longer than comfortable. Tighten through a tense scene rather
  than cutting between equals. The cliff is one shot, held, and the last frame
  should be readable as a still.

## What this skill never does

It does not write the film, and it emits no artifact. If you find yourself
about to call `emit_artifact` from here, the stage you actually want is
`screenplay`.
