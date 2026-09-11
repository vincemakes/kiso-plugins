# Two things a person meets in the first minute

## 0. In one line

`kiso-film models` stopped printing two different prices as the same number,
and stopped following its own output with a stack trace when you pipe it to
`head`.

## 1. What changed

**A rate prints the figure the table carries.** The price column used two
decimals, which is right for a total and wrong for a rate:

```
before                         after
$0.03/image   flux-dev         $0.025/image
$0.01/image   seedream-4-5     $0.01/image
$0.01/image   gpt-image-2      $0.0085/image
```

Two entries printed the same price while differing by nearly a fifth, and a
third was rounded **up** — on the page a person chooses a model from. A
rounding that makes two different numbers print the same is not a display
choice; it is the table saying something it does not know.

`formatUsd` is unchanged and still two decimals: a **total** is money someone
is asked to approve. `formatRateUsd` is new and prints at least two decimals,
up to six, trailing zeros trimmed.

**A closed pipe is the reader's decision, not the program's failure.**
`kiso-film models | head` closes the pipe once `head` has its lines, and every
later write fails with `EPIPE`; Node turns an unhandled stream error into an
uncaught exception. So the rows a person asked for were followed by a stack
trace, on the command they would run first. Both output streams now exit
quietly on `EPIPE` and still raise on anything else.

## 2. Proof

```
$ npm run check
validate: green — 1 plugin in 1 category, read by the App's own rules
validate --selftest: green — 48/48 checks fire on a fixture that breaks them
cjk gate: green — source and records are English (ADR-L005)
# tests 93
# pass 93
# fail 0
```

Exit code 0. 88 tests became 93.

| probe | what went red |
|---|---|
| the rate column reverted to two decimals | `TWO DIFFERENT PRICES NEVER PRINT THE SAME` and `the three cheapest image models are told apart` |
| the `EPIPE` branch made unreachable | `A CLOSED PIPE IS NOT AN ERROR` |

### The general test was wrong first, in a way worth recording

`TWO DIFFERENT PRICES NEVER PRINT THE SAME` began by calling `formatRateUsd`
and comparing its answers. It passed — **and it went on passing with the CLI's
column reverted to two decimals**, because it was testing the helper and not
the page. The first probe caught only the narrow test beside it.

It reads the printed column now: every `models` row, matched to its price from
`--json`, with no two distinct prices allowed to print one string. Then the
same probe takes both tests down.

The property belongs to the column, not to the function that feeds it. A test
that reimplements the formatting agrees with itself.

## 3. Open ruling points

None. Both items were named in the previous record and are closed.

## 4. What was left out and why

- **Nothing was pushed.** No call was made.
- **The unverified paragraph's slight over-statement** (the previous record's
  §4.3), which stays as it is until the first real call.
