# `gpt-image-2` — one field, and why only one

## 0. In one line

The model the first real call will run carries a published price now, so the
budget stop can be computed — and nothing else was added, because nothing else
had a source.

## 1. What was decided

The sample record's tenth finding: the one model authorised for a real call
carried no capabilities, no resolutions, no aspect ratios and no price, so the
budget ask the product plans — *price the graph before a byte is generated* —
would have landed on an empty entry.

The instruction was to fill it **from the provider's own documentation as far
as a source says, and leave absent what no source states.** That second half
did most of the work.

## 2. What changed

One field:

```json
"price": { "perImageUsd": 0.0085 }
```

### Where that number comes from, and why it is the only one

**The provider publishes it.** Their own page for this model states `$0.0085`
per image. A second, independent source — a generated model catalog in the
product this collection takes its table from — records `pricePerImage: 0.0085`
for the same model. Two sources, the same figure, one of them the provider's
own. That is the strongest sourcing any number in this table has.

**A third figure was found and rejected.** A prose line in the same secondary
source says *"Costs ~$0.006 per image."* It is approximate by its own tilde,
it disagrees with that source's own structured data, and it is plausibly the
discounted rate the provider's page advertises beside the list price. A number
with a tilde in a sentence loses to the same number in a table and on the
vendor's own page.

### What was looked for and deliberately not carried

| field | what a source said | why it is absent |
|---|---|---|
| `maxResolution` | the provider's page says *"native 4K output"*; the only structured source says the route used is a **1k variant** | those answer different questions — what the model can do, and which variant somebody configured. Neither states this route's maximum |
| `aspectRatios` | a secondary source maps `16:9`, `9:16`, `1:1`, `4:3` to pixel sizes | that is what one client **sends**, not what the model **accepts**. Carrying it would turn one integration's choices into a capability |
| `capabilities` | nothing about this model | the block would have to assert six things, and no source states any of them |
| `resolutions` | nothing | as above |

The detailed API documentation is behind an index that does not list an images
page; the endpoint and parameter names in `data/providers.json` remain what the
apimart lane wrote, and remain unverified.

### The entry is still `verified: false`, and that is not a formality

The flag flips on one of two grounds: a real call that worked, or a person
reading **that entry** against the provider's own documentation. A price was
read against the provider's own published figure. **An entry is not a field.**
Its capabilities, its resolutions and its aspect ratios are still unsourced,
and the route it is reached by has never been called. Reading one field is not
reading the entry, and a flag that moved on one field would say the whole was
checked.

## 3. Proof

```
$ npm run check
  OK    video/kiso-film
validate: green — 1 plugin in 1 category, read by the App's own rules
validate --selftest: green — 48/48 checks fire on a fixture that breaks them
cjk gate: green — source and records are English (ADR-L005)
# tests 88
# pass 88
# fail 0
```

Exit code 0. 87 tests became 88.

**A test had to change, and the change is the finding.** The apimart lane
asserted that this entry had *no* price, with a comment explaining that a
missing price is reported rather than treated as zero. That test now asserts
the price and, separately, that the entry is still unverified — because the
thing worth holding is no longer "it has no price" but "a priced field did not
make it a checked entry".

And the new test is the one F-10 actually asked for: a shot list priced with
this model produces a total rather than *not priced*.

```
  clips           2, 7s          $3.31  Seedance 2.5 (unverified)
  first frames    2              $0.02  GPT Image 2 (unverified)

  total            $3.33

UNVERIFIED PRICES. …
```

## 4. Open ruling points

**1. `kiso-film models` prints `$0.01/image` for three different models.**
`0.0085`, `0.0125` and `0.03` all round to two decimals in that column, so the
page a person chooses a model from cannot distinguish the cheapest from three
times the cheapest. Out of this lane's scope and worth one line of its own.
*Recommendation: three decimals in that column, or cents.*

**2. The tool crashes with `EPIPE` when its output is piped to something that
closes early** — `kiso-film models | head` prints a stack trace after the rows.
I hit it while checking this lane's own output. It is two lines to fix and is
not this lane. *Recommendation: a one-line lane, or fold it into the next one
that touches the CLI.*

**3. The unverified paragraph now slightly over-states itself.** It says every
figure *"has not been checked against the provider's own documentation or a
real call"*, and one figure now has been. *Recommendation: leave it until the
first real call*, because the sentence is true of the table as a whole and
weakening it to be exact about one field would make it easier to ignore.

## 5. Upstream findings

None, and the App was not touched.

## 6. What was left out and why

- **Nothing was pushed. No call was made. No flag was flipped.**
- **Everything in §2's table.** No source stated it.
- **The route's endpoint and parameters.** Unchanged and unverified; the
  provider's technical documentation was not reachable from its index.
- **The three ruling points.** Each is real and none is this lane.

## 7. Verdict (leader, 2026-09-11)

**Approved and merged.** One commit, one field, surveyed from the main
checkout at f69b5e8: `gpt-image-2` gains a price with the best sourcing in
the table — the vendor's own page and a structured catalogue agreeing, a
third figure with a tilde in a sentence rejected for the right reason — and
nothing else, because "native 4K" and "the 1k variant" answer different
questions and what one client sends is not what a model accepts. The entry
stays `verified: false`, and the reasoning is the ruling: an entry is not a
field, and a flag moved on one field would say the whole was checked. The
test that had to change is the finding kept — a priced field did not make a
checked entry — beside the test F-10 asked for, a shot list priced with this
model giving a total. The executor's counts: 88 tool tests, 48 fixtures,
`check` exit 0 on a fresh clone, no call made. §4: the rounding that shows
three prices as one and the `EPIPE` crash under a closed pipe are a two-item
lane now, before the owner runs `models`; the unverified paragraph stays as
it is until the first real call, for the reason given.
