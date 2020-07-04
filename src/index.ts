import {readFileSync} from 'fs'
import {JSONSchema4} from 'json-schema'
import {Options as $RefOptions} from 'json-schema-ref-parser'
import {endsWith, merge} from 'lodash'
import {dirname} from 'path'
import {Options as PrettierOptions} from 'prettier'
import {format} from './formatter'
import {generate} from './generator'
import {normalize} from './normalizer'
import {optimize} from './optimizer'
import {parse} from './parser'
import {dereference} from './resolver'
import {error, stripExtension, Try} from './utils'
import {validate} from './validator'

export {EnumJSONSchema, JSONSchema, NamedEnumJSONSchema, CustomTypeJSONSchema} from './types/JSONSchema'

export interface Options {
  /**
   * Disclaimer comment prepended to the top of each generated file.
   */
  bannerComment: string
  /**
   * Root directory for resolving [`$ref`](https://tools.ietf.org/id/draft-pbryan-zyp-json-ref-03.html)s.
   */
  cwd: string
  /**
   * Declare external schemas referenced via `$ref`?
   */
  declareExternallyReferenced: boolean
  /**
   * Prepend enums with [`const`](https://www.typescriptlang.org/docs/handbook/enums.html#computed-and-constant-members)?
   */
  enableConstEnums: boolean
  /**
   * Ignore maxItems and minItems for `array` types, preventing tuples being generated.
   */
  ignoreMinAndMaxItems: boolean
  /**
   * Append all index signatures with `| undefined` so that they are strictly typed.
   *
   * This is required to be compatible with `strictNullChecks`.
   */
  strictIndexSignatures: boolean
  /**
   * A [Prettier](https://prettier.io/docs/en/options.html) configuration.
   */
  style: PrettierOptions
  /**
   * Generate code for `definitions` that aren't referenced by the schema?
   */
  unreachableDefinitions: boolean
  /**
   * Generate unknown type instead of any
   */
  unknownAny: boolean
  /**
   * Resolve `$ref`s using [$RefParser](https://github.com/BigstickCarpet/json-schema-ref-parser)
   */
  resolve: boolean
  /**
   * [$RefParser](https://github.com/BigstickCarpet/json-schema-ref-parser) Options, used when resolving `$ref`s
   */
  $refOptions: $RefOptions
}

export const DEFAULT_OPTIONS: Options = {
  resolve: true,
  $refOptions: {},
  bannerComment: `/* tslint:disable */
/**
* This file was automatically generated by json-schema-to-typescript.
* DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
* and run json-schema-to-typescript to regenerate this file.
*/`,
  cwd: process.cwd(),
  declareExternallyReferenced: true,
  enableConstEnums: true, // by default, avoid generating code
  ignoreMinAndMaxItems: false,
  strictIndexSignatures: false,
  style: {
    bracketSpacing: false,
    printWidth: 120,
    semi: true,
    singleQuote: false,
    tabWidth: 2,
    trailingComma: 'none',
    useTabs: false
  },
  unreachableDefinitions: false,
  unknownAny: true
}

export function compileFromFile(filename: string, options: Partial<Options> = DEFAULT_OPTIONS): Promise<string> {
  const contents = Try(
    () => readFileSync(filename),
    () => {
      throw new ReferenceError(`Unable to read file "${filename}"`)
    }
  )
  const schema = Try<JSONSchema4>(
    () => JSON.parse(contents.toString()),
    () => {
      throw new TypeError(`Error parsing JSON in file "${filename}"`)
    }
  )
  return compile(schema, stripExtension(filename), {cwd: dirname(filename), ...options})
}

export async function compile(schema: JSONSchema4, name: string, options: Partial<Options> = {}): Promise<string> {
  const _options = merge({}, DEFAULT_OPTIONS, options)

  const errors = validate(schema, name)
  if (errors.length) {
    errors.forEach(_ => error(_))
    throw new ValidationError()
  }

  // normalize options
  if (!endsWith(_options.cwd, '/')) {
    _options.cwd += '/'
  }

  return format(
    generate(optimize(parse(await dereference(normalize(schema, name, _options), _options), _options)), _options),
    _options
  )
}

export class ValidationError extends Error {}
