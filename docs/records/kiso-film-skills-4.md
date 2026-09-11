# The third reader — three sentences

## 0. In one line

The floor's provenance now travels with the shot list instead of with the
conversation; the four quoting cases combine and in a named order; and a
per-thing sentence has to begin with its thing.

## 1. What changed

### F-15 — a sentence said in a thread does not travel with the file

`shot-list` told you to say where the floor came from. It did not say where to
say it, so it was said in the thread — and the thread is not an artifact. A
person opening `shots.json` in six weeks, or the cut reading `trim_to_s` out of
it, sees rows generated at three seconds and nothing about where three came
from. `trim_to_s` is only meaningful given the floor it was chosen against.

It goes in the shot list's own `facts` now:

```
facts=["17 shots", "5 scenes", "54s total", "floor 3s (models.json)"]
```

with the source named in a fixed short form — `(models.json)`,
`(kiso-film models)`, `(asked)`, `(unknown)`.

**Why a fact and not a `floor_source` column**, which was the other option
offered. A film generates on one video model, so the floor is one decision
about the whole list rather than a property of a row: a column would carry the
same string on all seventeen rows, in a table drawn on the canvas, and a column
whose every cell is identical is a column a reader learns to skip. `facts` is
the surface that already carries this kind of thing — mechanical, checkable,
about the artifact — and the skill's own example already puts a total there.

The reader's argument for the column was that the floor and `trim_to_s` *"belong
together, because the second is only meaningful given the first"*. That is an
argument about meaning and not about place: a fact stated once is given for
every row, the way a table's caption is. **The skill says what would change
it** — a list genuinely generated on two models — and that a column is the
answer on the day one exists.

### F-16 — the most ordinary shot in film is two cases at once

The four quoting cases were written as alternatives, and a wide of a room with
a figure in it is case 1 and case 4 together. The skill now says **they
combine**, where a reader meets them, and names the order: **the character
first, then the place.** A model reads the opening of a prompt as its subject,
and a place is the setting a character is put in rather than the thing the shot
is about — so the two orders are two different requests, the same way the
lighting pair's two orders are two different values.

### F-17 — a sentence that does not name its thing at the front is not findable

The per-part shape works because each sentence opens with what it is about —
*"Her hands are…"*, *"The timetable panel is…"* — which is how you find the one
for the thing in frame. Nothing said to write them that way, in either skill.

Both now say it, and both show the counter-example: the skill's own sentence,
reordered, still good prose and no longer addressable —

> Broad and short-nailed, with a dark line of graphite under the right
> thumbnail, are her hands.

The reordering is the point. A rule stated without it reads as style advice.

## 2. Proof

```
$ npm run check
  OK    video/kiso-film
validate: green — 1 plugin in 1 category, read by the App's own rules
validate --selftest: green — 48/48 checks fire on a fixture that breaks them
cjk gate: green — source and records are English (ADR-L005)
# tests 96
# pass 96
# fail 0
```

Exit code 0, and the counts are unchanged: this lane is three sentences of
prose in three skills, and no code. A test count that moved here would be the
thing to explain.

## 3. Open ruling points

**1. Three lanes of prose fixes have come from three readings, and the third
found less than the second.** F-15 to F-17 are a missing destination, a missing
"and", and a missing sentence order — all smaller than F-11 to F-14, which were
smaller than F-1 to F-8. *Recommendation: read it as the loop closing rather
than as diminishing returns*, and stop when a reading finds only things the
next real film would not notice. This one still found something a person would
have hit.

**2. Nothing here was executed either.** These are three sentences that will be
read by an agent, and the only evidence they work is another person reading the
skills and making a film. The example is not being re-emitted, which is right —
the sample-3 record says what the next real film will see.

## 4. What was left out and why

- **Nothing was pushed.**
- **A `floor_source` column.** §1, and named as the answer for the day a list
  is generated on two models.
- **Any re-emission.** The example stands.

## 7. Verdict (leader, 2026-09-11)

**Approved and merged, and this closes the series.** One commit, three
sentences in three skills and no code, surveyed from the main checkout at
5336ee2 with the count unmoved at 96, which is the right count for a lane
that changed prose. F-15 to `facts`, with the reader's argument for a
column answered on its own terms — meaning, not place — and the case that
would overturn it named; F-16 the combining order, character then place,
because a model reads a prompt's opening as its subject; F-17 as a
counter-example rather than a rule, which is why it will be read. Rulings:
(1) three shrinking lanes read as the loop closing, not as diminishing
returns — the stop is when a reading finds only what the next real film
would not notice, and this one still found the ordinary shot that was two
cases at once; (2) no re-emission, as the sample-3 record already says what
the next real film will see. Nothing here was executed, and the only
evidence the three sentences work is a person making a film. Idle until
the owner's call; the collection's executor has nothing open.
