import { Collection } from '../collection/Collection'
import {
  DuplicateModelStrategy,
  ModelCompareResult
} from '../collection/collection-config'
import { Model } from '../model/Model'
import { Transport } from '../transport/transport'

export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T

export type ModelTransportErrors<TSave = any | null, TDelete = any | null> = {
  save: TSave
  delete: TDelete
}

/* SAVE TYPES */
export type TransportSaveResponse<T extends Transport<any>> = UnwrapPromise<
  ReturnType<T['save']>
>

export type TransportSaveConfig<T extends Transport<any>> = Parameters<
  T['save']
>[1]

export type SaveResult<
  TModel extends Model<any>,
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
  TModel extends Model<any>,
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
  TModel extends Model<any>,
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
  TModel extends Model<any>,
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
  TModel extends Model<any>,
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
  TModel extends Model<any>,
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
  TModel extends Model<any>,
  TTransport extends Transport<TModel>
> = {
  response: TransportDeleteResponse<TTransport>
} & DeleteStartCallback<TModel, TTransport>

export type ModelDeleteSuccessCallback<TTransport extends Transport<Model>> = {
  response: TransportDeleteResponse<TTransport>
} & ModelDeleteStartCallback<TTransport>

export type DeleteErrorCallback<
  TModel extends Model<any>,
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
  TModel extends Model<any>,
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
  TModel extends Model<any>,
  TTransport extends Transport<TModel>
> = {
  config: SaveConfig
  transportConfig?: TransportLoadConfig<TTransport>
}

export type LoadSuccessCallback<
  TModel extends Model<any>,
  TTransport extends Transport<TModel>
> = LoadStartCallback<TModel, TTransport> & {
  added: TModel[]
  removed: TModel[]
  response: TransportLoadResponse<TTransport>
}

export type LoadErrorCallback<
  TModel extends Model<any>,
  TTransport extends Transport<TModel>,
  E = any
> = LoadStartCallback<TModel, TTransport> & { error: E }

export type CollectionConfig = {
  add?: AddConfig
  save?: SaveConfig
  delete?: DeleteConfig
  load?: LoadConfig
}

export type RequiredCollectionConfig = {
  add: Required<AddConfig>
  save: Required<SaveConfig>
  delete: Required<DeleteConfig>
  load: Required<LoadConfig>
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
