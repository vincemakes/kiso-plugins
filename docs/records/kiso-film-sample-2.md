# `kiso-film-sample-2` — the same episode, re-emitted on the fixed skills

`kiso-film-sample` ran the writing chain by hand for the first time and left
ten findings. `kiso-film-skills-2` fixed them. This lane runs the chain again —
**the same one sentence, the same three fixed answers** — and replaces
`examples/second-key/` with what the chain produces now. Not a patch: every
file was written again from the skill that makes it, because an example that
was hand-edited stops being evidence of what the chain does.

Branch `film-sample-2` off `0c459ea`.

## 1. Did the fixes reach the example?

| asked | answer |
|---|---|
| **F-1's graph edge in the example's own plan blocks** | **Yes, and correctly split.** `brief`'s plan now says out loud that it is incomplete in one edge and that `screenplay` completes it, because the sheets cannot be named before the names exist. The example's `brief.md` says the same in its own words; the re-plan in the record carries `prompts.md` from `shots.json` **and** `characters/ro.md`. The README's diagram now draws the join |
| **`trim_to_s` on the five 2-second inserts** | **Yes.** `2-02`, `2-04`, `3-01`, `3-03`, `4-04` each carry `duration_s: 3` and `trim_to_s: 2`. The list asks for **65 seconds** of generation and the film is **60** |
| **`speaker` on the cliff** | **Yes.** `5-01` carries `dialogue: "You're early."` and `speaker: "Denner (off screen)"`. It is the only non-empty `speaker` in the file, which is the shape the fix intends |
| **The insert prompts: one sentence, no face** | **Yes.** 17 shots — **9 paste the whole appearance paragraph**, **5 paste one part sentence**, **3 say nothing about her at all**. Every insert adds *No face and no body in frame* to the composition line |
| **Denner with an appearance-less sheet** | **Yes.** `characters/denner.md` exists, has no *Appearance* section, says in one line why, and fills *Performance* as fully as Ro's. The first run withdrew him on the skill's own instruction and lost his voice into the bible |
| **`prompts.md` word count** | **3,655 → 2,919.** A fifth of the file gone, and the part that went was the part that was wrong: a hundred words about a scar through an eyebrow in a prompt for a photograph of a phone screen |

### Where the floor came from, since the skill forbids inventing it

`shot-list` now says: *never invent the floor; when the tool is installed
`kiso-film models` prints it; when it is not, ask the person or say it is
unknown.* `kiso-film` is **not installed** — it is not published — so neither
branch applied cleanly, and the third option was sitting in the tree.

The floor is read from **`tools/kiso-film/data/models.json` in this repository**,
which the first run of this sample failed to open and which is the same data
the command would print. Of the eighteen video models:

| floor | models |
|---|---|
| 1s | `vidu-q3`, `pixverse-c1` — two of eighteen |
| 3s | `kling-o3`, `happyhorse-1`, `kling-v3-standard`, `kling-o1-ref` |
| 4s | six models, including `veo-3` and the `seedance` family |
| 5s or more | six models, up to `veo-3-1` at a fixed 8s |

**3 seconds** is used, because it is the lowest floor above two that any model
other than the two outliers offers. The consequence is stated rather than
hidden: on `vidu-q3` or `pixverse-c1` the five rows need no trim at all, and on
any 4- or 5-second model they need `duration_s` raised again and `trim_to_s`
left where it is. **No number here was chosen by taste**, and every entry in
that table is `verified: false`.

## 2. New findings, from the second reading

### F-11. The floor's fallback list does not include the table in the tree

`skills/shot-list/SKILL.md`:

> When the tool is installed, `kiso-film models` prints it and that is the
> number to use. When it is not, ask the person which model they will generate
> with, or leave `duration_s` as the shot needs and say in one line that the
> floor is unknown.

Both branches assume the data arrives with the **command**. It does not: it is
`tools/kiso-film/data/models.json`, checked into this repository, and it is
what `kiso-film models` would read. An agent working inside the collection can
open it; an agent working in a person's project cannot, because an installed
plugin is `plugins/video/kiso-film/` alone and the tool directory is not part
of it.

So the sentence is right for the case it was written for and wrong for the case
that produced this example — and the difference between those two cases is
invisible from inside the skill.

*What I did:* read the table, used 3s, and said above exactly which models that
serves and which it does not. **Recommend** a third branch naming the file, and
a line saying that it is readable only from the collection.

### F-12. `trim_to_s` is a number where the empty case has two meanings

`shot-list` says to leave `trim_to_s` out when it equals `duration_s`, and also
that every row carries every key with an empty string where a field does not
apply. Those two instructions meet on this field.

In this file the eleven untrimmed rows carry `"trim_to_s": ""`. An empty string
in a numeric column reads on the canvas table as a hole, and a *missing* key
would be the hole the skill's own earlier rule forbids. Neither form says *this
shot is generated at the length it is used*, which is a fact and not an absence.

*What I did:* `""` on every untrimmed row, for the rule that every row carries
every key. **Recommend** `trim_to_s` equal `duration_s` when there is no trim —
a number in a number column, and the sum of the column is then the film's
length without a reader having to know the convention.

### F-13. The three quoting cases have no word for a shot of a place

`shot-prompts`, after the three cases:

> The same rule applies to a place: the screenplay's continuity entry for it,
> copied — when the place is what the shot is of.

Three of this episode's shots are of a place: `1-01` (the door), `4-03` (the
wall of keys), `3-03` (a phone screen). The screenplay's continuity has entries
for the landing and for flat 11B, and those entries are 60 and 70 words of
prose written for a reader, not for a prompt — *"Whenever we return it is the
same hour of the night and the same one light"* is a rule about continuity and
not a thing a camera sees.

Pasting that into a first-frame prompt would put an instruction about future
scenes into a still. So the place entries need the same treatment the character
sheets just got — a describable paragraph, and a sentence per part — and the
skill asks for the copy without the sheet having been written to be copied.

*What I did:* wrote the place descriptions into the prompts from the
screenplay's own concrete details (the brass 11B, the strip light, the drag
mark in the dust, the steel hooks) without quoting the continuity entry
verbatim. **Recommend** either `screenplay`'s bible gain the same shape as a
character sheet for places, or the rule say plainly that a place is described
and not quoted.

### F-14. A two-word lighting value is a string the table cannot sort

`practical low-key` is right, and the fix that allows it is right. But
`lighting` is now sometimes one word and sometimes two, in a column the canvas
draws as a table, and nothing says whether the order is fixed — `low-key
practical` would read the same to a person and differently to anything that
groups by value.

*What I did:* wrote source-then-result consistently (`practical low-key`),
which matches the skill's own example. **Recommend** the skill say the order is
source first, or the pair be two fields.

## 3. What still cannot be said

Unchanged from the first run and worth restating, because the fix made one half
of it visible and not the other: **every model entry is `verified: false`**, so
the 3-second floor this example is built on is an unverified fact about
eighteen unverified models. `gpt-image-2`, the one authorised for a real call,
still carries no capabilities, no resolutions, no aspect ratios and an empty
price, while every first frame here ends in `9:16`.

The durations now say what they are for — a generation length and a film length
— and neither of them is checkable until something has been run for real.

## 4. Verdict (leader, 2026-09-11)

**Approved and merged — the example is now the chain as it stands.** One
commit, surveyed from the main checkout at 37ca5cc: seven files, every one
re-emitted from the skill that makes it rather than patched. Checked on the
files: the phone-screen insert 2-02 opens with the one visible sentence about
her hands and says *no face and no body in frame*, at `duration_s` 3 with
`trim_to_s` 2 — a floor read off the tool's table in the tree, the lowest
above two that any model but two offers, and the record says what changes on
a model whose floor is higher; the cliff's line carries `speaker: Denner (off
screen)`, the only non-empty speaker; Denner has a sheet with no appearance
section and a full performance; the brief's plan says out loud which edge it
cannot yet draw and the re-plan draws it; the prompts fell from 3,655 words
to 2,918, the difference being the paragraph that no longer stands in front
of a phone screen. Four new findings, F-11 to F-14, and the first is
structural: an installed plugin is its own directory alone, so the floor's
"read the tool's table" branch is only true inside this repository — the
skill needs a third branch that says where the file is readable from. Those
four go to the skills' author as `kiso-film-skills-3`. On the price: this
record's §3 and F-10 of the first record both say the entry carries none,
and since d99833c it carries one, from the vendor's own page — so F-10
narrows rather than retires: the half that can be sourced without a call is
filled, and the capabilities, resolutions and aspect ratios every `9:16`
first frame here depends on are still empty; `verified: false` stands. The
first record gets that line at this merge, in the leader's commit. The executor's counts:
`check` exit 0 at the tip. No real call.
