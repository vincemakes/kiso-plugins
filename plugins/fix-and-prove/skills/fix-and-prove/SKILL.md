---
name: fix-and-prove
description: Fix something in a code repository and leave the evidence beside it — the diff, the test log, and, when the fix has a surface to show, a screenshot of the result.
offers:
  - from: diff
    says: "Prove this change with a test run and a screenshot"
    makes: file
  - from: file
    says: "Fix this and leave the evidence beside it"
    makes: diff
---

# Fix, and prove it

The graph is `fix.diff → tests.log`, and it gains a `→ screenshot.png` only
when the fix has a surface to look at. A result on its own is a claim; the
same result with the run that proved it — and, when there is something to
show, the page that shows it — is evidence (ADR-005 clause 11). What the
person keeps is not "it is fixed"; it is the files that say so. The
screenshot node is only ever real if there is something in a screen to see.

## Plan the graph first

Decide up front whether the fix has any visible surface — a page, a render, a
result you can look at. A change to a library, a schema, a CLI, an algorithm
or a text file has none; a fix that changes what a screen shows does.

Before touching anything, plan the two edges every proof needs — `fix.diff`
and `tests.log`:

```
plan_artifacts(nodes=[
  {"path": "fix.diff",       "type": "diff",  "from": []},
  {"path": "tests.log",      "type": "file",  "from": ["fix.diff"]}
])
```

Add the third node, `screenshot.png`, at the same time **only when there is a
surface**:

```
plan_artifacts(nodes=[
  {"path": "fix.diff",       "type": "diff",  "from": []},
  {"path": "tests.log",      "type": "file",  "from": ["fix.diff"]},
  {"path": "screenshot.png", "type": "image", "from": ["fix.diff"]}
])
```

If the plan assumed a surface and the fix turns out to have none, do not fake
one to keep the shape: call
`withdraw_artifact("screenshot.png", why="no surface produced by this fix")`
and let the graph end at the two real nodes. A graph of two filled nodes is
honest; a third you cannot fill is a lie.

## 1 — The fix, and the diff beside it

Make the change with `edit_file` or `write_file`, then record what changed:

```bash
git diff > fix.diff
```

```
emit_artifact(path="fix.diff", type="diff",
              facts=["+<added> -<removed>", "<n> files"])
```

`facts` are mechanical: line counts and file counts are facts, "clean fix" is
not. Take the counts from the diff itself (`git diff --shortstat`) rather than
from memory.

## 2 — The tests, and their log

Find a test command that actually proves this change. **Never assume `npm
test` exists** — many repositories have no `test` script. Read `package.json`
(the `scripts` block), a Makefile or the README and see what is really there:

- Prefer the plain `test` script **only when the repository defines one** and
  it covers your change.
- Otherwise choose the script that exercises what you changed — the pack or
  suite that statically checks a skill, the browser suite for a UI change.
- If you cannot tell which script proves the fix, **stop and ask the person**
  rather than guessing at one. Running the wrong command is evidence for
  nothing.

Keep the output, appending the exit code. For example, where the repository's
pack-proof suite is `test:packs`:

```bash
npm run test:packs > tests.log 2>&1; echo "exit $?" >> tests.log
```

```
emit_artifact(path="tests.log", type="file",
              facts=["<n> passed", "<n> failed", "exit <code>"],
              from=["fix.diff"])
```

Emit it **whether or not the tests pass.** A failing run is evidence too, and
a log that only appears when it is green is a log nobody can trust. If they
fail, say so plainly and stop rather than editing until they are green — the
person decides what to do about a red suite.

## 3 — The screenshot

Only when there is something to look at — a page, a render, a visible result
the fix changes. A fix with no surface (a library, a schema, a CLI, an
algorithm, a text edit) has nothing to screenshot, and this stage does not
run for it. If your plan assumed a third node and the fix turns out to have
none, do not fake one: call
`withdraw_artifact("screenshot.png", why="no surface produced by this fix")`
so the graph ends at the honest two nodes. A screenshot is evidence only when
there is something in it to look at.

When a surface exists, start the project's dev server, open the page in the
built-in browser, and screenshot it:

```bash
npm run dev &
```

The server is reachable at `localhost` from inside the sandbox and from the
browser. Then `browse_open` the page, `browse_screenshot` it to
`screenshot.png`, and:

```
emit_artifact(path="screenshot.png", type="image",
              facts=["<width>x<height>", "<the URL>"],
              from=["fix.diff"])
```

`from` points at the diff because that is what the screenshot is evidence
*about*. That edge is what makes the graph a proof rather than three files.

## What not to do

- Do not emit a node you did not make. An outline that never became a file is
  honest; a claim that it did is not.
- Do not put a judgement in `facts`. `12 passed` is a fact; `4/5` is refused
  by the tool, and "looks right" would be worse than refused.
- Do not delete anything to make the graph tidy. `withdraw_artifact` records
  that a path left the work; the bytes are the person's.
