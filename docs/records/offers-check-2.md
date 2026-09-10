# Offers check, part two — the three the App drops, and the count that catches a dead parser

## 0. In one line

The last three silent drops in the host's offer reader are refused here, and a
second count of the `offers:` blocks catches the case that would otherwise
make all of it report nothing.

## 1. What was decided

The first offers lane closed one silence — a `from` or `makes` outside the
renderer words — and recorded three more it had not been asked to close:

- an offer with no **`says`**, which the host discards: there is no sentence to
  show;
- an offer with no **`from`**, which the host also discards: there is nothing
  for it to appear against;
- everything past **twelve** offers in one skill, which the host reads and
  then stops reading.

All three install today and do nothing. The skill loads, the plugin looks
complete, and the sentence an author wrote never appears anywhere.

They were ruled into one lane rather than three, because they are the same few
lines of scanning and each alone is too small to review usefully.

**And a fourth rule was added to make the other three mean something.** See
§2.

## 2. What changed

`scripts/validate.mjs` only.

**The parser keeps what the host throws away.** The port discarded an offer
with no `from` or no `says` in the same place the host does, which meant the
rule could never see them. It now keeps them with a `dropped` reason, and
`offerProblems` is the only reader — nothing treats a dropped item as a live
offer, and the count in the plugin's note is live offers alone.

**The declared-versus-parsed count.** A regex over the raw text counts
`offers:` block headers; the parser counts what it read out of them. A file
that plainly declares a block the parser reads nothing out of is refused.

That rule exists because of what the other three would look like when broken.
A ported parser can stop matching a shape without anything saying so — a list
indented with a tab, a block after a key the scanner treats as the end — and
then the number of parsed offers goes to zero, every rule below reports
nothing, and the run is green. **"Nothing was checked" and "nothing was wrong"
print the same line.** Counting the headers a second way, by a different
method, is what tells them apart.

## 3. Proof

```
$ npm run check
  OK    video/kiso-film
        note: 3 offers read and checked against the renderer words
validate: green — 1 plugin in 1 category, read by the App's own rules
validate --selftest: green — 48/48 checks fire on a fixture that breaks them
cjk gate: green — source and records are English (ADR-L005)
# tests 71
# pass 71
# fail 0
```

Exit code 0. 43 fixtures became 48: one per new rule, plus **twelve offers is
green** — the boundary, which is the fixture that would otherwise let the cap
be written as `>= 12` and refuse a legal skill.

### Red-proved, one rule at a time, and the verdict line read first

Every probe below was checked for a **verdict line** before its failures were
read. A run that produces no verdict has not finished, and its silence is not
a result — that is this evening's lesson, and it cost two probes in the last
lane before it was learned.

| probe | what went red |
|---|---|
| the no-`says` refusal removed | `an offer with no says` |
| the no-`from` refusal removed | `an offer with no from` |
| the twelve-offer cap removed | `more offers than the App reads` — errors NONE |
| the declared-versus-parsed count removed | `a declared block the parser reads nothing out of` — errors NONE |

**The first two failed for an interesting reason.** With the no-`says` rule
gone, the fixture still failed — but with the *count's* message rather than
the missing one:

> an `offers:` block is declared and the parser read no offer out of it —
> either the block is malformed, or this validator has stopped matching a
> shape the App still reads. Neither is safe to pass.

That is the count doing exactly the job it was added for, one layer under the
rules it was meant to protect. A file with a single malformed offer parses to
nothing, and the count notices even when the specific rule is missing. The
probes still distinguish, because each fixture asserts its *own* message and
not merely that something failed — a fixture that only checked "there was an
error" would have passed all four probes and proved nothing.

## 4. Open ruling points

**1. The count compares numbers, not positions.** A skill declaring two
`offers:` blocks where the parser reads one offer total is green: the count is
non-zero, so the rule does not fire. Catching that means matching blocks to
offers by line, which is a parser rather than a check. *Recommendation: leave
it.* A second `offers:` block in one file is not a shape anything writes, and
the rule as it stands covers the failure that actually happens — the parser
reading nothing at all.

**2. Twelve is written down in two places now** — the host's source and this
file — and nothing keeps them in step. That is true of every ported constant
here, and the port was chosen with its eyes open. *Recommendation: unchanged
from the first lane.* `docs/plugin-format.md` states the rules in full so a
reader can compare the two, and a drift is found by reading one against the
other.

## 5. Upstream findings

None, and the host was not touched.

The three drops closed here were found by reading the host's offer reader in
the first offers lane and are unchanged since. Nothing new was read from it.

## 6. What was left out and why

- **Nothing was pushed.**
- **Matching blocks to offers by position.** §4.1.
- **Anything outside `scripts/validate.mjs`.** The one real plugin's three
  offers were already correct, so the only evidence in this lane is fixtures
  and probes — as it was in the first.

## 7. Verdict (leader, 2026-09-10)

**Approved and merged.** One commit, two files, surveyed from the main
checkout at a6ddabf: the four rules as ruled — the declared-versus-parsed
count, an offer with no `says`, an offer with no `from`, more offers than
the App reads — each with its fixture, the twelve-offers boundary asserted
green so the cap cannot drift to a refusal of a legal skill, and the parser
keeping what it used to drop with the reason so the rules can see it while
the plugin's note counts live offers alone. The executor's counts: 48 of 48
fixtures, 71 tool tests, `check` exit 0 on a fresh clone; four red-proofs
with the verdict line read before the failures. The result worth keeping is
that two probes failed with the count's message rather than the removed
rule's, because a single malformed offer parses to nothing — which the
probes could tell apart only because every fixture asserts its own message.
The executor stops here, as asked; the graph lane waits on the App's
installer and the owner's first real call.
