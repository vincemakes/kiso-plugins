# `kiso-film-sample-3` — the third run, and the diff that is the result

`kiso-film-skills-3` closed F-11 to F-14. This lane re-emits `second-key` from
the skills as they stand — the same one sentence, the same three fixed answers,
every file written again — and the useful output is the **diff against the
merged example**.

**In one line: the diff is only what the four fixes predict.** Three files
moved, `brief.md` and both character sheets are byte-identical, and every
changed line traces to F-11, F-12, F-13 or F-14.

Branch `film-sample-3` off `31b62b0`.

## 1. What changed, and why

| file | change | the fix behind it |
|---|---|---|
| `shots.json` | **twelve rows**: `"trim_to_s": ""` → the row's own `duration_s` | **F-12** |
| `screenplay.md` | the two place entries split into a paragraph a camera can be pointed at plus a sentence per thing in them; the continuity clause moved under **Rules** | **F-13** |
| `prompts.md` | **three prompts**: `1-01` and `4-03` now quote a place sentence verbatim; `4-02` now quotes the flat's paragraph as well as Ro's | **F-13** (the fourth quoting case) |
| — | nothing | **F-14**: `practical low-key` was already source-first, so the order rule changed no row. A fix that changes nothing here is still a fix — it stops the next writer choosing the other order |
| — | nothing in the files | **F-11**: the floor's source is a sentence the writer says, and it has nowhere in the artifacts to live. See F-15 |

### The eleven — twelve — `trim_to_s` rows

The brief said eleven; it is **twelve**. Five rows were already trimmed
(`2-02`, `2-04`, `3-01`, `3-03`, `4-04`, each `3 → 2`) and the other **twelve**
carried `""`. They now carry their own `duration_s`, so:

- `duration_s` sums to **65s** — what the generator is asked for;
- `trim_to_s` sums to **60s** — the film;
- and the second column reads as a length without anybody knowing a convention,
  which is what F-12 asked for.

### The three place shots

- **`1-01`** is of the door. It quotes *"The door of 11B is a flush grey fire
  door with a brass numeral 11B at eye height and a brass cylinder lock below
  it."* — the sentence about the thing in frame, exactly as an insert of a hand
  quotes the sentence about hands.
- **`4-03`** is of the far wall, and quotes the sentence about the far wall.
- **`4-02`** is of the flat **and has Ro in it**, so it quotes both her
  paragraph and the flat's. See F-16.

Before the fix, all three described the place in my own words from the
screenplay's action lines. They now copy the bible, which is the point: the
same words reach every generation of the same place.

**No Rules line reached a prompt**, and that is asserted rather than asserted
by eye — every bullet under `### Rules` is checked against the whole of
`prompts.md`. *"Whenever we return to the landing it is the same hour of the
night"* now lives there and nowhere else.

### Where the floor came from, in the form the skill now requires

`shot-list` case 2: **working inside the `kiso-plugins` collection**, so the
floor is read from `tools/kiso-film/data/models.json`, which is what
`kiso-film models` would print. **3 seconds**, the lowest floor above two that
any model but `vidu-q3` and `pixverse-c1` offers. Unchanged from the second
run; what changed is that the skill now names this case instead of leaving it
between two others.

### The word count

**2,919 → 2,937.** Eighteen words, and the shape of the change is the
interesting part: three hand-written place descriptions were replaced by three
quoted ones of almost exactly the same length. The saving was never going to be
in the words. It is that the same wall is now described by the same sentence
everywhere it appears.

## 2. What the third reading finds

### F-15. The floor's provenance has nowhere to live

`shot-list` now ends its floor section:

> Whichever case you are in, **say which** in the line you write about the
> floor. A reader who knows the number came from a table can check it; a reader
> who knows it came from the person cannot, and should not try.

Right, and there is nowhere for it to go. The sentence is said **in the
thread**, and the thread is not an artifact: a person who opens `shots.json` in
six weeks, or the `compose` step that reads `trim_to_s`, sees five rows
generated at 3 seconds and nothing about where 3 came from. This example can
say it because a record travels with it; a film in somebody's project has no
record.

The `emit_artifact` facts are the nearest thing — mechanical counts, and the
skill's own example already puts a total in them. A fact like
`floor 3s (models.json)` would be mechanical in exactly the same way.

*What I did:* said it in this record, in the form the skill asks for.
**Recommend** the floor's source go in the shot list's `facts`, or a
`floor_source` column beside `trim_to_s` — the two belong together, because the
second is only meaningful given the first.

### F-16. The four quoting cases are written as alternatives and one shot is two of them

> **What is copied depends on what the camera can see.** There are four cases
> and they are not a matter of taste.

`4-02` is a wide of the empty flat with Ro at the edge of it. It is case 1 (her
body is in frame) and case 4 (the shot is of a place), and the skill's
numbering implies one answer per shot. A wide establishing shot with a figure
in it is not an edge case — it is the most ordinary shot in film.

*What I did:* quoted both, her paragraph then the flat's, in that order, on the
reasoning the cases are given for — *what is in frame decides what is copied*,
and both are in frame. **Recommend** one sentence saying the cases combine and
naming the order: the character first, the place second, because the place is
the setting the character is placed in and a model reads the opening of a
prompt as its subject.

### F-17. A place's per-thing sentences have no stated subject-first rule, and the character sheets' do not either

The new shape works because each sentence names its thing at the front — *"The
door of 11B is…"*, *"The far wall carries…"* — which is what makes it possible
to find the sentence for the thing in frame. Nothing says to write them that
way. A sentence beginning *"Behind cracked perspex, one corner lifted, the
timetable panel…"* is the skill's own example reordered, and it is equally
good prose and no longer addressable.

The same is true of the character sheets, which have had per-part sentences
since skills-2 and no rule about how they open.

*What I did:* wrote every part sentence and every thing sentence subject-first.
**Recommend** one line in both skills: the sentence begins with the thing it is
about.

## 3. Unchanged, and still true

Every entry in `tools/kiso-film/data/models.json` is `verified: false`, so the
3-second floor this example is built on remains an unverified fact about
eighteen unverified models. `gpt-image-2` now carries a price — filled from the
vendor's page since the last run — and still no capabilities, no resolutions
and no aspect ratios, while every first frame here ends in `9:16`.

## 4. Verdict (leader, 2026-09-11)

**Approved and merged, and the loop closes here.** One commit off main,
surveyed from the main checkout at 7a1602c: the diff against the merged
example is only what the four fixes predict — the brief and both sheets
byte-identical, twelve `trim_to_s` rows carrying their own `duration_s` so
the column sums to the film, the three place shots quoting the bible's
camera sentences with no rule reaching a prompt (asserted on the whole
file, and checked again here: none), the floor's case named, the words
2,919 to 2,937 because three hand-written places became three quoted ones.
Three findings, F-15 to F-17, one sentence each, go to the skills' author
as `kiso-film-skills-4`; there is no fourth emission. The example is what
the chain produced BEFORE those three sentences, and the difference runs one
way: after `kiso-film-skills-4` it is one field behind and two conventions
ahead — F-15 would put the floor's source into `shots.json` and a reader will
see its absence; F-16 and F-17 would change nothing here, because 4-02 already
quotes character then place and every per-thing sentence is already
thing-first — they are rules that make the next writer do by rule what this
run did by judgement. What the three readings bought:
a paste rule decided by what the camera sees, a speaker, a floor with a
source, a place a camera can be pointed at, and seventeen findings in the
prose that no exit code would have found. The unverified table stands, and
so does the empty half of the one image model the owner has authorised.
