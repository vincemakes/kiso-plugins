# Cinematography — the words this plugin uses

Every shot skill draws its vocabulary from here. The point of a fixed
vocabulary is not tidiness: a shot list is read by a later skill that turns
each row into a prompt, and a prompt built from words that vary run to run
produces shots that do not cut together.

**Read this before writing `shots.json`. Use these words exactly.**

## Shot size

| word | what is in frame | what it is for |
|---|---|---|
| `extreme-wide` | the place, the figure small in it | where we are, or how alone someone is |
| `wide` | the whole figure, head to foot, with room | who is where, and what the space allows |
| `full` | the whole figure, filling the height | movement of the body — walking in, squaring up |
| `medium` | waist up | two people talking, gesture still readable |
| `medium-close` | chest up | the workhorse of dialogue; the face leads, the body still answers |
| `close` | the face | what a person is feeling and is not saying |
| `extreme-close` | eyes, a hand, an object | one detail the story turns on |

A cut between two sizes reads as a cut. A cut between two shots of the same
size on the same subject reads as a mistake, so change the size or change the
angle when you cut.

## Camera angle

| word | where the camera is | what it says |
|---|---|---|
| `eye` | level with the subject's eyes | neutral, and the default |
| `low` | below, looking up | the subject has power, or is about to take it |
| `high` | above, looking down | the subject is exposed, small, or being judged |
| `overhead` | directly above | the pattern, not the person — a floor plan of a moment |
| `dutch` | tilted horizon | something is wrong; use once, or it stops meaning anything |
| `over-shoulder` | behind one figure, onto another | two people in relation; who is listening |
| `pov` | where the subject's eyes are | what they see, in the moment they see it |

## Camera movement

Start with the still ones. A move earns its place by doing something a cut
cannot.

| word | the move | what it does |
|---|---|---|
| `static` | none | lets the performance carry it — most shots |
| `pan` | pivot left or right | follows, or reveals what was beside us |
| `tilt` | pivot up or down | scale, or the slow reveal of a face |
| `push-in` | camera moves toward | attention narrowing — realisation, decision |
| `pull-out` | camera moves away | context arriving, or someone left behind |
| `track` | camera travels beside | walking and talking; the world moves past |
| `crane` | camera rises or falls | the end of a scene, or the size of a place |
| `handheld` | unstable, following | urgency, or a subjective closeness |
| `orbit` | circles the subject | a moment held still while everything turns |

Two rules a generated shot in particular needs:

- **One move per shot.** A push-in that also pans is two intentions, and a
  video model will average them into neither.
- **Say the speed.** `slow push-in` and `fast push-in` are different shots.
  Where a duration and a move disagree — a slow crane in a one-second shot —
  the duration wins and the move gets cut.

## Lighting

| word | the look | what it is for |
|---|---|---|
| `natural` | whatever the place has | documentary, ordinary life |
| `soft-key` | one broad soft source | faces you want to like |
| `hard-key` | one sharp source, defined shadows | confrontation, heat, exposure |
| `low-key` | mostly shadow, small pools of light | fear, secrecy, night |
| `high-key` | bright, shadowless | comedy, advertising, clinical rooms |
| `backlit` | the source behind the subject | a silhouette, or an arrival |
| `practical` | lamps, screens, signs in the frame | a room that lights itself; the cheapest realism there is |
| `golden` | low warm sun | endings, memory, the last good day |

## Reaching for a shot when you know the feeling

These are starting points, not rules. The reason they work is written beside
each, and a reason you can read is a reason you can decide against.

**Tension.** Tighten as it builds — `medium` to `medium-close` to `close` —
with a `slow push-in` on the line that turns it. `low-key`, `hard-key` if
someone is being cornered. Hold shots slightly longer than comfortable: the
discomfort is the point.

**Warmth.** `medium-close` at `eye`, `soft-key` or `golden`, `static` or a
`slow push-in`. Cut on reactions rather than on lines, so the scene is about
being heard.

**Impact.** Go wide and low — `wide` or `extreme-wide` at `low` — and let one
`crane` or `pull-out` carry the scale. One such shot per scene. Two, and the
second is furniture.

**Loneliness.** `extreme-wide` with the figure off-centre, `static`, `natural`
or `backlit`. The frame does the work; the performance should not have to.

## Duration

A shot needs long enough to be read and no longer. As a floor: an
`extreme-close` on an object reads in about one second, a `close` on a face in
two, a `medium` with dialogue in the time the line takes plus a breath, a
`wide` establishing a new place in about three.

Generated clips have a ceiling their model sets, and it is usually short.
Where a beat needs longer than the model gives, it is two shots, not one long
one — and two shots of the same moment need a size or an angle between them.
