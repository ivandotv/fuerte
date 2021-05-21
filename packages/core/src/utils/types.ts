import { Collection } from '../collection/Collection'
import {
  DuplicateModelStrategy,
  ModelCompareResult
} from '../collection/collection-config'
import { Model } from '../model/Model'
import { Persistence } from '../transport/Transport'

export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T

export type FactoryFn<T, K extends any> = (args: K) => T | Promise<T>
export type Factory<T, K extends any = any> = {
  create: FactoryFn<T, K>
}

/* RELOAD TYPES */
export type PersistenceReloadReturn<T extends Persistence<any, any>> =
  UnwrapPromise<ReturnType<T['reload']>>

export type PersistenceReloadConfig<T extends Persistence<any, any>> =
  Parameters<T['reload']>[1]

export type ReloadStart<
  T extends Persistence<K, any>,
  K extends Model<any, any>
> = {
  model: K
  config: ReloadConfig
  persistenceConfig?: PersistenceReloadConfig<T>
}

export type ReloadSuccess<
  T extends Persistence<K, any>,
  K extends Model<any, any>
> = {
  response: PersistenceReloadReturn<T>
  data: PersistenceReloadReturn<T>['data']
} & ReloadStart<T, K>

export type ReloadError<
  T extends Persistence<K, any>,
  K extends Model<any, any>
> = ReloadStart<T, K> & { error: any }

/* SAVE TYPES */
export type PersistenceSaveReturn<T extends Persistence<any, any>> =
  UnwrapPromise<ReturnType<T['save']>>

export type PersistenceSaveConfig<T extends Persistence<any, any>> = Parameters<
  T['save']
>[1]

export type SaveStart<
  T extends Persistence<K, any>,
  K extends Model<any, any>
> = {
  model: K
  config: SaveConfig
  persistenceConfig?: PersistenceSaveConfig<T>
}

export type SaveSuccess<
  T extends Persistence<K, any>,
  K extends Model<any, any>
> = {
  response: PersistenceSaveReturn<T>
  data?: PersistenceSaveReturn<T>['data']
} & SaveStart<T, K>

export type SaveError<
  T extends Persistence<K, any>,
  K extends Model<any, any>
> = SaveStart<T, K> & { error: any }

/* DELETE TYPES */

export type PersistenceDeleteReturn<T extends Persistence<any, any>> =
  UnwrapPromise<ReturnType<T['delete']>>

export type PersistenceDeleteConfig<T extends Persistence<any, any>> =
  Parameters<T['delete']>[1]

export type DeleteStart<
  T extends Persistence<K, any>,
  K extends Model<any, any>
> = {
  model: K
  config: DeleteConfig
  persistenceConfig?: PersistenceDeleteConfig<T>
}

export type DeleteSuccess<
  T extends Persistence<K, any>,
  K extends Model<any, any>
> = {
  response: PersistenceDeleteReturn<T>
} & DeleteStart<T, K>

export type DeleteError<
  T extends Persistence<K, any>,
  K extends Model<any, any>
> = DeleteStart<T, K> & { error: any }

/* LOAD TYPES */

export type PersistenceLoadReturn<T extends Persistence<any, any>> =
  UnwrapPromise<ReturnType<T['load']>>

export type PersistenceLoadConfig<T extends Persistence<any, any>> = Parameters<
  T['load']
>[0]

export type LoadStart<
  T extends Persistence<K, any>,
  K extends Model<any, any>
> = {
  config: SaveConfig
  persistenceConfig?: PersistenceLoadConfig<T>
}

export type LoadSuccess<
  T extends Persistence<K, any>,
  K extends Model<any, any>
> = LoadStart<T, K> & {
  added: K[]
  removed: K[]
  response: PersistenceLoadReturn<T>
}

export type LoadError<
  T extends Persistence<K, any>,
  K extends Model<any, any>
> = LoadStart<T, K> & { error: any }

export type CollectionConfig = {
  autoSave?: AutoSaveConfig
  add?: AddConfig
  save?: SaveConfig
  reload?: ReloadConfig
  delete?: DeleteConfig
  load?: LoadConfig
}

export type RequiredCollectionConfig = {
  autoSave: Required<AutoSaveConfig>
  add: Required<AddConfig>
  save: Required<SaveConfig>
  reload: Required<ReloadConfig>
  delete: Required<DeleteConfig>
  load: Required<LoadConfig>
}

export type ModelInsertPosition = 'start' | 'end' | number

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

export interface ReloadConfig {
  // removeIfNoData?: boolean
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
