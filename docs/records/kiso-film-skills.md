# kiso-film v0 — the writing chain

## 0. In one line

`plugins/video/kiso-film` is the collection's first plugin: seven skills that
take one sentence to a shot list with a prompt written for every shot, a
cinematography reference they share a vocabulary from, and three declared
commands none of which v0 calls.

## 1. What was decided

The plugin is **declarative and stays so**: skills, one command-line tool
declared by name, and declared secrets. Nothing it ships runs in the host
app's processes, and installing it reads and copies files and runs nothing.

**v0 is the writing chain.** The frames, the clips and the cut belong to the
tool, which is the next lane. What is here takes an idea to the point where
every shot has a prompt.

**The skills are ours.** A closed reference product was read for what a film
skill must cover — its stage names and the headings of its craft references
are the map. Nothing was copied: every word here was written for this
repository, in English, and the two are not the same shape beyond both being
markdown skills.

**Three offers, on the writing chain only.** Offers for an image or a video
belong to the tool lane, because until the tool exists there is nothing behind
them.

## 2. What changed

| path | what it is |
|---|---|
| `plugins/video/kiso-film/kiso-plugin.json` | id `kiso-film`, category `video`, host `kiso-app`, seven skills, three commands, no secrets |
| `plugins/video/kiso-film/references/cinematography.md` | The fixed vocabulary the shot skills use: seven shot sizes, seven angles, nine moves, eight lighting words, plus how to reach for a shot from a feeling and how long a shot needs |
| `plugins/video/kiso-film/skills/brief/SKILL.md` | One sentence to `brief.md` |
| `plugins/video/kiso-film/skills/screenplay/SKILL.md` | `brief.md` to `screenplay.md`, with the continuity bible |
| `plugins/video/kiso-film/skills/characters/SKILL.md` | `screenplay.md` to one `characters/<name>.md` per character |
| `plugins/video/kiso-film/skills/shot-list/SKILL.md` | `screenplay.md` to `shots.json` |
| `plugins/video/kiso-film/skills/shot-prompts/SKILL.md` | `shots.json` plus the sheets to `prompts.md` |
| `plugins/video/kiso-film/skills/drama/SKILL.md` | A genre skill: the hook, five beats, the cliff. Emits nothing |
| `plugins/video/kiso-film/skills/film-study/SKILL.md` | A clip you have to `study/<name>.json` — its camera language as a shot list |
| `plugins/video/kiso-film/README.md` | What each skill makes, what is needed, and four things it will not do |
| `README.md`, `README.zh.md` | The index gains its first category and its first row |
| `plugins/.gitkeep` | Deleted. The layout lane added it so an empty `plugins/` would exist in a clone; a plugin holds the directory open now, and that record's §4.1 said this pull request is where it goes |

Seven skills and the reference come to about 800 lines.

### `shots.json` is a flat JSON array, and that is not a style choice

The host's table renderer accepts CSV, TSV, or **a top-level JSON array of
objects**, reading the keys as columns. Two consequences the shot skills state
outright:

- An object at the top level does not draw as a table at all. `{"shots": […]}`
  falls through to plain monospace text.
- A **nested** value renders as the words `[object Object]`, because each cell
  is stringified. So every value is a string or a number, and a field that is
  naturally a list is joined into one string.

This was read out of the renderer before the skills were written rather than
after a node came out wrong. A skill that produced the wrong shape would not
fail: it would emit successfully and draw badly, which is the failure a person
has to notice for you.

### Three commands, none of which v0 calls

`kiso-film`, `ffmpeg`, `ffprobe`. Declaring them now is right: declaring is not
granting, a project grants each by a person's click, and a missing one is
reported with the install hint the skill carries rather than fetched.
`@vincemakes/kiso-film` **is not published yet** and nothing in v0 calls it;
the README says so in the same table that names it, so a person reading the
row is not left to discover it.

`secrets` is empty. Nothing in the writing chain calls a provider — the prose
is the agent's own work, and `film-study` reads frames with ffmpeg. The
provider keys arrive with the tool, by name.

### What the skills say about safety, and why it is in the skills

Four lines that are rules rather than style, each in the skill where the
decision is actually made:

- `film-study` **downloads nothing**. If a person names a title rather than a
  file, it asks them for a file. It writes no transcript and does not
  reproduce the work — it writes sizes, angles, moves, lighting, and why a
  shot works where it is, which is how the craft is taught everywhere.
- `characters` and `shot-prompts` **write no appearance prompt for a child
  character and no real person's likeness**, and say so plainly rather than
  working around it.
- `shot-prompts` **names no living artist or studio as a style**, describing
  the lens, the palette and the era of the lighting instead.

A recipe is what the agent reads at the moment it decides; a rule in a README
is not.

## 3. Proof

```
$ npm run check
  OK    video/kiso-film
validate: green — 1 plugin in 1 category, read by the App's own rules
validate --selftest: green — 37/37 checks fire on a fixture that breaks them
cjk gate: green — source and records are English (ADR-L005)
```

Exit code 0.

**The validator was run before the skills existed**, and that is the useful
half. With the manifest written and `skills/` empty it named all seven files
it could not find, one line each — so the first thing this plugin proved is
that the collection's own guard bites on the collection's own first plugin,
rather than on a fixture.

The self-test's count is unchanged at 37: this lane added no rule, and a
fixture count that moved without a rule moving would be the thing to explain.

**What is NOT proven here.** No skill in this lane was executed. There is no
harness in this repository that runs a skill — running one means a host
application, a model and a person, and this repository has none of the three.
So what `npm run check` establishes is that the plugin **installs**: the
manifest parses by the host's rules, every declared skill exists with
frontmatter and a description the host's index will read, the layout is right,
and nothing is a symlink. Whether the recipes produce good films is a
judgement no exit code will ever make. §4 says what would narrow that gap.

## 4. Open ruling points

**1. The validator does not check offers, and the host drops a bad one in
silence.** An offer whose `from` or `makes` is not one of the eight renderer
words is skipped by the host's front-matter reader; the skill still loads and
the sentence simply never appears. That is exactly the class of silent drop
this repository refuses everywhere else — a manifest saying something the host
will not do. *Recommendation: add it, in a later lane*, since this one was
told to touch nothing outside the plugin's directory. It is about ten lines:
scan each `SKILL.md` for an `offers:` block and hold `from` and `makes` to the
eight words. The three offers here were checked by eye against the list.

**2. Two of the three offers appear on every markdown artifact.** *Write the
screenplay from this brief* is declared `from: markdown`, and so is *Break
this into shots* — the vocabulary is eight words and a brief and a screenplay
are both markdown. So selecting either one shows both sentences. That is the
host's deliberate choice, not a defect: a constraint finer than the renderer
vocabulary would be the type system the offers record exists to refuse.
*Recommendation: leave it.* Worth writing down because it will look like a bug
the first time somebody sees it, and the sentences are written to be readable
in either order.

**3. `film-study` emits under `study/`, which no other skill reads.** It is a
tool for a person, not a stage of the chain, so its output is a leaf on the
graph. *Recommendation: leave it a leaf.* Wiring it into `shot-list` as an
input would make "like that film" a pipeline rather than a reference, and the
person pointing at a clip usually wants two or three of its rows, not its
structure.

**4. The `drama` skill emits nothing.** It changes how three other skills
decide and adds no node. That is unusual enough that a reader may think it is
unfinished, so the skill says so twice — at the top and at the foot, where it
says that if you are about to emit from here, the stage you want is
`screenplay`. *Recommendation: this is the shape genre skills take*, and the
next one (product, explainer, marketing) copies it.

## 5. Upstream findings

None, and the App was not touched: nothing in this lane wrote to the kiso
desktop app's repository or ran any part of it.

Two things were **read** from it, because a skill that guesses at the host's
behaviour is a skill that will be wrong: the artifact tools' parameters, and
the table renderer's accepted shapes. The second changed what the shot skills
tell the agent to write, and is in §2.

## 6. What was left out and why

- **Nothing was pushed.**
- **The tool.** `@vincemakes/kiso-film` is declared and unpublished. It is the
  next lane, and nothing in v0 calls it.
- **Image and video offers.** They belong to the tool lane: an offer with
  nothing behind it is a sentence that fails when chosen.
- **Any provider secret.** v0 calls no provider, so the manifest declares no
  secret. Declaring one early would put a name on a plugin row that nothing
  ever reads.
- **A `scene` type, a declared board, and the three.js surface.** All three are
  host changes in a later step, not plugin content.
- **Genre skills other than drama.** Product, marketing and explainer come
  when they are wanted; `drama` establishes the shape.
- **`shared/references/`.** There is one plugin, so there is nothing shared
  yet. The cinematography reference lives inside the plugin, which is where an
  installed copy has to end up anyway.
- **Episode splitting, lip sync, music and narration.** Outside the concept.
