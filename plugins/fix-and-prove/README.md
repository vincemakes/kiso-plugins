# Fix and prove

Fix something in a code repository and leave the proof beside it.

The point is what the person keeps afterwards. A result on its own is a claim;
the same result with the run that produced it is evidence. So this plugin's
one skill plans its output graph **before** it touches anything, and then
fills it in:

```
fix.diff → tests.log
        ↘ screenshot.png     (only when the fix has a surface to look at)
```

The screenshot node is planned only when there is genuinely something on a
screen to see. A change to a library, a schema, a command-line tool or an
algorithm has no surface, and the recipe says outright not to fake one to keep
the shape.

## Skills

| skill | reads | makes |
|---|---|---|
| `fix-and-prove` | a repository, and a diff or a file you point it at | `fix.diff`, `tests.log`, and sometimes `screenshot.png` |

It offers itself in both directions: on a diff, *prove this change with a test
run and a screenshot*; on a file, *fix this and leave the evidence beside it*.

## Needs

`git` and `npm`, declared in the manifest and granted per project by a person.
