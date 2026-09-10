# Layout — a category is a directory

## 0. In one line

The three bootstrap plugins are gone, a plugin now lives at
`plugins/<category>/<id>/`, and the validator refuses the three ways that
shape can be got wrong — while an empty collection is green and says which
kind of green it is.

## 1. What was decided

Two rulings, both on 2026-09-10.

**The three plugins leave.** `fix-and-prove`, `short-drama` and `shorts-pack`
were copied here at the bootstrap from the kiso desktop app's `packs/`. They
are the app's own again. This repository keeps the format document, the
validator and the shape; it does not keep copies of the app's packs.

**A category is a directory.** `plugins/<category>/<id>/`, with
`plugins/video/kiso-film` the first that will exist. The manifest gains a
`"category"` field, and it has to agree with the directory above the plugin —
the same rule `id` already had, one level up.

**And the validator's emptiness guard moves rather than goes.** It refused an
empty `plugins/` at the bootstrap, on the grounds that a green run over
nothing proves nothing. That is true of a glob finding nothing *where
something is*; it is not true of a collection that is genuinely empty and says
so. The guard now points at the case it was written for.

## 2. What changed

| path | what it does now |
|---|---|
| `plugins/` | Empty. The three plugin directories are deleted; a `.gitkeep` keeps the directory itself, because the validator tells *no collection* from *an empty one* and git does not track empty directories |
| `scripts/validate.mjs` | `scanCollection()` walks `plugins/<category>/<id>/` and reports the three layout failures; `validatePlugin()` takes the category it is supposed to be in and checks the manifest against it; the self-test grew from 30 fixtures to 37 |
| `docs/plugin-format.md` | *The layout* is rewritten around categories, with a table of the two names that have to agree with the path; `category` is documented beside `host` as the second field this repository requires and the App ignores |
| `README.md` / `README.zh.md` | The table of three plugins becomes an index built from the directories. With none, it says the collection is open and names the first to come |
| `CONTRIBUTING.md` | The unit is one `plugins/<category>/<id>/` directory; the checklist gains the depth and the two path agreements; commit scopes are the plugin's `id`, not its category; a category invented for a single plugin is something to raise rather than to file |

### The three layout rules, and why each is an error

**A plugin at the flat depth** — `plugins/<id>/kiso-plugin.json` — is refused.
Copied by hand it still installs; what it does not do is appear anywhere a
person browsing this repository would look, because the index is built by
reading the directories. The red-proof below shows what it looks like with the
rule removed, and it is worse than being missed.

**A category with no plugin in it** is refused. A category exists because a
plugin is in it. There is no list of categories anywhere and there should not
be one — a second place to say what the directories are is a second thing to
keep in step — so an empty one puts a heading in the index that a reader can
click into and find nothing.

**A manifest whose `category` is not its parent directory** is refused, for
the reason `id` already was: **the path is the claim and the manifest is the
fact.** A reader browsing the repository learns the category from the path;
the App reads the manifest. Two ways of saying one thing drift, and the one
that drifts silently is the one nothing checks.

## 3. Proof

```
$ npm run check
validate: green — no plugins yet; the collection is empty
validate --selftest: green — 37/37 checks fire on a fixture that breaks them
cjk gate: green — source and records are English (ADR-L005)
```

Exit code 0, on a fresh clone.

**30 fixtures became 37.** Three are manifest cases — no `category`, a
`category` that is not a path segment, a `category` that is not the parent
directory — and four walk a built directory tree the way the runner does,
because the layout rules do not live in a manifest and cannot be reached by
breaking one.

The fourth of those four is the one that has to stay **green**: an empty
collection. A rule that must not fire needs a fixture as much as a rule that
must, or the day it starts firing is the day somebody's `npm run check` goes
red for no reason they can see.

**Each new rule was red-proved by removing it and watching its own fixture
fail.** One case each time, which is what says the fixtures are separable:

```
the flat-depth rule removed
  a plugin at the flat depth is refused: scanCollection returned
  {"problems":[],"empty":false,"plugins":["sample/skills"]}

the empty-category rule removed
  a category with no plugin in it is refused: scanCollection returned
  {"problems":[],"empty":false,"plugins":[]}

an empty collection made red again
  an empty collection is GREEN and says which it is: scanCollection returned
  {"problems":["plugins/ is empty"],"empty":false,"plugins":[]}

the category-against-parent rule removed
  a category that is not the parent directory: no error contained
  "the directory above this one is" (errors: NONE — the check did not fire)
```

**The first is worth reading twice.** With the depth rule gone, a flat plugin
is not skipped — it is *misread*. `plugins/sample/` becomes a category called
`sample`, and the `skills` directory inside it becomes a plugin called
`skills`. The index would grow a category named after a plugin, holding a
plugin named after a directory that is not one. That is the failure the rule
prevents, and it is not the failure I expected when I wrote it.

Each probe was reverted and the tree checked before the next.

## 4. Open ruling points

**1. `plugins/.gitkeep` exists so that an empty directory can be committed.**
Git tracks files, not directories, so without it `plugins/` would not exist in
a fresh clone and the validator would report *there is no plugins/ directory*
— a different and misleading failure. *Recommendation: it goes when the first
plugin lands*, and nothing here removes it automatically, because a file that
deletes itself under a condition is harder to reason about than one line in
the first plugin's pull request. Noted in that pull request's checklist is
better than a rule.

**2. The bootstrap record still describes three plugins.** It is history and
it was true when written; rewriting it to match today would remove the record
of a decision rather than record a new one. *Recommendation: leave it.* This
record is the amendment, and §1 says what changed and when.

**3. Nothing enforces that a category name is a good one.** The validator
checks the shape of a category and that it matches the path; it cannot check
that `video` is the right shelf. `CONTRIBUTING.md` now says a category
invented for a single plugin is a decision to raise in the pull request.
*Recommendation: leave it to review.* A list of allowed categories is exactly
the second place to say what the directories are that §2 argues against.

## 5. Upstream findings

None. Nothing in this lane read or touched the kiso desktop app.

The finding from the bootstrap still stands and is unchanged by the new
layout: a collection cannot be installed by its git URL, because the App reads
the manifest at the root of the clone. If anything, the category makes the
sub-path form more attractive —
`https://…/kiso-plugins#plugins/video/kiso-film` names exactly one plugin.
`docs/plugin-format.md` carries it.

## 6. What was left out and why

- **Nothing was pushed.**
- **No `shared/` root and no byte-identity gate.** Both were ruled out of this
  lane: there is no shared file yet, and a gate over an empty set is the same
  vacuous green this lane just moved a guard away from. They come with the
  first shared file.
- **No `requires` field.** Ruled out of this lane.
- **No category is created.** `plugins/video/` does not exist yet, because a
  category exists because a plugin is in it, and creating the shelf first
  would be the one thing the validator refuses.
- **The Actions workflow is unchanged.** It runs `npm run check` and nothing
  else, which is green on an empty collection.
