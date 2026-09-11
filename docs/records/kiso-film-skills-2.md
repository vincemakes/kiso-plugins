# kiso-film skills, part two — what the first reader found

## 0. In one line

Nine things a person found by executing the writing chain by hand, fixed in the
skills rather than in their sample — the largest being that a prompt for a
photograph of a phone screen carried a paragraph about a scar on a face.

## 1. What was decided

The skills were written, reviewed and merged without anyone ever running them.
`docs/records/kiso-film-sample.md` is the first execution, by hand, and it
found ten things. Eight are the skills' prose and are fixed here; one was the
lockfile and is already merged; one is the empty `gpt-image-2` entry and
belongs to the provider follow-up, **before** any `verified` flip and never
with it — a flag on an entry with no capabilities and no price would say the
entry had been checked when only a route was.

**The example is not touched.** It is evidence of what the skills said at the
time. Re-emitting it on the corrected skills is its author's to do, and a
sample rewritten by the person who changed the rules is not a second reading.

## 2. What changed

### The one the owner would have seen first

`shot-prompts` said: *every shot's first-frame prompt that includes a character
pastes that character's appearance paragraph verbatim.* Five of the sample's
seventeen shots are inserts — a phone screen, a paper tag — where nothing of
the character is in frame but a hand. The reader pasted, because the rule's own
reason told them to: the paragraph is what holds the hand the same, and it is
the paragraph that describes the hand.

The result, in the sample as merged:

> Ro Mercer is a woman of about thirty-eight … a small white scar through the
> left eyebrow … a navy work jacket with a horizontal reflective strip across
> the back … **A phone held flat in a broad short-nailed hand, screen filling
> the frame** …

**`prompts.md` is 3,654 words and roughly two thousand of them are that
paragraph, repeated.** That is the cheap half of the cost. The expensive half
is that an image model asked for a photograph of a screen, and told about a
scar and a jacket, may put a person in the frame.

The rule now has three cases, decided by what the camera can see:

1. **the face or body is in frame** — the appearance paragraph, verbatim;
2. **an insert** — only the sentence about the visible part, verbatim, and
   nothing else about them;
3. **the character is not in the shot** — nothing about them at all.

And a check to read the finished prompt by: *could the camera see this?* A
sentence that fails it is a sentence the model will try to satisfy anyway.

**That rule needs the sheets to support it**, so `characters` now requires one
sentence per part a camera can isolate — the hands, the jacket, the shoes — each
standing alone, because an insert quotes exactly one of them. Where the
sentence is missing, `shot-prompts` says so under the prompt rather than
inventing one: a detail invented there and pasted twelve times is a detail the
sheet does not know about.

### The graph edge, which is mine

`prompts.md` descends from the shot list **and** from every character sheet it
quotes. That was stated in four places and true in one:

| where | said |
|---|---|
| `shot-prompts`, the emission | shots **and** the sheets — correct |
| `brief`, the plan | the shots alone |
| `screenplay`, the re-plan | the shots alone |
| `README`, the diagram | the sheets are a dead end |

I wrote the emission with the narrow edge, corrected it mid-lane with the
reason — *the sheets' words are pasted, so editing one makes the prompts stale
and the graph is what tells you* — and **fixed it in the one place I was
looking at.** The two plans and the diagram were written before the correction
and never revisited. A person who stopped after `brief` saw a canvas whose
character sheets led nowhere.

Now: the diagram draws the edge; `screenplay`'s re-plan carries the sheets;
and `brief` keeps the narrow edge **and says why** — the names do not exist
yet, so the re-plan is not a tidy-up but the place this edge arrives. That last
one is deliberate, and §3 shows the grep that distinguishes it from the bug.

### The rest

| finding | what the skills say now |
|---|---|
| a character who cannot be drawn but can be heard | withdraw only for one with **no performance either**; a voice gets a sheet with no *Appearance* and one line saying why |
| a line spoken from off screen | `shots.json` gains `speaker`, empty when it is the shot's own subject. The sample's cliff is an off-screen line, so the row most likely to be misread was the one the episode ends on |
| a torch in an unlit room | `lighting` takes two words where two sources are the truth — `practical low-key`. Two is the limit; the source itself goes in `blocking` |
| the language rule no example can show | the README says it in one line: your language for the output, English for the recipes, and the example is English because this repository's gate requires it |

### The floor, in all three halves

The reference knew about a **ceiling** — a beat too long for a model becomes
two shots — and said nothing about a **floor**. The data says the floor binds
far more often: most video models will not go below a few seconds, and five of
the sample's shots are two-second inserts.

A floor is not solved by splitting. It is solved in the cut, and it needed
saying in three places or none:

- **the reference** gains the floor beside the ceiling, and the rule: generate
  at the model's floor and trim in the cut;
- **`shot-list`** gains `trim_to_s` — `duration_s` is what the generation is
  asked for, `trim_to_s` what the film uses — and **never invents a floor**:
  it comes from the tool's table when the tool is there, from the person when
  it is not, and from nowhere else;
- **`cut.json`** gains `trimToSeconds`, so the row is read by the thing that
  makes the film rather than being a note in a table.

`kiso-film compose` now applies a trim to each input before anything else,
restarts its timestamps, and measures every later fade from the trimmed
length. A trim longer than the clip loses to the clip.

## 3. Proof

```
$ npm run check
  OK    video/kiso-film
        note: 3 offers read and checked against the renderer words
validate: green — 1 plugin in 1 category, read by the App's own rules
validate --selftest: green — 48/48 checks fire on a fixture that breaks them
cjk gate: green — source and records are English (ADR-L005)
# tests 87
# pass 87
# fail 0
```

Exit code 0. 81 tests became 87, all six of them the trim.

### The correction carried sideways, as a grep

The point of this section is that the fix is not "the edge is right in
`screenplay` now". It is that **every statement of the edge was found and
each one decided**:

```
$ grep -rn '"prompts.md".*"from": \["shots.json"\]' plugins/video/kiso-film/
plugins/video/kiso-film/skills/brief/SKILL.md:23
```

One left, and it is the deliberate one — the paragraph directly under it says
the names do not exist yet and that `screenplay`'s re-plan is where the edge
arrives. The README's diagram and `screenplay`'s block both carry the sheets
now. That grep is the thing I did not run in the first lane.

### Red-proved: the trim

| probe | what went red |
|---|---|
| the trim no longer shortening what a clip contributes | `a trimmed clip contributes its TRIM` **and** `THE FADE AFTER A TRIM IS MEASURED FROM THE TRIMMED LENGTH` |
| `setpts` dropped from the trim filter | `the trim is applied to the input BEFORE anything else, and restarts the clock` |

Both probes' counts were read before their failures. The first taking two
tests down is the useful part: the arithmetic and the filter it feeds are one
claim, and a probe that broke only one of them would have shown the tests were
measuring the same thing twice.

**Why `setpts` has a test of its own.** A trimmed stream keeps its original
timestamps, so a fade computed correctly lands nowhere near the cut — the
arithmetic is right and the film is wrong. That is invisible in every number
and visible only in the result.

## 4. Open ruling points

**1. `shots.json` says `trim_to_s` and `cut.json` says `trimToSeconds`.** Each
matches its own file's convention — the shot row is snake, the cut is camel —
and nothing yet converts between them, because the stage that writes a cut from
a shot list is the graph lane. *Recommendation: keep both and make the graph
lane own the mapping*, with one sentence in `shot-list` naming the cut's field
so the pair is discoverable. Renaming either to match the other would make one
file inconsistent with itself to spare the other a translation it has to do
anyway.

**2. `shot-list` may now be told a floor by a tool that is unverified.**
`kiso-film models` prints durations from a table where every entry is
`verified: false`. The skill says to use it when present — which means a shot
may be lengthened to a floor nobody has confirmed. *Recommendation: accept it,
because the alternative is worse*: the skill inventing a number. The unverified
mark travels with the figure, and the first real call is what starts removing
it.

**3. The five two-second inserts in the merged sample are now under-specified
rather than wrong.** They have no `trim_to_s`, because the skill did not have
the field when they were written. *Recommendation: that is the re-emission's to
fix*, and it is a good test of whether the corrected skills produce a different
file.

## 5. Upstream findings

None, and the App was not touched.

## 6. What was left out and why

- **Nothing was pushed.**
- **The example.** Not mine to re-emit. §1.
- **`gpt-image-2`'s empty entry.** The provider follow-up, before the flip.
- **Any change to the offers, the manifest or the validator.** Nothing the
  reader found touched them.
- **A conversion between the two trim field names.** §4.1.
