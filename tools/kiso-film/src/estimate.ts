/**
 * What a graph will cost, before a byte of it is generated.
 *
 * This is the number behind the first of the two planned stops: a person is
 * asked to approve a film's price, once, before anything is spent. So it has
 * to be an over-estimate rather than an under-estimate where it is unsure,
 * and it has to say plainly which parts it is unsure about.
 *
 * IT SAYS "unverified prices" WHENEVER ANY PRICED MODEL IS UNVERIFIED, which
 * today is every one of them. A price carried from a table nobody has checked
 * against a provider's own documentation is a guess with two decimal places,
 * and a number that looks measured is worse than one that admits it is not.
 */
import { readFileSync } from 'node:fs'
import { byId, perSecondUsd, type Model, type Table } from './models.js'

export interface Shot {
  readonly id: string
  readonly duration_s: number
}

export interface EstimateLine {
  readonly what: string
  readonly count: number
  readonly seconds: number
  readonly usd: number | null
  readonly model: string
  readonly verified: boolean
}

export interface Estimate {
  readonly lines: readonly EstimateLine[]
  readonly totalUsd: number | null
  readonly unpricedCount: number
  readonly anyUnverified: boolean
  readonly overBudget: boolean
  readonly notes: readonly string[]
}

/** The shot rows a price can be put on. A row without a usable duration is
 *  reported rather than counted as zero: a shot that costs nothing is a shot
 *  nobody will make. */
export function readShots(path: string): { shots: Shot[]; skipped: string[] } {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'))
  } catch (err) {
    throw new Error(`${path} is not valid JSON (${err instanceof Error ? err.message : String(err)})`)
  }
  if (!Array.isArray(raw)) throw new Error(`${path} must be a JSON array of shots — an object at the top level is not a shot list`)
  const shots: Shot[] = []
  const skipped: string[] = []
  raw.forEach((row, i) => {
    if (typeof row !== 'object' || row === null) { skipped.push(`row ${i} is not an object`); return }
    const o = row as Record<string, unknown>
    const id = typeof o['id'] === 'string' && o['id'] !== '' ? o['id'] : `row ${i}`
    const seconds = typeof o['duration_s'] === 'number' ? o['duration_s'] : Number(o['duration_s'])
    if (!Number.isFinite(seconds) || seconds <= 0) { skipped.push(`${id} has no usable duration_s`); return }
    shots.push({ id, duration_s: seconds })
  })
  return { shots, skipped }
}

export interface EstimateInput {
  readonly shots: readonly Shot[]
  readonly videoModelId: string
  readonly imageModelId: string
  readonly resolution: string
  readonly budgetUsd: number | null
  /** One first frame per shot, which is what the writing chain produces. */
  readonly imagesPerShot?: number
}

export function estimate(table: Table, input: EstimateInput): Estimate {
  const notes: string[] = []
  const video = byId(table, input.videoModelId)
  const image = byId(table, input.imageModelId)
  const lines: EstimateLine[] = []
  let total = 0
  let unpriced = 0
  let anyUnverified = false

  const seconds = input.shots.reduce((sum, s) => sum + s.duration_s, 0)
  const perSecond = video === undefined ? null : perSecondUsd(video, input.resolution)
  if (video === undefined) notes.push(`no model with the id "${input.videoModelId}" — the clips are not priced`)
  else if (perSecond === null) notes.push(`${video.label} has no price in the table — the clips are not priced`)
  if (video !== undefined && !video.verified) anyUnverified = true
  if (perSecond === null) unpriced += input.shots.length
  else total += perSecond * seconds
  lines.push({
    what: 'clips', count: input.shots.length, seconds,
    usd: perSecond === null ? null : perSecond * seconds,
    model: video?.label ?? input.videoModelId, verified: video?.verified ?? false
  })

  const perShot = input.imagesPerShot ?? 1
  const images = input.shots.length * perShot
  const perImage = image === undefined ? null : (typeof image.price.perImageUsd === 'number' ? image.price.perImageUsd : null)
  if (image === undefined) notes.push(`no model with the id "${input.imageModelId}" — the first frames are not priced`)
  else if (perImage === null) notes.push(`${image.label} has no price in the table — the first frames are not priced`)
  if (image !== undefined && !image.verified) anyUnverified = true
  if (perImage === null) unpriced += images
  else total += perImage * images
  lines.push({
    what: 'first frames', count: images, seconds: 0,
    usd: perImage === null ? null : perImage * images,
    model: image?.label ?? input.imageModelId, verified: image?.verified ?? false
  })

  const priced = unpriced === 0 ? total : null
  return {
    lines,
    totalUsd: priced,
    unpricedCount: unpriced,
    anyUnverified,
    overBudget: input.budgetUsd !== null && priced !== null && priced > input.budgetUsd,
    notes
  }
}

/** A TOTAL, which is money someone will be asked to approve: two decimals. */
export function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`
}

/**
 * A RATE, which is a figure someone compares models by: the number the table
 * carries, exactly.
 *
 * Two decimals merged entries. A per-image price of 0.0085 and one of 0.01
 * both printed `$0.01`, so the page a person chooses a model from could not
 * tell the cheapest from one nearly 18% dearer — and 0.025 printed `$0.03`,
 * rounding a price UP on the screen where it is compared.
 *
 * A rounding that makes two different numbers print the same is not a display
 * choice; it is the table saying something it does not know. So this prints
 * what is there: at least two decimals, up to six, trailing zeros trimmed.
 */
export function formatRateUsd(n: number): string {
  const exact = n.toFixed(6).replace(/0+$/, '')
  const [whole = '0', fraction = ''] = exact.split('.')
  const padded = fraction.length < 2 ? fraction.padEnd(2, '0') : fraction
  return `$${whole}.${padded}`
}
