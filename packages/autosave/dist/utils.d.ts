import type { IReactionPublic } from 'mobx';
export declare function debounceReaction<T>(effect: (arg: T, oldArg: T, r: IReactionPublic) => void, debounceMs: number): (arg: T, oldArg: T, r: IReactionPublic) => void;
