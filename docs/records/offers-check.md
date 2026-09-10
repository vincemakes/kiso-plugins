# Offers check — a sentence the host will never show

## 0. In one line

The validator now refuses an offer whose `from`, or whose written `makes`, is
not one of the host's eight renderer words — the last silent drop this
collection knew about and had not closed.

## 1. What was decided

An offer is a sentence in a skill's front matter saying what that skill can
make from what. `from` and `makes` take **exactly the eight renderer words**,
and `file` is one of the eight rather than an addition to them.

The host does not refuse a word outside that set. It reads it, keeps it, and
the sentence simply never appears — because no artifact is ever of that type.
The skill loads, the plugin installs, and the one thing the author wrote the
offer for does not happen. Nothing anywhere says so.

That is the same shape this file already refuses for `secrets`, `commands` and
MCP servers, one level further out: a declaration saying something the host
will not do. It was recorded as a ruling point when the first plugin landed,
and this closes it.

## 2. What changed

`scripts/validate.mjs` only.

**`parseOffers` is ported from the host's own reader.** The host reads the
`offers:` block with a small block-list scanner rather than through its flat
front-matter subset, so a check that read the block any other way would be
checking a different file from the one the host reads. Three parts of the port
look like details and are not:

- `from` and `makes` are **lower-cased**, and a media type narrows to its
  top-level word — `image/png` is `image`. So `Image` and `image/png` are both
  legal and neither is a finding.
- An offer with no `from` or no `says` is **dropped by the host, silently**, so
  it never reaches this rule.
- **`makes` is optional.** Absent, the host reads it as `file`. Refusing an
  absent `makes` would refuse something that works.

**The rule** is then one comparison against the set, with a message that says
what was written rather than what it became, and says what the host would do
with it.

**And the run reports how many offers it read.** See §3 — this is the half of
the change that keeps the other half honest.

## 3. Proof

```
$ npm run check
  OK    video/kiso-film
        note: 3 offers read and checked against the renderer words
validate: green — 1 plugin in 1 category, read by the App's own rules
validate --selftest: green — 43/43 checks fire on a fixture that breaks them
cjk gate: green — source and records are English (ADR-L005)
```

Exit code 0, on a fresh clone.

### The real collection does not exercise this rule, and saying otherwise would be wrong

This lane was branched from the tip that carries `kiso-film` so the rule would
have real offers to bite on. **It does not bite on them.** All three are
correct, so the run is green, and it would be green with the rule present or
absent — as it was in every probe below.

What the real run does establish is the other direction, and it is worth
having: the rule produces **no false positive** on the three real offers in
the collection. A rule that refused `kiso-film`'s own front matter would have
been caught here rather than by an author.

### Six fixtures, four of them boundaries

`sound` is the word that must be refused and `audio` the one that must pass,
because the two are the same idea in English and only one of them is a
renderer word — which is exactly how an author gets this wrong. The four
around them are boundaries, and **getting a boundary wrong here would refuse
something that works**, which is worse than the silence this rule ends:

| fixture | expected |
|---|---|
| `from: audio` | green |
| `from: sound` | refused |
| `makes: audio` | green |
| `makes: sound` | refused |
| no `makes` at all | green — the host reads it as `file` |
| `from: Image/PNG`, `makes: Video` | green — lower-cased and narrowed |

### Red-proved three ways

```
the offers rule removed
  an offer whose from is not a renderer word: errors NONE — the check did not fire
  an offer whose makes is not a renderer word: errors NONE — the check did not fire

an absent makes wrongly refused
  an offer with NO makes is legal — the App reads it as file: expected green, got
  — offer "Do the thing" is `makes: `, which is not a renderer word

the lower-casing and narrowing dropped
  a media type narrows to its top-level word, and case does not matter: expected green, got
  — offer "Do the thing" is `from: Image/PNG`, which is not a renderer word
```

The first is the rule. The second and third are the two ways this rule could
have been *stricter than the host*, and each is caught by a fixture that
expects green — the kind of fixture that is easy to leave out, because it
looks like it is testing nothing.

### The count exists because a dead parser passes everything

A ported parser that silently matched **no** front matter at all would report
no problems, for every plugin, for ever. The run would be green and would look
exactly as it does now.

Two things guard that. The self-test is the real one: with the block header
made unmatchable, two fixtures stop firing and the run goes red.

```
a parser that reads nothing
  validate --selftest: RED — 2 of 43 checks did not fire
```

The note on the plugin's line is the visible one: *3 offers read and checked*.
With the same break, that line is simply absent — which is not a failure, and
§4 says what would make it one.

## 4. Open ruling points

**1. A plugin whose skills declare offers that all parse to zero is green,
with one note missing.** The self-test catches a parser that is dead
everywhere; it would not catch one that reads most blocks and silently skips a
shape — an offers list indented with a tab, say. *Recommendation, and not
built because this lane was told to hold to one rule:* count `offers:` block
headers with a plain text scan and compare that count with the parsed one,
red where they differ. About six lines, and it turns "the note is missing"
into "two blocks were declared and one was read".

**2. Three more silent drops are still open in the host's offer reader**, and
none is closed here. An offer with no `says` is dropped; an offer with no
`from` is dropped; and past twelve offers in one skill the rest are dropped.
All three are the same class as the one this lane closed. *Recommendation:
one later lane for all three*, rather than one per rule — they are the same
five lines of scanning, and each on its own is a change too small to review
usefully.

## 5. Upstream findings

None, and the host was not touched.

One thing was **read** from it and copied in behaviour rather than in text:
the offer reader's parsing rules, because a check that guesses at them checks
a file nobody reads. The three subtleties above — lower-casing, media-type
narrowing, and an optional `makes` — are all things the port would have got
wrong by writing what seemed reasonable instead of what the host does.

## 6. What was left out and why

- **Nothing was pushed.**
- **The three other silent drops.** §4.2.
- **The declared-versus-parsed count.** §4.1.
- **Anything outside `scripts/validate.mjs`.** No skill, manifest, document or
  README changed: the three real offers were already correct, which is why the
  only evidence in this lane is fixtures and probes.

## 7. Verdict (leader, 2026-09-10)

**Approved and merged.** One commit, two files, surveyed from the main
checkout at 0a2a2a0: the rule refuses an offer whose `from` or `makes` is
outside the App's eight renderer words — the eight exactly, my "plus `file`"
corrected by the executor before a line was written — and the parser is
ported from the host's own reader rather than written from the ADR, which
is what keeps three of the host's rules (lower-casing and narrowing, the
silent drop of an offer with no `from` or `says`, `makes` optional and read
as `file`) from being "improved" into refusals of front matter that works.
The two green fixtures that guard those are the ones this verdict values
most. The executor's counts: 43 of 43 fixtures, `check` exit 0 on a fresh
clone with the plugin's line saying *3 offers read and checked*; red-proved
three ways, two of them the two ways the rule could have been stricter than
the host. The correction to the lane's framing is accepted as written: the
real collection proves no false positive, the self-test proves the rule.
Rulings: §4.1 and §4.2 as one later lane, `kiso-plugins-offers-check-2`,
after `kiso-film-tool`. Next: `kiso-film-tool`.
