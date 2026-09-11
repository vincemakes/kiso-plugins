# `kiso-film-sample` — the writing chain, executed by hand

The owner's ask: *you do not need to generate video — generate the video
prompts; I can see your professionalism from the prompts.*

No skill in `kiso-film` had ever been executed by anything. This lane is the
first run of the chain, done by hand, following each `SKILL.md` step by step —
which makes it the first real test of the skills' prose as well as the first
sample output.

**What it produced:** `plugins/video/kiso-film/examples/second-key/` —
`brief.md`, `screenplay.md`, `characters/ro.md`, `shots.json` (17 rows, 5
scenes, 60s), `prompts.md` (34 prompts, 15 of them carrying the appearance
paragraph). No provider was called and nothing was generated.

**The idea, one sentence, mine:** *A night-shift locksmith is called out to
open a stranger's door and finds her own key already in the lock.*

## 1. What each skill made me do

| skill | what it decided |
|---|---|
| `brief` | Its three questions were fixed in advance for this sample and are **stated in the brief** rather than asked, as the skill's own "ask once, together" implies when the answers already exist. Genre, tone, protagonist and world were **proposed**, not asked — the skill is explicit that asking about them is slower for the person than being told something specific and told it is wrong |
| `drama` | Took the length to **the lower end** — 60s, not 90. Put the hook first: scene 1 is a wrong detail in an ordinary frame (a key already in the lock, with the locksmith's own tag on it) and it is not explained for two beats. Five beats, one scene each. The cliff is an **arrival** — a voice from a dark hall — and it is one shot, held |
| `screenplay` | Five scenes, action only in what a camera can see, dialogue under-length (three lines in sixty seconds). The **continuity bible** at the foot is what every later file was written from |
| `characters` | One sheet, `characters/ro.md`. The appearance paragraph is written to be pasted and says so. Three details are marked as **mine rather than the screenplay's** at the foot of the sheet, as the skill requires |
| `shot-list` | 17 rows, every row carrying every key, `id` as `<scene>-<nn>`, `static` on 14 of 17 moves. The hook shot is `extreme-close` and holds 4s — the drama skill's *one second longer than comfortable* against the reference's 1s floor for an object |
| `shot-prompts` | 34 prompts. The appearance paragraph is **lifted from the sheet, not retyped** — a scratch script did the copying so that "verbatim" is a fact and not a promise, and the result is asserted: 15 pastes, byte-identical |

**The tool calls, which had nowhere to go.** Every skill is written as prose
around `plan_artifacts`, `emit_artifact` and `withdraw_artifact`. Executed by
hand there is no canvas to call them on, so they are recorded here:

```
plan_artifacts(nodes=[
  {"path": "brief.md",            "type": "markdown", "from": []},
  {"path": "screenplay.md",       "type": "markdown", "from": ["brief.md"]},
  {"path": "characters/ro.md",    "type": "markdown", "from": ["screenplay.md"]},
  {"path": "shots.json",          "type": "table",    "from": ["screenplay.md"]},
  {"path": "prompts.md",          "type": "markdown", "from": ["shots.json", "characters/ro.md"]}
])
emit_artifact("brief.md",         facts=["60s target", "vertical 9:16", "drama"])
emit_artifact("screenplay.md",    facts=["5 scenes", "2 characters", "60s target"], from=["brief.md"])
emit_artifact("characters/ro.md", facts=["5 scenes", "0 wardrobe changes"],         from=["screenplay.md"])
withdraw_artifact("characters/denner.md")
emit_artifact("shots.json",       facts=["17 shots", "5 scenes", "60s total"],      from=["screenplay.md"])
emit_artifact("prompts.md",       facts=["17 shots", "1 character referenced"],     from=["shots.json", "characters/ro.md"])
```

## 2. Where the instructions were wrong, missing, or ambiguous

Each of these is a place the prose sent me somewhere it did not mean to, or
did not send me anywhere at all. File, sentence, and what I did instead.

### F-1. The graph in three places says `prompts.md` comes only from the shots

- `README.md`, the diagram: `→ shots.json → prompts.md`, with
  `characters/*.md` branching off the screenplay and ending there.
- `skills/brief/SKILL.md`, the `plan_artifacts` block:
  `{"path": "prompts.md", …, "from": ["shots.json"]}`.
- `skills/screenplay/SKILL.md`, the re-plan block: the same line again.

But `shot-prompts` reads the sheets, pastes their paragraphs, and its own
`from` is *"the shot list AND every character sheet a prompt quotes"*, with the
reason spelled out — a changed sheet makes `prompts.md` stale and the graph is
what says so. **The plan the first two stages draw cannot express the thing the
last stage insists on.** A person who stopped after `brief` would see a canvas
whose character sheets lead nowhere.

*What I did:* planned `prompts.md` from `shots.json` **and** `characters/ro.md`
(above), which is what `shot-prompts` requires and what the README's diagram
does not draw. **Recommend** the diagram and both plan blocks gain the edge.

### F-2. `characters` has two answers for a character with no appearance

`skills/characters/SKILL.md` says:

> If a character named in an earlier plan turns out not to need a sheet — a
> voice on a phone, a crowd — withdraw the promise rather than leaving an
> outline.

Denner is exactly that: a voice from a dark hall, never lit, never in frame.
So the skill says withdraw, and I withdrew.

But the same file, four bullets earlier, already knows a third shape:

> If the screenplay calls for a child character, write the sheet in terms of
> the performance and the wardrobe and say plainly that the appearance
> paragraph is deliberately not written, and why.

Denner has a **performance** — a man's voice, unhurried, close enough to be in
the room — and the next episode needs it. The withdrawal throws it away; the
child-character shape would have kept it. The two rules give opposite answers
to the same question, *what do you write for a character you cannot draw*.

*What I did:* followed the rule that names his case, withdrew the node, and put
his voice into the screenplay's continuity bible, which is the only file that
survives. **Recommend** the withdrawal rule be narrowed to characters with no
performance either (a crowd), and the appearance-less sheet be offered for the
rest.

### F-3. `shots.json` has `dialogue` but no speaker

`skills/shot-list/SKILL.md`: *"`dialogue` is the line as it is spoken, or an
empty string."* Every example has the shot's own subject speaking.

Shot `5-01`'s subject is Ro; the line is Denner's, from off screen. The schema
has nowhere to say so, and a reader of the table — which is what the canvas
draws — will attribute the line to the subject. This is the episode's cliff, so
the one line most likely to be misread is the one the episode ends on.

*What I did:* put the line in `dialogue` and made `blocking` carry *"A man's
voice comes from the dark; nothing of him is lit at any point."* **Recommend** a
`speaker` column, empty when it is the subject.

### F-4. `shot-prompts` does not say whether a hand counts as the character

> Every shot's first-frame prompt that includes a character **pastes that
> character's appearance paragraph verbatim**.

Five of these seventeen shots are inserts where only Ro's hands are in frame —
a phone screen, a paper tag. Does an insert "include a character"?

*What I did:* pasted, for every shot where any part of her is in frame, 15 of
17. The reason is the rule's own: the paragraph is the only thing holding the
hand the same across separate generations, and it is the paragraph that
describes her hands. **But it doubles the file** — `prompts.md` is 3,655 words
and roughly 2,000 of them are that paragraph repeated. **Recommend** the rule
say which it means, and say that an insert of a hand is included and why.

### F-5. The lighting vocabulary cannot describe a torch in a dark room

`references/cinematography.md` gives one `lighting` word per row.
`practical` is *"lamps, screens, signs in the frame"*; `low-key` is *"mostly
shadow, small pools of light"*. Scenes 4 and 5 are both at once — the only
source is a phone torch, in frame, in an unlit flat. One column, two true
words.

*What I did:* `practical` for scenes 1–3 (a strip light overhead) and
`low-key` for 4–5, with the torch named in `blocking` and described in every
prompt. **Recommend** either a second lighting field or a note in the reference
that the row names the *result* and the source belongs in the blocking.

### F-6. The plugin says write in the person's language; this repo cannot ship that

`skills/brief/SKILL.md`: *"If they wrote to you in one language, `brief.md` is
in that language."* `skills/characters/SKILL.md` says the same for the prose.
This repository's `gate:cjk` refuses non-English outside the READMEs.

The two are not in conflict for a *person's* output, which never enters this
repo — but they are for an **example committed to it**. This sample is English
throughout, which means it demonstrates the chain and not that rule.

*What I did:* wrote everything in English, as the lane required, and note here
that the language rule is the one instruction in the plugin no example in this
repository can show. **Recommend** the README say so, so the next person does
not read the English sample as the rule.

### F-7. `tools/kiso-film/package-lock.json` is stale, and installing it dirties the tree

Not this lane's file and not changed here. `npm run check` ends in
`npm --prefix tools/kiso-film test`, which needs the tool's dependencies; in a
fresh worktree they are absent and the check dies with `tsc: command not
found`. Installing them fixes the check **and rewrites the lockfile**:

```
-        "kiso-film": "dist/cli.js"
+        "kiso-film": "build/src/cli.js"
```

`tools/kiso-film/package.json` says `build/src/cli.js`. The lockfile still
carries the old path, so npm corrects it on the first install and every fresh
clone that runs the check comes away with a modified file it did not edit.

*What I did:* installed, ran the check green (71 tests), then **reverted the
lockfile** — a sample lane is not the place to carry an unrelated fix, and
committing it would hide it. **Recommend** a one-line commit of its own, or
that `check` be made to fail with an install hint rather than with `tsc: command
not found`, which tells a newcomer nothing.

### F-8. Not a defect: the validator accepts `examples/`

Checked before writing anything: an `examples/` directory inside the plugin
passes `npm run validate` untouched. No finding, and nothing in the validator
was changed.

## 3. What the prompts cannot say — corrected against the model table

**I got this section wrong the first time, and the correction is the most
useful thing in this record.**

What I first wrote: *"No number is given anywhere in the plugin, and the model
table that would carry one lives in a tool that is not published."* That was
not stale — **it was wrong when I wrote it.** The plugin's README says the
`kiso-film` *command* is not published, and I took that to mean the data was
not in the repository. It is, and it was there at my own base commit:
`tools/kiso-film/data/models.json`, 23 entries, 18 of them video, with a
`duration` block on every one.

I read a document's claim about an artifact instead of opening the artifact.
That is the same mistake this week has spent four lanes learning to avoid, and
it is worth more to the collection written down than quietly fixed.

### What the table actually says, and what it does to this sample

**Every entry is `verified: false`.** All 23. The flag is in the data, so
"unverified" is not a caveat someone added in prose — it is a field, and
nothing in the sample below should be read as confirmed.

**The clip ceiling was the wrong worry.** I flagged two 6-second shots as the
risk. Seventeen of the eighteen video models reach 6 seconds; only `wan-2`
(max 6) is tight and it still makes it. The ceiling is not the problem.

**The floor is.** Sixteen of eighteen video models cannot go below 3 seconds:

| floor | models |
|---|---|
| 1s | `vidu-q3`, `pixverse-c1` — two of eighteen |
| 3s | `kling-o3`, `happyhorse-1`, `kling-v3-standard`, `kling-o1-ref` |
| 4s | `seedance-2-5`, `seedance-2-0`, `seedance-2-0-fast`, `seedance-1-5`, `veo-3`, `grok-video` |
| 5s+ | `minimax-h3`, `wan-2-6`, `wan-2`, `kling-2-turbo`, `hailuo-2-3` (6), `veo-3-1` (8, fixed) |

**Five shots in this sample are 2 seconds** — `2-02`, `2-04`, `3-01`, `3-03`,
`4-04`, all of them inserts on a phone screen or a paper tag. On sixteen of the
eighteen models those clips **cannot be generated at their written length.**

And the sample is not wrong for having them. `references/cinematography.md`
says an `extreme-close` on an object *"reads in about one second"*, and
`shot-list` says `duration_s` is what the shot needs, floored by what can be
read. Both files push toward exactly the short inserts almost nothing can
produce.

### F-9. The reference knows about a ceiling and not about a floor

`references/cinematography.md`, last section:

> Generated clips have a ceiling their model sets, and it is usually short.
> Where a beat needs longer than the model gives, it is two shots, not one long
> one.

There is no symmetric sentence, and the data says the floor is the binding
constraint for sixteen of eighteen models. A 2-second insert against a
3-second floor is not solved by splitting; it is solved in the **cut** — the
clip is generated at the floor and trimmed, or it is held. That is a decision
the shot list should be able to record and today cannot.

*What I did:* left the durations as written, because the `shot-list` skill is
explicit that the length is the person's decision and not mine, and because
letting an unverified table shorten the cut would be the tail wagging the film.
**Recommend** the reference gain a floor paragraph, and `shots.json` a way to
say *generate at the model's floor, cut to this*.

### F-10. The one model authorised for a real call carries almost nothing

`gpt-image-2` is, per the lane that merged it, the only model the owner has
authorised a real call on — so the first-frame prompts in this sample are the
first ones likely to be run for real. Its entry:

```
kind: image · verified: false · available: true
capabilities: (none) · resolutions: (none) · aspectRatios: (none) · price: {}
```

The other four image models each carry a price key; this one carries none. *(Narrowed at d99833c, `kiso-film-apimart-2`: the price is filled from the vendor's own page, $0.0085; the capabilities, resolutions and aspect ratios are still empty and the entry stays `verified: false`.)*
**Every first-frame prompt here ends in `9:16`**, as `shot-prompts` requires,
and there is nothing in the table to say whether this model accepts an aspect
ratio at all, or what the call costs. The product doc's plan is that the
registry prices the graph before a byte is generated and the first ask is the
budget; against this entry that ask cannot be computed.

*Recommend* filling the entry before the first real call, or the budget stop
lands on an empty price.

### The rest of what the prompts cannot say

- **The first frame reaches the clip on 11 of 18 models.** `startImage: true`
  on eleven, including `kling-o3`, `veo-3-1`, `wan-2-6` and `seedance-1-5`; six
  of those also take an end frame. On the other seven — `veo-3` among them,
  while `veo-3-1` differs — the clip is an independent generation and the only
  thing holding the face is the pasted appearance paragraph. Which is precisely
  why `shot-prompts` insists on pasting it, and the data now shows what it is
  insuring against.
- **Audio.** Every row carries a `sound` field and no prompt uses it, because
  `shot-prompts` writes image and motion only. The table says `nativeAudio` and
  `lipSync` are declared on video models, so that field is a note for the cut
  on some routes and a missed capability on others.

## 4. Verdict (leader, 2026-09-11)

**Approved and merged, as the first execution of the skills — the record
is the deliverable and the example is its evidence.** One commit, rebased
onto main, surveyed from the main checkout: six files under the plugin's
`examples/second-key/` and this record; the validator accepts the directory
untouched; 17 shots in 5 scenes at 60 seconds, 34 prompts, no provider
called. I read the brief, the shot list and ten of the seventeen prompts:
they are shootable — one lens, one light, one movement per shot, the camera
words from the reference verbatim, the clip prose saying what moves and
what does not, the appearance paragraph byte-identical across its pastes
because a script lifted it rather than a hand retyping it, and the skills'
own mechanical rules run as checks afterwards, which is how three of the
findings surfaced. The ten findings are exact to the sentence and the
first four are real defects in the skills' prose: a plan that cannot express
what its last stage requires, two opposite rules for a character who cannot
be drawn, a `dialogue` column with no speaker for the one line the episode
ends on, and a paste rule that puts a woman's scar into a prompt for a phone
screen and doubles the file — the one the owner will see first. Those go to
the skills' author as `kiso-film-skills-2`, with the lighting column, the
language line and the ceiling; the lockfile is its own one-line lane; and
this example is re-emitted on the fixed skills by this executor, so what the
repository shows as the sample is the chain as it stands, not as it was.
The executor's own correction is the better half of the record: the
first version said no model's ceiling was knowable because the tool is
unpublished, and the table was in the tree the whole time — read off the
artifact, the worry inverts: seventeen of eighteen video models reach six
seconds and sixteen cannot go below three, so the five two-second inserts
the plugin's own guidance asks for are the shots almost nothing can make
(F-9, to the skills fix: the floor, and a cut that trims); and the one
image model the owner has authorised carries no capabilities and no price
(F-10, to the apimart follow-up). Taking a document's claim about an
artifact instead of opening the artifact is the error the week has been
about, named here by the one who made it, which is how it stops.

*The merge commit's subject (4eab708) says "eight findings"; the record says
ten and the record is right — the subject was written before the correction
that added F-9 and F-10 and not carried sideways. Noted here rather than
rewritten, for the reader who trusts a subject over a record.*
