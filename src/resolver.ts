import $RefParser = require('json-schema-ref-parser')
import {JSONSchema} from './types/JSONSchema'
import {log} from './utils'

export async function dereference(
  schema: JSONSchema,
  {cwd, resolve, $refOptions}: {cwd: string; resolve: boolean; $refOptions: $RefParser.Options}
): Promise<JSONSchema> {
  log('green', 'resolver', schema, cwd, resolve)
  if (!resolve) {
    return schema
  }
  const parser = new $RefParser()
  return parser.dereference(cwd, schema, $refOptions)
}
