# kiso-film tool, part two — the providers, and what a fake server cannot prove

## 0. In one line

`image` and `video` generate; every byte they send goes through one file that
a test keeps as the only one able to reach the network; and the part that
cannot be verified without spending money — how a provider is actually talked
to — is data that says so on every screen it appears on.

## 1. What was decided

**There is no per-provider code.** A provider is a row in
`data/providers.json`: where a job is submitted, how the key is put in a
header, which field the job id comes back in, where it is polled, what its
states are called, and where the finished file's URL sits. One driver reads
that and runs the job. A third provider is a third row.

That shape came out of a finding rather than a preference. **The reference
product does not contain the wire protocol** — it calls its providers through
a vendor SDK, so what is readable there is two endpoint forms and nothing
about bodies, poll fields or result shapes. A client written here therefore
rests on knowledge of two third-party APIs, and the only thing that would test
it is a fake server *also written here*. **A fake cannot disconfirm a belief
about somebody else's API; it encodes it.** So the belief was moved out of the
code and into data, where it carries `verified: false`, is corrected by an
edit rather than a release, and announces itself.

**The second provider was kept, and the question it raised dissolved.** On the
merged table, `fal` serves 21 of 22 models — all the seedance and kling
entries and all four image models — and `byteplus` serves one, whose
`motionReference` is `false`, so it cannot run the spike. That was worth
raising before building, because a second hand-written client would have been
a second unverifiable wire protocol bought for one row. With the driver
data-driven it is one row, one code path, and both routes unverified.

**No entry became verified in this lane.** A real call is the owner's act with
the owner's keys and the owner's money. Nothing in the suite makes one.

## 2. What changed

| path | what it is |
|---|---|
| `src/net/http.ts` | **The one file that reaches the network.** Sends, downloads to a file, refuses plain http off this machine, refuses a key in a URL, and redacts every registered secret out of every message it produces |
| `data/providers.json`, `data/providers.schema.json` | The two routes, as data, both `verified: false` |
| `src/providers.ts` | Loads and validates them; dotted-path reads, each site trying a *list* of paths so a wrong guess is one array entry from correct |
| `src/generate.ts` | Submit, poll, download. Reads the key once, registers it for redaction on the next line, puts it in a header |
| `src/request.ts` | Builds the body from the table's own parameter names, and refuses what the model cannot do — **before anything is sent** |
| `src/cli.ts` | `image` and `video`; `--dry-run`; `compose` now reads real durations |
| `src/compose.ts` | `probeDurations` — the real lengths, from `ffprobe` |
| `test/fake-provider.ts` | A provider in this process |
| `test/generate.test.ts`, `test/request.test.ts` | 17 new tests |
| `test/no-network.test.ts` | Rewritten: the allow-list is now one named file, asserted in both directions |
| `test/cli.test.ts` | The two commands' behaviour, and the canary extended to them |
| `plugins/video/kiso-film/…`, `README.md` | Unchanged and updated respectively |

### The capability refusal is the spike's switch

```
$ kiso-film video --model veo-3-1 --motion-ref move.mp4 …
  Veo 3.1 (text-to-video) does not take a motion reference. Models in the
  table that do: seedance-2-5, seedance-2-0, kling-o3, kling-v3-standard,
  kling-o1-ref.
Veo 3.1 (text-to-video) was asked for something it does not do. Nothing was sent.
```

A model given a reference it cannot use either ignores it — and the person
pays for a shot that did not do what they asked — or fails with the provider's
own error, which says nothing about why. So it is refused here, with the
reason and with the models that would take it, and every complaint is listed
at once rather than one run at a time.

### What a failing route says

The two most likely failures of an unverified descriptor are that it looks in
the wrong place for the job id and for the output URL. Both messages name the
descriptor rather than the provider:

> …accepted the job and this route does not know where it put the job id — it
> looked at `request_id`. The route is unverified data; correcting it is an
> edit to `data/providers.json`.

A state the route does not know is refused rather than polled for ever, and a
job that never settles gives up at a deadline saying nothing was downloaded.

## 3. Proof

```
$ npm run check
  OK    video/kiso-film
validate: green — 1 plugin in 1 category, read by the App's own rules
validate --selftest: green — 43/43 checks fire on a fixture that breaks them
cjk gate: green — source and records are English (ADR-L005)
# tests 71
# pass 71
# fail 0
```

Exit code 0. **No test makes a real call.** The fake provider runs in the same
process on `127.0.0.1`, which is the only place `src/net/http.ts` will speak
plain http to.

### Exactly one file may reach the network, asserted both ways

The allow-list is one named path, not a directory — a rule shaped as
"anything under `src/net/`" would let a second client in without a word. The
suite asserts that nothing else in `src/` **or in the built output** reaches
the network, and that the allowed file **does**: an allow-list pointing at a
file that no longer calls anything is a rule that has quietly stopped
describing the program.

### Red-proved, and one probe that lied

| probe | what went red |
|---|---|
| a `node:https` import added to `estimate.ts` | the two "nothing else reaches the network" tests |
| a debug print of `process.env` on the key path | the canary test, naming the command and the stream; and the "a key is read in exactly two places" test |
| the allow-list pointed at a file that calls nothing | the "the allowed file DOES reach the network" test, with its own message |

| the unverified-route line changed so it no longer says it | the missing-key test, which now asserts that line as well |

**The third probe lied the first time and I nearly believed it.** I broke the
allowed file by removing its imports; the suite reported no failures, and I
read that as the check not firing. It was a **compile error**: `npm test` is
`build && test`, so nothing ran at all. The grep for failures saw silence, and
silence is what a check that did not fire also looks like.

The tell was there and I had not looked for it: there were no *passes*
either. **A red-proof has to assert that the suite RAN**, not only that
something failed — a count of passes distinguishes "the check did not fire"
from "nothing was checked". The probe was re-shaped to keep the program
compiling, and then it fired.

**And it happened again within the hour, on the fourth probe** — `if (false)`
in front of the line broke the narrowing that the exit above it provides, so
`route` became possibly-undefined and nothing compiled. This time the lesson
was an hour old and the pass count was the first thing looked at: no passes,
so no run, so no result. The probe that works changes what the line *says*
rather than whether it runs, which leaves every type intact. A probe has to be
a change the compiler accepts, and the cheapest such change is usually to a
string rather than to control flow.

### Where the unverified-route line is asserted, and where it was not

The line naming a route unverified is printed twice over: by `models` beside
the prices, and by `image` and `video` before they send. On the send path:

```
$ FAL_KEY= kiso-film video --prompt x --out no.mp4 --duration 5 --model seedance-2-5
the route to fal.ai is unverified — it has not been checked against a real
call. If this fails oddly, data/providers.json is the first place to look.
FAL_KEY
exit 2
```

**Only the `--dry-run` form of it was asserted when this lane was first
delivered.** The send-path line — the one a person reads the first time they
spend money, which is the whole reason it exists — was untested, and the
missing-key test would have kept passing without it, because that test reads
the LAST line of stderr and the warning is not the last line. A claim covered
where covering it was easy and not where it mattered.

It is asserted now, on the same invocation, and red-proved by changing what
the line says.

### A key is read in two places, and the test names both

One asks whether the variable is *set*, for the reachable marker, and never
reads the value. The other reads it once, registers it for redaction on the
next line, and puts it in a header. A third place is what the test catches,
and a third place is how a key ends up in a log line.

The canary now covers the two commands that can send, including their failure
paths, because an error message is where a value most often escapes.

### What this suite CANNOT show

That any descriptor matches its provider. The fake answers in the shape the
descriptor expects because both were written here. Everything around the wire
— the header, the polling, the failure handling, the deadline, the redaction,
where the bytes land — is real and tested. The wire itself is unproven until
the owner runs a real call with a real key, which is the next thing after this
lane and is theirs.

## 4. Open ruling points

**1. A local file is named, not uploaded.** `--ref`, `--start`, `--end` and
`--motion-ref` become `file://` URLs in the request body. Providers differ in
how they take a local file — some want a signed upload first, some a data URL
— and inventing one shape would be a third unverified guess. *Recommendation:
let the first real call decide it*, and add an `upload` step to the descriptor
when it is known. Today a local path reaches the provider as a name it will
not resolve, so the honest use of `image` and `video` is with URLs until then.
Named here rather than left to be discovered.

**2. `byteplus` is one row and cannot run the spike.** Kept because it is one
data row and no extra code. *Recommendation: verify `fal` first and leave
`byteplus` unverified* until something needs `seedance-1-5`.

**3. A cross-fade's real durations are read now, and a clip whose duration
cannot be read is treated as zero** with its name reported. Zero puts the next
fade at the earliest possible offset, which is visibly wrong in the result
rather than subtly wrong. *Recommendation: keep it visible rather than
guessing an average.*

## 5. Upstream findings

None, and the App was not touched: nothing in this lane wrote to it or ran any
part of it.

The reference was read once more and the finding is in §1: **it does not
contain the wire protocol**, because it uses a vendor SDK. That is the reason
this lane's shape is what it is, and it is worth recording because the next
person to reach for it as a reference will find the same absence.

## 6. What was left out and why

- **Nothing was pushed, and nothing was published.**
- **A real call.** The owner's act, with the owner's keys.
- **Uploading local files.** §4.1.
- **Any `verified: true`.** Nothing here earns it.
- **A retry.** A failed generation costs money; retrying without being asked
  spends it twice. When a retry lands it belongs beside the budget ask.
- **Fallback routes.** Still out, for the reason the first half gave: a
  fallback nobody has watched fail is a code path nobody has tested.

## 7. Verdict (leader, 2026-09-10)

**Approved and merged.** Surveyed from the main checkout at 3f6c573 and merged one commit later: fifteen files, all inside the package and its record; a provider is
a row in `providers.json` under its own schema — `fal` and `byteplus`, both
`verified: false`, the wire shape as data because the reference goes through
a vendor SDK and holds no protocol to read — and one driver reads the row.
Exactly one file may reach the network, named by path in both the source
and the built output, asserted in both directions; a key is read in two
places the test names, registered for redaction before it is used, put in a
header and never a URL, and the canary now covers the two sending commands
and their failure paths; the unverified-route line on the SEND path is
asserted in the commit the executor added after reporting, unasked, that
only its dry-run form was covered — the record's §3 says what is covered
where. `--motion-ref` refuses before sending and names
every model that takes one. The executor's counts: 71 of 71, `check` exit 0
on a fresh clone; no real call made and nothing `verified: true`, which is
the right state for a lane with no keys of its own. Rulings on §4: the
first real call decides the upload step and the descriptor grows it — until
then the honest use is URLs, as the record says; byteplus stays a row;
a duration `ffprobe` cannot read is a zero with its name. The lesson worth
the whole lane — a red-proof asserts the suite ran, and a pass count is what
separates "the check did not fire" from "nothing was checked" — goes into
the App's engineering §8 by the leader. Next in the collection:
`kiso-plugins-offers-check-2`; the first real call is the owner's, with
their keys, and it opens the graph lane.
