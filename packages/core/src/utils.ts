/* istanbul ignore file */
import type { IReactionPublic } from 'mobx'
import { Collection } from './collection/Collection'

export function wrapInArray<T = any>(item: T | T[]): T[] {
  return Array.isArray(item) ? [...item] : [item]
}

export function assertCollectionExists(
  collection: unknown,
  msg?: string
): asserts collection is Collection<any, any, any> {
  if (!collection) {
    throw new Error(msg ?? 'Collection not present')
  }
}

export const ASYNC_STATUS = {
  PENDING: 'PENDING',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
  IDLE: 'IDLE'
} as const

const isObject = (value: unknown): boolean =>
  value !== null && (typeof value === 'object' || typeof value === 'function')

export function isPromise<T>(value: Promise<T> | T): value is Promise<T> {
  return (
    value instanceof Promise ||
    (isObject(value) &&
      // @ts-expect-error - value might not be a promise
      typeof value.then === 'function' &&
      // @ts-expect-error - value might not be a promise
      typeof value.catch === 'function')
  )
}

export function unwrapResult<T extends { error: any }>(
  result: T
): Omit<
  Extract<
    T,
    {
      error: 0 | '' | false | undefined | null
    }
  >,
  'error'
> {
  const data = result

  if (data.error) {
    throw data.error
  }

  // https://stackoverflow.com/questions/69378795/narrow-down-the-return-result-based-on-a-property-value
  const { error, ...ret } = result as Extract<
    T,
    { error: 0 | '' | false | undefined | null }
  >

  return ret
}

export function debounceReaction<T>(
  effect: (arg: T, oldArg: T, r: IReactionPublic) => void,
  debounceMs: number
): (arg: T, oldArg: T, r: IReactionPublic) => void {
  let timer: NodeJS.Timeout

  return (arg: T, oldArg: T, r: IReactionPublic) => {
    clearTimeout(timer)
    timer = setTimeout(() => effect(arg, oldArg, r), debounceMs)
  }
}
