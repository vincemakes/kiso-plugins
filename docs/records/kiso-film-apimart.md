# apimart — the route the first real call goes through

## 0. In one line

One image model and one provider route added as data, a driver path for a
provider that answers with the result instead of a job, and a section written
for the owner to make the first real call this repository has ever supported —
which found two defects on the way, one of them already merged.

## 1. What was decided

The owner authorised **one real call: an image, through APImart, with
`gpt-image-2`.** No video, no other model. They hold the key and make the call
in their own shell; nothing here sees, uses or writes a key, and this lane
makes no call at all.

## 2. What changed

| path | what it is |
|---|---|
| `data/providers.json` | The `apimart` route, `verified: false` — and `modelParam` on two existing routes, which is §2's first defect |
| `data/providers.schema.json` | `poll` is now optional; `submit` gains `modelParam`, `outputUrlPaths`, `outputBase64Paths` and `synchronousWhenNoJobId` |
| `data/models.json` | `gpt-image-2`, image, apimart, `verified: false`, **no price** |
| `src/generate.ts` | The synchronous path, base64 output, `finalBody`, and three guards on what arrived |
| `src/providers.ts`, `src/cli.ts` | The types, and a dry run that prints the body that would really be sent |
| `test/fake-provider.ts` | Two synchronous shapes and the trap |
| `test/generate.test.ts`, `test/cli.test.ts` | 9 new tests |
| `tools/kiso-film/README.md` | *The first real call*, written for the owner |
| `plugins/video/kiso-film/kiso-plugin.json` | `secrets` gains `APIMART_API_KEY` |

### Synchronous is a property of the ANSWER, not of the provider

The reference's own source carries a comment recording an incident. This
provider's image endpoint answers in two shapes:

- `{data:[{url}]}` with no task id — the answer *is* the result;
- `{data:[{url, task_id, status}]}` — a job, where the URL is the slot the
  file *will* occupy and is a 404 until the job finishes.

Their code took the URL when one was present, and shipped a dead link
downstream. The rule they arrived at, and the rule built here: **a job id, if
one is there, wins over any URL beside it.**

So the descriptor does not say "this provider is synchronous". It says
`synchronousWhenNoJobId`, the job id is looked for first, and the synchronous
branch is reached only when there is none. A test drives the trap shape and
asserts the job was polled rather than the slot taken.

Carrying that across was the point of reading the reference: it is a fact
about somebody else's API, learned the expensive way, and it would have been
learned again with the owner's money.

### Two defects, and one of them was already merged

**The model id never reached the provider on two of the three routes.** `fal`
names it in its URL; `byteplus` and `apimart` have a fixed submit URL and take
the model as a body field — and nothing put it there. A call through either
would have sent a prompt and no model, and the provider would have answered
about whatever its default is: a call that costs money, produces the wrong
thing, and carries nothing in the answer to say why.

`byteplus` shipped in the providers lane with this. It was never caught
because no route was ever called, and the fake provider does not care what
model it is asked for. Fixed here for both, refused in code when a route names
the model nowhere, **and asserted against the real file** — a test walks every
shipped route and requires it to name the model in one place or the other.

**The dry run printed a different body from the one that would be sent.** It
showed the request before the route touched it, so it did not show the model
field at all. A dry run that does not show what would go is a check that
agrees with itself; both now call `finalBody`.

### Three guards on what arrived

A route that hands back a URL whose file is not there answers, and what it
answers with is not a file. So: an empty download is refused, a body that
begins like JSON or HTML written into a `.png` is refused, and each says the
route is the thing to look at. Success is the only thing that should look like
success.

### `gpt-image-2` has no price, and that is the honest entry

No source was found for it. The field is absent rather than guessed, so
`estimate` reports it as not priced instead of adding a zero — which is why a
missing price has always been `null` here and never `0`.

## 3. Proof

```
$ npm run check
  OK    video/kiso-film
        note: 3 offers read and checked against the renderer words
validate: green — 1 plugin in 1 category, read by the App's own rules
validate --selftest: green — 48/48 checks fire on a fixture that breaks them
cjk gate: green — source and records are English (ADR-L005)
# tests 81
# pass 81
# fail 0
```

Exit code 0. 71 tests became 81. **No real call is made by anything here.**

### Red-proved, and every probe's counts read before its failures

| probe | what went red |
|---|---|
| the job id no longer winning over a URL beside it | `A JOB ID BESIDE A URL WINS` |
| the empty-download guard removed | `an empty file from a URL that answered is REFUSED` |
| the text-instead-of-a-file guard removed | `text where a file should be is refused` |
| `modelParam` removed from the shipped routes — **the defect exactly as it was merged** | `EVERY SHIPPED ROUTE names the model somewhere` |

The last one is the useful one: it reproduces the state the repository was
actually in an hour ago, and the new test catches it.

### The canary covers the new provider

`APIMART_API_KEY` joins the canary environment, and the two `gpt-image-2`
paths — dry run and real invocation — join the commands it is checked across.

## 4. Open ruling points

**1. The apimart descriptor is a guess in three places, and the call will say
which.** What has a source: the base URL, the endpoint, the `Bearer` header,
that the model goes in the body as `model`, and that the result sits at
`data[0].url` or `data[0].b64_json`. What does **not**: the poll URL and its
state words, which were written by analogy because the reference polls through
its own client. *Recommendation: expect the poll half to be wrong if the call
returns a task id*, and treat that as the descriptor doing its job — one edit,
not a release.

**2. `byteplus`'s route has now been edited twice without ever being called.**
Each edit is a better guess than the last and none is evidence. *Recommendation:
leave it unverified and consider removing it* if nothing needs `seedance-1-5`
by the time the graph lane starts — an unexercised route that keeps being
adjusted is a liability pretending to be a feature.

**3. A record in this repository names the closed reference product.**
`docs/records/kiso-film-skills.md` carries its name in a sentence added by the
review, not by the lane. This repository is public and the product is not.
*Recommendation: the reviewer decides* — it is their sentence, it is defensible
as attribution, and it is not mine to edit. Raised because a name is the one
thing that cannot be un-published.

## 5. Upstream findings

None, and the App was not touched.

One thing was read from the reference and it is in §2: the two answer shapes
and the rule for telling them apart. That is a fact about a third-party API,
recorded there because somebody paid for it.

## 6. What was left out and why

- **Nothing was pushed. No call was made. No `verified` flag was flipped.**
- **Video through apimart.** The owner authorised an image.
- **Any other image model.** Same.
- **A price for `gpt-image-2`.** §2.
- **A command to flip `verified`.** It moves by hand, one entry at a time, in
  a commit that names the call — the README says how. A command would make it
  a step in a script rather than a person's judgement.

## 7. Verdict (leader, 2026-09-11)

**Approved and merged.** One commit, surveyed from the main checkout at
9c2d383: the `apimart` route and `gpt-image-2` as data, both `verified:
false`, the manifest naming the third secret; the trap the reference paid
for once — a URL that is the slot a file will occupy rather than the file —
encoded as `synchronousWhenNoJobId` with the job id looked for first and a
test that drives the trap shape; no price where no source was found, and
`estimate` saying so rather than adding a zero. The finding that matters
most is the one already merged and now fixed: **the model id never reached
the provider on the two fixed-URL routes** — a prompt and no model would
have gone out, money spent on the provider's default — asserted now against
the real file for every shipped route, red-proved by reproducing the state
of an hour earlier; and the dry run showing the body that would go, which
it did not before. A fake provider does not care what model it is asked for;
the assertion that walks the shipped routes is what a fake cannot give.
Rulings: (1) the call decides the poll half, and a wrong guess there is the
descriptor doing its job; (2) `byteplus` stays as unverified data until the
graph lane, which removes it if nothing needs its one model — an
unexercised route edited twice is not a feature; (3) the closed reference's
name in the skills record was the leader's sentence and the leader removes
it at this merge. The first real call is the owner's, image only, by the
README's order; the executor made none. The executor's counts: 81 tests,
48 fixtures, `check` exit 0 on a fresh clone.
