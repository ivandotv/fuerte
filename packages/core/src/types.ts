import { Collection } from './collection/Collection'
import {
  DuplicateModelStrategy,
  ModelCompareResult
} from './collection/collection-config'
import { Model } from './model/Model'

export type FactoryFn<T, K = any> = (args: K) => T | Promise<T>

export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T

export type ModelTransportErrors<TSave = any | null, TDelete = any | null> = {
  save: TSave
  delete: TDelete
}

export interface Transport<TModel extends Model = Model, TDTO = any> {
  load(config?: any): Promise<{ data: TDTO[] }>

  save(model: TModel, config?: any): Promise<{ data?: any } | void>

  delete(model: TModel, config?: any): Promise<{ data?: any } | void>
}

/* SAVE TYPES */
export type TransportSaveResponse<T extends Transport<any>> = UnwrapPromise<
  ReturnType<T['save']>
>

export type TransportSaveConfig<T extends Transport<any>> = Parameters<
  T['save']
>[1]

export type SaveResult<
  TModel extends Model,
  TTransport extends Transport<TModel>
> =
  | {
      error: undefined
      response: TransportSaveResponse<TTransport>
      model: TModel
    }
  | {
      error: Omit<NonNullable<any>, 'false'>
      response: undefined
      model: undefined
    }

export type SaveStartCallback<
  TModel extends Model,
  TTransport extends Transport<TModel>
> = {
  model: TModel
  config: SaveConfig
  transportConfig?: TransportSaveConfig<TTransport>
}

export type ModelSaveStartCallback<
  TTransport extends Transport<Model> = Transport<Model>
> = {
  config: SaveConfig
  transportConfig?: TransportSaveConfig<TTransport>
}

export type SaveSuccessCallback<
  TModel extends Model,
  TTransport extends Transport<TModel>
> = {
  response: TransportSaveResponse<TTransport>
} & SaveStartCallback<TModel, TTransport>

export type ModelSaveSuccessCallback<
  TTransport extends Transport<Model> = Transport<Model>
> = {
  response: TransportSaveResponse<TTransport>
} & ModelSaveStartCallback<TTransport>

export type SaveErrorCallback<
  TModel extends Model,
  TTransport extends Transport<TModel>,
  TError = any
> = SaveStartCallback<TModel, TTransport> & { error: TError }

export type ModelSaveErrorCallback<
  TDTO = any,
  TTransport extends Transport<Model> = Transport<Model>,
  TError = any
> = ModelSaveStartCallback<TTransport> & { error: TError; dataToSave: TDTO }

/* DELETE TYPES */

export type TransportDeleteResponse<T extends Transport<any>> = UnwrapPromise<
  ReturnType<T['delete']>
>

export type TransportDeleteConfig<T extends Transport<any>> = Parameters<
  T['delete']
>[1]

export type DeleteResult<
  TModel extends Model,
  TTransport extends Transport<TModel>
> =
  | {
      error: undefined
      response: TransportDeleteResponse<TTransport>
      model: TModel
    }
  | {
      error: Omit<NonNullable<any>, 'false'>
      response: undefined
      model: undefined
    }

export type DeleteStartCallback<
  TModel extends Model,
  TTransport extends Transport<TModel>
> = {
  model: TModel
  config: DeleteConfig
  transportConfig?: TransportDeleteConfig<TTransport>
}

export type ModelDeleteStartCallback<TTransport extends Transport<Model>> = {
  config: DeleteConfig
  transportConfig?: TransportDeleteConfig<TTransport>
}

export type DeleteSuccessCallback<
  TModel extends Model,
  TTransport extends Transport<TModel>
> = {
  response: TransportDeleteResponse<TTransport>
} & DeleteStartCallback<TModel, TTransport>

export type ModelDeleteSuccessCallback<TTransport extends Transport<Model>> = {
  response: TransportDeleteResponse<TTransport>
} & ModelDeleteStartCallback<TTransport>

export type DeleteErrorCallback<
  TModel extends Model,
  TTransport extends Transport<TModel>,
  TError = any
> = DeleteStartCallback<TModel, TTransport> & { error: TError }

export type ModelDeleteErrorCallback<
  TTransport extends Transport<Model>,
  TError = any
> = ModelDeleteStartCallback<TTransport> & { error: TError }

/* LOAD TYPES */

export type TransportLoadResponse<T extends Transport<any>> = UnwrapPromise<
  ReturnType<T['load']>
>

export type TransportLoadConfig<T extends Transport<any>> = Parameters<
  T['load']
>[0]

export type LoadResult<
  TModel extends Model,
  TTransport extends Transport<TModel>
> =
  | {
      added: TModel[]
      removed: TModel[]
      response: TransportLoadResponse<TTransport>
      error: undefined
    }
  | {
      error: Omit<NonNullable<any>, 'false'>
      response: undefined
      added: undefined
      removed: undefined
    }

export type LoadStartCallback<
  TModel extends Model,
  TTransport extends Transport<TModel>
> = {
  config: SaveConfig
  transportConfig?: TransportLoadConfig<TTransport>
}

export type LoadSuccessCallback<
  TModel extends Model,
  TTransport extends Transport<TModel>
> = LoadStartCallback<TModel, TTransport> & {
  added: TModel[]
  removed: TModel[]
  response: TransportLoadResponse<TTransport>
}

export type LoadErrorCallback<
  TModel extends Model,
  TTransport extends Transport<TModel>,
  E = any
> = LoadStartCallback<TModel, TTransport> & { error: E }

export type CollectionConfig = {
  save?: SaveConfig
  delete?: DeleteConfig
  load?: LoadConfig
  remove?: RemoveConfig
  reset?: ResetConfig
  add?: AddConfig
}

export type RequiredCollectionConfig = {
  save: Required<SaveConfig>
  delete: Required<DeleteConfig>
  load: Required<LoadConfig>
  remove: Required<RemoveConfig>
  reset: Required<ResetConfig>
  add: Required<AddConfig>
}

export type ModelInsertPosition = 'start' | 'end'

export type AddConfig = {
  insertPosition?: ModelInsertPosition
  // removeFromPreviousCollection?: boolean
}

export type RemoveConfig = {
  destroy?: boolean
}

export type ResetConfig = {
  destroy?: boolean
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
  destroyOnRemoval?: boolean
}

type BivariantCompareFn<T extends Model> = {
  bivarianceHack(newModel: T, oldModel: T): keyof typeof ModelCompareResult
}['bivarianceHack']

export interface LoadConfig {
  duplicateModelStrategy?: keyof typeof DuplicateModelStrategy
  destroyOnRemoval?: boolean
  // https://stackoverflow.com/questions/52667959/what-is-the-purpose-of-bivariancehack-in-typescript-types
  compareFn?: BivariantCompareFn<Model>
  insertPosition?: ModelInsertPosition
  reset?: boolean
  destroyOnReset?: false
}

export interface AutoSaveConfig {
  enabled?: boolean
  debounce?: number
}
export type AutosaveCollectionConfig = CollectionConfig & {
  autoSave?: AutoSaveConfig
}

export type RequiredAutosaveCollectionConfig = RequiredCollectionConfig & {
  autoSave: Required<AutoSaveConfig>
}

export type ExtractTransport<P> = P extends Collection<any, any, infer T>
  ? T
  : never

export type Payload<T extends Model> = ReturnType<T['serialize']>
