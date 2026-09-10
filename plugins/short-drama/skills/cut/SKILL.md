---
name: cut
description: Assemble the storyboard and assets into a finished episode with ffmpeg.
offers:
  - from: table
    says: "Assemble these shots into the episode"
    makes: video
---

# Cut

Last stage. Reads `storyboard.csv` and `assets/`, produces `episode.mp4`.

## Before you start

```bash
command -v ffmpeg || echo MISSING
```

`MISSING` → tell the user (`brew install ffmpeg`) and stop.

## Do it

Build a concat list from the storyboard, in shot order, honouring each row's
duration:

```bash
mkdir -p shots
: > cut.txt
# for each shot: a still becomes a clip of its own duration
ffmpeg -nostdin -y -loop 1 -t 3 -i assets/shot-01.png \
  -vf "scale=1080:1920:flags=lanczos,format=yuv420p" -r 30 shots/shot-01.mp4
printf "file 'shots/shot-01.mp4'\n" >> cut.txt

ffmpeg -nostdin -y -f concat -safe 0 -i cut.txt -c copy episode-silent.mp4
```

Then the audio. The assets stage produces **one file per shot**
(`assets/shot-01.wav`), not a finished mix, so the mix is made here — from the
per-shot files, in the same order as the video:

```bash
: > mix.txt
printf "file 'assets/shot-01.wav'\n" >> mix.txt   # for each shot, in order
ffmpeg -nostdin -y -f concat -safe 0 -i mix.txt -c copy assets/mix.wav

ffmpeg -nostdin -y -i episode-silent.mp4 -i assets/mix.wav -shortest \
  -c:v copy -c:a aac -b:a 192k episode.mp4
```

A shot with no audio still needs its slot, or every later shot drifts: give it
silence of its own duration (`-f lavfi -i anullsrc=r=48000:cl=mono -t <dur>`)
rather than leaving the row out.

Then check the result instead of assuming it:

```bash
ffprobe -v error -show_entries format=duration,size -of default=nw=1 episode.mp4
```

If the duration does not match the storyboard's total, **say both numbers**.
A cut that is four seconds short is a bug, not a rounding.

## Then

```
emit_artifact(path="episode.mp4", type="video",
              facts=["<duration>", "1080x1920", "<n> shots"],
              from=["storyboard.csv", "assets/shot-01.png"])
```

List in `from` what you actually assembled it from. The graph is only worth
looking at if the edges are true.
