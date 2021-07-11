import { Collection } from '../collection/Collection'
import {
  DuplicateModelStrategy,
  ModelCompareResult
} from '../collection/collection-config'
import { Model } from '../model/Model'
import { Transport } from '../transport/transport'

export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T

export type FactoryFn<T, K extends any> = (args: K) => T | Promise<T>
export type Factory<T, K extends any = any> = {
  create: FactoryFn<T, K>
}

/* SAVE TYPES */
export type TransportSaveResponse<T extends Transport<any>> = UnwrapPromise<
  ReturnType<T['save']>
>

export type TransportSaveConfig<T extends Transport<any>> = Parameters<
  T['save']
>[1]

export type SaveStart<T extends Transport<K>, K extends Model<any, any>> = {
  model: K
  config: SaveConfig
  transportConfig?: TransportSaveConfig<T>
}

export type SaveSuccess<T extends Transport<K>, K extends Model<any, any>> = {
  response: TransportSaveResponse<T>
} & SaveStart<T, K>

export type SaveError<
  T extends Transport<K>,
  K extends Model<any, any>
> = SaveStart<T, K> & { error: any }

/* DELETE TYPES */

export type TransportDeleteResponse<T extends Transport<any>> = UnwrapPromise<
  ReturnType<T['delete']>
>

export type TransportDeleteConfig<T extends Transport<any>> = Parameters<
  T['delete']
>[1]

export type DeleteStart<T extends Transport<K>, K extends Model<any, any>> = {
  model: K
  config: DeleteConfig
  transportConfig?: TransportDeleteConfig<T>
}

export type DeleteSuccess<T extends Transport<K>, K extends Model<any, any>> = {
  response: TransportDeleteResponse<T>
} & DeleteStart<T, K>

export type DeleteError<
  T extends Transport<K>,
  K extends Model<any, any>
> = DeleteStart<T, K> & { error: any }

/* LOAD TYPES */

export type TransportLoadResponse<T extends Transport<any>> = UnwrapPromise<
  ReturnType<T['load']>
>

export type TransportLoadConfig<T extends Transport<any>> = Parameters<
  T['load']
>[0]

export type LoadStart<T extends Transport<K>, K extends Model<any, any>> = {
  config: SaveConfig
  transportConfig?: TransportLoadConfig<T>
}

export type LoadSuccess<
  T extends Transport<K>,
  K extends Model<any, any>
> = LoadStart<T, K> & {
  added: K[]
  removed: K[]
  response: TransportLoadResponse<T>
}

export type LoadError<
  T extends Transport<K>,
  K extends Model<any, any>
> = LoadStart<T, K> & { error: any }

export type CollectionConfig = {
  autoSave?: AutoSaveConfig
  add?: AddConfig
  save?: SaveConfig
  delete?: DeleteConfig
  load?: LoadConfig
  sortFn?: (a: any, b: any) => number
}

export type RequiredCollectionConfig = {
  autoSave: Required<AutoSaveConfig>
  add: Required<AddConfig>
  save: Required<SaveConfig>
  delete: Required<DeleteConfig>
  load: Required<LoadConfig>
  sortFn?: (a: any, b: any) => number
}

export type ModelInsertPosition = 'start' | 'end'

export type AddConfig = {
  insertPosition?: ModelInsertPosition
  // removeFromPreviousCollection?: boolean
}
export interface SaveConfig {
  insertPosition?: ModelInsertPosition
  addImmediately?: boolean
  addOnError?: boolean
}

export interface DeleteConfig {
  remove?: boolean
  removeImmediately?: boolean
  removeOnError?: boolean
}

export interface AutoSaveConfig {
  enabled?: boolean
  debounceMs?: number
}

type BivariantCompareFn<T extends Model<Collection<any, any, any>>> = {
  bivarianceHack(newModel: T, oldModel: T): keyof typeof ModelCompareResult
}['bivarianceHack']

export interface LoadConfig {
  duplicateModelStrategy?: keyof typeof DuplicateModelStrategy
  // https://stackoverflow.com/questions/52667959/what-is-the-purpose-of-bivariancehack-in-typescript-types
  compareFn?: BivariantCompareFn<Model<Collection<any, any, any>>>
  insertPosition?: ModelInsertPosition
  reset?: boolean
}
