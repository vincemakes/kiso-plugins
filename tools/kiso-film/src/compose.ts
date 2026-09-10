/**
 * The cut: a list of clips becomes one film, with ffmpeg.
 *
 * NO MODEL, NO NETWORK, NO KEY. This is the one command in the tool that
 * works entirely on files a person already has, which is why it is in this
 * half of the package: it is useful on its own, to anyone with clips and a
 * running order.
 *
 * ffmpeg is DECLARED, never fetched. It is checked for, and its absence is an
 * exit code and a sentence naming what to install.
 */
import { existsSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'

export interface CutClip {
  readonly path: string
  /** Seconds of cross-fade INTO this clip. Zero, or absent, is a hard cut. */
  readonly fadeInSeconds?: number
}

export interface Cut {
  readonly clips: readonly CutClip[]
  /** One audio track laid under the whole film. */
  readonly audio?: string
  readonly audioFadeOutSeconds?: number
}

export interface CutProblem { readonly what: string; readonly message: string }

export function parseCut(text: string, path: string): Cut {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (err) {
    throw new Error(`${path} is not valid JSON (${err instanceof Error ? err.message : String(err)})`)
  }
  if (typeof raw !== 'object' || raw === null) throw new Error(`${path} must be a JSON object with a "clips" array`)
  const o = raw as Record<string, unknown>
  const clipsRaw = o['clips']
  if (!Array.isArray(clipsRaw) || clipsRaw.length === 0) throw new Error(`${path} has no "clips" — a cut with nothing in it is not a cut`)
  const clips: CutClip[] = []
  clipsRaw.forEach((c, i) => {
    if (typeof c === 'string') { clips.push({ path: c }); return }
    if (typeof c !== 'object' || c === null) throw new Error(`${path}: clip ${i} is neither a path nor an object`)
    const co = c as Record<string, unknown>
    const p = co['path']
    if (typeof p !== 'string' || p === '') throw new Error(`${path}: clip ${i} has no "path"`)
    const fade = typeof co['fadeInSeconds'] === 'number' ? co['fadeInSeconds'] : 0
    clips.push(fade > 0 ? { path: p, fadeInSeconds: fade } : { path: p })
  })
  const audio = typeof o['audio'] === 'string' && o['audio'] !== '' ? o['audio'] : undefined
  const fadeOut = typeof o['audioFadeOutSeconds'] === 'number' ? o['audioFadeOutSeconds'] : undefined
  return {
    clips,
    ...(audio === undefined ? {} : { audio }),
    ...(fadeOut === undefined ? {} : { audioFadeOutSeconds: fadeOut })
  }
}

/** Every missing file at once, named relative to the cut, so one run tells a
 *  person everything they have to fix. */
export function missingInputs(cut: Cut, baseDir: string): CutProblem[] {
  const problems: CutProblem[] = []
  const at = (p: string): string => (isAbsolute(p) ? p : resolve(baseDir, p))
  for (const c of cut.clips) if (!existsSync(at(c.path))) problems.push({ what: c.path, message: 'is not there' })
  if (cut.audio !== undefined && !existsSync(at(cut.audio))) problems.push({ what: cut.audio, message: 'is not there' })
  return problems
}

/**
 * The ffmpeg arguments for a cut.
 *
 * Returned rather than run, so a test can read exactly what would be executed
 * without executing it — and so `--dry-run` can print the same thing to a
 * person. A command that can only be checked by running it is a command whose
 * bugs cost whatever it does.
 *
 * A cross-fade is `xfade`, which needs an offset measured from the start of
 * the growing result rather than from the clip: each fade overlaps the two
 * sides, so every later offset is short by the fades already spent. That
 * arithmetic is why this is a function and not a template.
 */
export function ffmpegArgs(cut: Cut, out: string, durations: readonly number[], baseDir = '.'): string[] {
  const at = (p: string): string => (isAbsolute(p) ? p : join(baseDir, p))
  const args: string[] = ['-y']
  for (const c of cut.clips) args.push('-i', at(c.path))
  if (cut.audio !== undefined) args.push('-i', at(cut.audio))

  const filters: string[] = []
  let current = '[0:v]'
  let elapsed = durations[0] ?? 0
  for (let i = 1; i < cut.clips.length; i++) {
    const fade = cut.clips[i]?.fadeInSeconds ?? 0
    const label = i === cut.clips.length - 1 ? '[v]' : `[v${i}]`
    if (fade > 0) {
      const offset = Math.max(0, elapsed - fade)
      filters.push(`${current}[${i}:v]xfade=transition=fade:duration=${fade}:offset=${offset.toFixed(3)}${label}`)
      elapsed = elapsed - fade + (durations[i] ?? 0)
    } else {
      filters.push(`${current}[${i}:v]concat=n=2:v=1:a=0${label}`)
      elapsed += durations[i] ?? 0
    }
    current = label
  }
  if (cut.clips.length === 1) filters.push('[0:v]null[v]')

  args.push('-filter_complex', filters.join(';'), '-map', '[v]')
  if (cut.audio !== undefined) {
    const audioIndex = cut.clips.length
    args.push('-map', `${audioIndex}:a`, '-shortest')
    if (cut.audioFadeOutSeconds !== undefined && cut.audioFadeOutSeconds > 0) {
      const start = Math.max(0, elapsed - cut.audioFadeOutSeconds)
      args.push('-af', `afade=t=out:st=${start.toFixed(3)}:d=${cut.audioFadeOutSeconds}`)
    }
  }
  args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', out)
  return args
}

/** The concat-demuxer list, for a cut with no fades at all — the cheap path,
 *  and the one that does not re-encode. */
export function concatListFile(cut: Cut, listPath: string, baseDir: string): void {
  const lines = cut.clips.map((c) => `file '${resolve(baseDir, c.path).replace(/'/g, "'\\''")}'`)
  writeFileSync(listPath, `${lines.join('\n')}\n`)
}

export function hasFades(cut: Cut): boolean {
  return cut.clips.some((c) => (c.fadeInSeconds ?? 0) > 0)
}

export function outDir(out: string): string { return dirname(resolve(out)) }
