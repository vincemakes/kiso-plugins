/**
 * The request body a model is asked with, built from the table's own
 * parameter names.
 *
 * Pure, and separate from the sending, so the interesting part is testable
 * without a network: which fields a model gets, what a capability refuses,
 * and what a duration is written as.
 *
 * THE CAPABILITY CHECK IS THE POINT. A model that takes no motion reference
 * given one would either ignore it silently — the person pays for a shot that
 * did not do what they asked — or fail with the provider's own error, which
 * says nothing about why. So it is refused here, before anything is sent,
 * with the reason and with the models that would take it.
 */
import { basename } from 'node:path'
import type { Model, Table } from './models.js'

export interface BuildInput {
  readonly prompt: string
  readonly references?: readonly string[]
  readonly startImage?: string
  readonly endImage?: string
  readonly motionReference?: string
  readonly durationSeconds?: number
  readonly resolution?: string
  readonly aspectRatio?: string
  readonly audio?: boolean
}

export class UnsupportedError extends Error {}

/** Every complaint at once — a person fixing a command line should not have to
 *  run it five times to find five things. */
export function checkSupported(model: Model, input: BuildInput, table?: Table): string[] {
  const problems: string[] = []
  const c = model.capabilities
  const alternatives = (what: (m: Model) => boolean): string => {
    if (table === undefined) return ''
    const ids = table.models.filter((m) => m.kind === model.kind && m.id !== model.id && what(m)).map((m) => m.id)
    return ids.length === 0 ? '' : ` Models in the table that do: ${ids.join(', ')}.`
  }
  if (input.motionReference !== undefined && c?.motionReference !== true) {
    problems.push(`${model.label} does not take a motion reference.${alternatives((m) => m.capabilities?.motionReference === true)}`)
  }
  if (input.startImage !== undefined && c?.startImage !== true) {
    problems.push(`${model.label} does not take a start image.${alternatives((m) => m.capabilities?.startImage === true)}`)
  }
  if (input.endImage !== undefined && c?.endImage !== true) {
    problems.push(`${model.label} does not take an end image.${alternatives((m) => m.capabilities?.endImage === true)}`)
  }
  const refs = input.references ?? []
  const max = c?.maxReferenceImages ?? 0
  if (refs.length > 0 && max === 0) problems.push(`${model.label} takes no reference images.${alternatives((m) => (m.capabilities?.maxReferenceImages ?? 0) > 0)}`)
  else if (refs.length > max) problems.push(`${model.label} takes at most ${max} reference image${max === 1 ? '' : 's'}, and ${refs.length} were given`)
  if (input.durationSeconds !== undefined && model.duration !== undefined) {
    const d = model.duration
    if (input.durationSeconds < d.minSeconds || input.durationSeconds > d.maxSeconds) {
      problems.push(`${model.label} makes clips between ${d.minSeconds} and ${d.maxSeconds} seconds, and ${input.durationSeconds} was asked for`)
    } else if (d.choicesSeconds !== undefined && d.choicesSeconds.length > 0 && !d.choicesSeconds.includes(input.durationSeconds)) {
      problems.push(`${model.label} makes clips of ${d.choicesSeconds.join(', ')} seconds only, and ${input.durationSeconds} was asked for`)
    }
  }
  if (input.resolution !== undefined && model.resolutions !== undefined && model.resolutions.length > 0 && !model.resolutions.includes(input.resolution)) {
    problems.push(`${model.label} offers ${model.resolutions.join(', ')}, and ${input.resolution} was asked for`)
  }
  if (input.aspectRatio !== undefined && model.aspectRatios !== undefined && model.aspectRatios.length > 0 && !model.aspectRatios.includes(input.aspectRatio)) {
    problems.push(`${model.label} offers ${model.aspectRatios.join(', ')}, and ${input.aspectRatio} was asked for`)
  }
  return problems
}

/**
 * A duration written the way this model's route wants it: `5`, `"5"` or
 * `"5s"`. A route that asked for a string and got a number is refused by the
 * provider with a message about types, which is a long way from the cause.
 */
export function writeDuration(seconds: number, format: string | null | undefined): number | string {
  if (format === 'int') return seconds
  if (format === 'suffix_s') return `${seconds}s`
  return String(seconds)
}

/** A local path becomes a `file://` URL; anything already a URL is left alone.
 *  Uploading local files is the provider's own business and differs between
 *  them, so this names the file rather than pretending to have sent it. */
export function asReference(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl
  return `file://${pathOrUrl}`
}

export function buildInput(model: Model, input: BuildInput): Record<string, unknown> {
  const p = model.params ?? {}
  const body: Record<string, unknown> = { prompt: input.prompt }
  const put = (name: string | null | undefined, value: unknown): void => {
    if (typeof name === 'string' && name !== '' && value !== undefined) body[name] = value
  }
  const refs = input.references ?? []
  if (refs.length > 0) put(p['referenceImages'], refs.map(asReference))
  if (input.startImage !== undefined) put(p['startImage'], asReference(input.startImage))
  if (input.endImage !== undefined) put(p['endImage'], asReference(input.endImage))
  if (input.resolution !== undefined) put(p['resolution'], input.resolution)
  if (input.aspectRatio !== undefined) put(p['aspectRatio'], input.aspectRatio)
  if (input.audio !== undefined) put(p['audio'], input.audio)
  if (input.durationSeconds !== undefined) body['duration'] = writeDuration(input.durationSeconds, p['durationFormat'])
  // A motion reference has no parameter name of its own in the table — the
  // route that carries one carries it as an audio/video reference list. Named
  // explicitly rather than guessed, and only reached once the capability check
  // above has passed.
  if (input.motionReference !== undefined) body['video_urls'] = [asReference(input.motionReference)]
  return body
}

export function outputName(prompt: string, fallback: string): string {
  const words = prompt.toLowerCase().replace(/[^a-z0-9\s-]/g, '').split(/\s+/).filter(Boolean).slice(0, 4)
  return words.length === 0 ? fallback : `${words.join('-')}${basename(fallback).replace(/^[^.]*/, '')}`
}
