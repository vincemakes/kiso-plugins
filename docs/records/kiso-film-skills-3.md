# The second reader — four findings, and one consequence they did not ask for

## 0. In one line

The floor's source has three cases and the skill says which you are in; the
trim column is a number on every row; a place gets what a character sheet got;
and a two-word lighting value has an order — plus the thing that last change
would have done to every film, caught before it shipped.

## 1. What changed

### F-11 — the floor can come from three places, and two of them are not where you are

The skill said: the tool prints it, or ask the person. Both assume the data
arrives with the **command**. It does not. It is
`tools/kiso-film/data/models.json`, checked into this repository, and it is
exactly what the command reads.

Three cases now, with the question that picks one:

1. **the tool is installed** — `kiso-film models` prints it;
2. **you are inside the collection** — the file is there; open it;
3. **neither** — ask the person, or say the floor is unknown.

And the sentence that makes the second case usable: **an installed plugin is
`plugins/video/kiso-film/` and nothing else.** The tool lives beside the plugin
in the collection and is not copied with it, so the file is present when you
are working on the plugin and absent when somebody is making a film. That
difference decides which branch applies and was invisible from inside the
skill — which is why it is now written there.

The skill also says to **name the source** in the line it writes about the
floor. A reader who knows a number came from a table can check it; a reader who
knows it came from the person cannot, and should not try.

### F-12 — a number in a number column

`trim_to_s` is now **always a number, equal to `duration_s` where nothing is
cut.** Empty was a hole on the canvas; missing was the hole the skill's own
rule forbids; and neither said the true thing, which is *this shot is used at
the length it is generated*. With a number on every row the column sums to the
film's length and nobody has to know a convention to read it.

### F-13 — a place gets what a character sheet got

The rule said to copy the screenplay's continuity entry for a place. Those
entries are prose for a reader, and they carry sentences like *"whenever we
return it is the same hour of the night"* — a rule about continuity across
scenes. Pasted into a first frame it puts an instruction about future scenes
into a still, and the model will try to satisfy it.

So, in both halves:

- **`screenplay`**: a place's bible entry is a paragraph a camera could be
  pointed at, plus one sentence per thing in it a shot might hold on its own —
  the same shape a character sheet has. Its **Rules** are a separate heading,
  and the skill says which sentence belongs where, with an example of each.
- **`shot-prompts`**: the three quoting cases became **four**. A shot of a
  place quotes the paragraph, or the sentence about the one thing it holds,
  exactly as an insert of a hand quotes the sentence about hands. **Never the
  Rules.** Where a place has rules and no paragraph, describe it from the
  screenplay's own concrete details and say so in one line under the prompt —
  a note back to `screenplay`, not a licence to invent a room.

### F-14 — the order in a two-word lighting value

`practical low-key`, never `low-key practical`: **the source first, the quality
second**, in the skill and in the reference. The two read the same to a person
and differently to anything that groups the column by value, so one look would
sit in two groups for no reason a viewer could see.

## 2. The consequence nobody asked about, caught before it shipped

**F-12 would have re-encoded every film.**

`compose` treats a declared trim as a reason to take the filtering path,
because the stream-copy path cannot cut a frame off anything. F-12 makes the
shot list write a trim on **every row**. A cut built from it therefore declares
a trim on every clip — and almost all of them cut nothing.

Left alone, every film this tool ever made would have been re-encoded to remove
nothing: slower, and lossy, for a column that exists to be readable.

So: **a trim that does not shorten is not a trim.** A trim counts only where it
is shorter than the clip actually is, by more than one frame at 24fps — because
a generator asked for three seconds returns 3.003, and a cut asking for 3 is
not asking for a frame to be removed. Whether a trim bites can only be known
after the lengths are read, so the decision moved to after the probe.

This is the third time in three lanes that a rule written in one file changed
what another file does. It is in §1 of the last record as *one edge, four
statements*; here it is one column, and the file it changes is a program.

## 3. Proof

```
$ npm run check
validate: green — 1 plugin in 1 category, read by the App's own rules
validate --selftest: green — 48/48 checks fire on a fixture that breaks them
cjk gate: green — source and records are English (ADR-L005)
# tests 91
# pass 91
# fail 0
```

Exit code 0. 87 tests became 91 on this branch.

| probe | what went red |
|---|---|
| a trim counted whenever one is written | `A TRIM THAT DOES NOT SHORTEN IS NOT A TRIM`, `a generator returning a hair over the asked length`, and `a clip whose length could not be read` |

All three at once, which is right: they are one rule read three ways — the
equal case, the tolerance, and the unknown length.

## 4. Open ruling points

**1. Two unmerged lanes both edit the tool's test count.** This branch is off
`3486995` and says 91; `film-cli-polish` is frozen off `d99833c` and says 93.
The two are disjoint in code and meet only on that line of the README.
*Recommendation: whichever merges second gets the line corrected in its
verdict*, and I have not guessed at a combined number here — a count written
for a tree that does not exist yet is the same error as a merge subject saying
eight after the record said ten.

**2. `compose` now needs `ffprobe` for any cut that declares a trim**, even one
that cuts nothing, because you cannot tell whether a trim bites without knowing
the length. After F-12 that is every cut a shot list produces.
*Recommendation: accept it.* `ffprobe` ships with `ffmpeg`, which `compose`
already requires, so it is not a new dependency — and the alternative is
trusting a declared number about a file without opening the file.

**3. The example still carries `"trim_to_s": ""` on eleven rows.** Not mine to
change. Whether the re-emission is worth another pass is the diff's to say.

## 5. Upstream findings

None, and the App was not touched.

## 6. What was left out and why

- **Nothing was pushed.**
- **The example.** Its author's.
- **A combined test count.** §4.1.

## 7. Verdict (leader, 2026-09-11)

**Approved and merged, with the conflict the executor had already resolved
and proved.** One commit, surveyed from the main checkout at 384301f: F-11
as a sentence about where the reader is standing — an installed plugin is
its own directory alone, so the floor's source has three cases and the
skill names which it is in and where the number came from; F-12 with the
consequence nobody asked about caught — a trim on every row would have
re-encoded every film to remove nothing, so a trim counts only where it is
shorter than the clip by more than a frame; F-13 changing the bible, not
only the quoting rule — a place gets a paragraph a camera can be pointed at
and rules under their own heading, never quoted; F-14 an order for two
lighting words. The branch was cut before `film-cli-polish` merged and the
two touch adjacent import lines in `cli.ts`; the resolution is both imports,
which the executor merged in a throwaway clone and ran rather than read,
and the leader applied the same resolution in the merge commit and ran the
suite on the merged tree — the count in the tool README is the measured one
from that run, not a number written for a tree that did not yet exist.
Rulings: (1) the merged count is written by whoever merges second, here;
(2) `ffprobe` for any cut with a trim is accepted — it ships with `ffmpeg`,
and the alternative is trusting a number about a file without opening it.
The example's empty `trim_to_s` rows wait for the diff to say whether a
third emission is worth it. Idle now until the owner's call.
