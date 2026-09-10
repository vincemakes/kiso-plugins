# Shorts pack

Cut a long recording into vertical shorts.

```
source → transcript.md → moments.csv → clips
```

Transcribe the recording with timestamps, pick the moments worth cutting, then
cut them. The moments are a CSV on purpose: choosing what is worth publishing
is the part a person will want to overrule, and a table is the shape that
invites it.

## Skills

| skill | reads | makes |
|---|---|---|
| `transcribe` | an audio or video file | `transcript.md`, timestamped |
| `find-moments` | `transcript.md` | `moments.csv` — the candidates worth cutting |
| `cut-clips` | the source and `moments.csv` | one vertical clip per row |

## Needs

A whisper, and `ffmpeg`/`ffprobe`.

The transcribe recipe looks for `mlx_whisper`, then `whisper-cli`, then
`whisper`, and tells you which to install if it finds none — on Apple silicon
`pip install mlx-whisper` is the fast one. It never installs one itself, and
it never sends your recording anywhere: every command it runs is local.
