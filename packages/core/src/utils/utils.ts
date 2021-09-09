import { IReactionPublic } from 'mobx'
import { Collection } from '../collection/Collection'

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
