/* istanbul ignore file */
import type { IReactionPublic } from 'mobx'

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
