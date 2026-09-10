/**
 * A JSON Schema checker — the subset this table's schema actually uses, and
 * nothing more.
 *
 * WHY NOT A LIBRARY. This package has no runtime dependencies, and it is
 * installed globally on a person's machine by a plugin they trusted. A
 * validator is a hundred lines of the subset we use; pulling a dependency
 * tree in to check twenty-two objects would be the larger risk and the larger
 * install.
 *
 * WHY NOT HAND-WRITTEN CHECKS INSTEAD OF A SCHEMA FILE. Because then the
 * schema file would be documentation that nothing reads, and documentation
 * nothing reads goes stale silently. `data/models.schema.json` is the only
 * statement of the shape, and this walks it.
 *
 * Supported: type (including a union of types and null), required,
 * properties, additionalProperties: false, items, enum, minimum, minLength,
 * pattern, and $ref into "#/definitions/...". Anything else in a schema is
 * IGNORED — and `unsupportedKeywords` names what was ignored, so a keyword
 * added to the schema in the belief that it is checked shows up rather than
 * passing in silence.
 */
export interface SchemaProblem {
  readonly path: string
  readonly message: string
}

type Json = unknown
interface SchemaNode {
  [k: string]: Json
}

const KNOWN = new Set([
  '$schema', '$ref', 'title', 'description', 'definitions',
  'type', 'required', 'properties', 'additionalProperties', 'items',
  'enum', 'minimum', 'minLength', 'pattern'
])

/** Every keyword used anywhere in the schema that this checker does not act
 *  on. Reported rather than assumed harmless. */
export function unsupportedKeywords(schema: SchemaNode): string[] {
  const seen = new Set<string>()
  const walk = (node: Json): void => {
    if (Array.isArray(node)) { for (const x of node) walk(x); return }
    if (typeof node !== 'object' || node === null) return
    for (const [k, v] of Object.entries(node as SchemaNode)) {
      // Inside `properties` and `definitions` the keys are NAMES, not keywords.
      if (k === 'properties' || k === 'definitions') {
        for (const child of Object.values(v as SchemaNode)) walk(child)
        continue
      }
      if (!KNOWN.has(k)) seen.add(k)
      walk(v)
    }
  }
  walk(schema)
  return [...seen].sort()
}

function typeOf(value: Json): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (Number.isInteger(value)) return 'integer'
  return typeof value
}

function matchesType(value: Json, want: string): boolean {
  const actual = typeOf(value)
  if (want === 'number') return actual === 'number' || actual === 'integer'
  return actual === want
}

export function validate(schema: SchemaNode, value: Json, root: SchemaNode = schema, path = ''): SchemaProblem[] {
  const problems: SchemaProblem[] = []
  const at = (message: string): void => { problems.push({ path: path === '' ? '(root)' : path, message }) }

  const ref = schema['$ref']
  if (typeof ref === 'string') {
    const target = ref.replace(/^#\//, '').split('/').reduce<Json>((acc, k) => (typeof acc === 'object' && acc !== null ? (acc as SchemaNode)[k] : undefined), root)
    if (typeof target !== 'object' || target === null) { at(`$ref ${ref} points at nothing`); return problems }
    return validate(target as SchemaNode, value, root, path)
  }

  const type = schema['type']
  if (typeof type === 'string' && !matchesType(value, type)) {
    at(`should be ${type}, is ${typeOf(value)}`)
    return problems
  }
  if (Array.isArray(type) && !type.some((t) => typeof t === 'string' && matchesType(value, t))) {
    at(`should be one of ${type.join(' | ')}, is ${typeOf(value)}`)
    return problems
  }

  const enumeration = schema['enum']
  if (Array.isArray(enumeration) && !enumeration.includes(value)) {
    at(`should be one of ${enumeration.map((x) => JSON.stringify(x)).join(', ')}, is ${JSON.stringify(value)}`)
  }
  if (typeof schema['minimum'] === 'number' && typeof value === 'number' && value < schema['minimum']) {
    at(`should be at least ${schema['minimum']}, is ${value}`)
  }
  if (typeof schema['minLength'] === 'number' && typeof value === 'string' && value.length < schema['minLength']) {
    at(`should be at least ${schema['minLength']} character(s), is empty`)
  }
  if (typeof schema['pattern'] === 'string' && typeof value === 'string' && !new RegExp(schema['pattern']).test(value)) {
    at(`should match ${schema['pattern']}, is ${JSON.stringify(value)}`)
  }

  const items = schema['items']
  if (Array.isArray(value) && typeof items === 'object' && items !== null) {
    value.forEach((entry, i) => problems.push(...validate(items as SchemaNode, entry, root, `${path}[${i}]`)))
  }

  if (typeOf(value) === 'object') {
    const object = value as SchemaNode
    const properties = (typeof schema['properties'] === 'object' && schema['properties'] !== null ? schema['properties'] : {}) as SchemaNode
    const required = Array.isArray(schema['required']) ? schema['required'] : []
    for (const key of required) {
      if (typeof key === 'string' && !(key in object)) at(`is missing "${key}"`)
    }
    for (const [key, child] of Object.entries(object)) {
      const sub = properties[key]
      if (sub === undefined) {
        if (schema['additionalProperties'] === false) at(`has "${key}", which the schema does not allow`)
        continue
      }
      problems.push(...validate(sub as SchemaNode, child, root, path === '' ? key : `${path}.${key}`))
    }
  }

  return problems
}
