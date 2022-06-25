import {
  Collection,
  DuplicateModelStrategy,
  ModelCompareResult
} from './collection/Collection'
import { Model } from './model/Model'

/** Factory function  for creating the {@link Model} */
export type FactoryFn<T, K = any> = (args: K) => T | Promise<T>

/**
 * Model transport errors
 * @typeParam TSave - save error
 * @typeParam TDelete - delete error
 */
export type ModelTransportErrors<TSave = any | null, TDelete = any | null> = {
  /** Model save error*/
  save: TSave
  /** Model delete error*/
  delete: TDelete
}

/**
 * Transport interface for collection transport
 * @typeParam TModel - model that will be handled by the interface
 * @typeParam TDTO - raw model data for serialization and deserialization of models
 */
export interface Transport<TModel extends Model = Model, TDTO = any> {
  /**
   * Loads the model data. This method should just return the data that the factory requires to construct
   * the models.
   * @param config - transport config
   * @returns array of model data for model construction
   */
  load(config?: any): Promise<{ data: TDTO[] }>

  /**
   * Saves the model
   * @param model - model to save
   * @param config - save configuration
   * @returns Object with optional "data" property to pass back to collection
   */
  save(model: TModel, config?: any): Promise<{ data?: any } | void>

  /**
   * Deletes the model
   * @param model - model to delete
   * @param config - delete configuration
   * @returns Object with optional "data" property to pass back to collection
   */
  delete(model: TModel, config?: any): Promise<{ data?: any } | void>
}

/**
 * Return type of {@link Transport.save} call
 * @typeParam T - transport
 */
export type TransportSaveResponse<T extends Transport<any>> = Awaited<
  ReturnType<T['save']>
>

/**
 * Configuration for {@link Transport.save} method
 * @typeParam T - transport
 */
export type TransportSaveConfig<T extends Transport<any>> = Parameters<
  T['save']
>[1]

/**
 * Collection {@link Collection.save} method return type
 * @typeParam  TModel - collection model {@link Model}
 * @typeParam TTransport - collection transport {@link Transport}
 */
export type SaveResult<
  TModel extends Model,
  TTransport extends Transport<TModel>
> =
  | {
      error: undefined
      /** transport response {@link TransportSaveResponse} */
      response: TransportSaveResponse<TTransport>
      /** model that has been saved*/
      model: TModel
    }
  | {
      /** error from {@link Collection.save} method*/
      error: Omit<NonNullable<any>, 'false'>
      response: undefined
      model: undefined
    }

/**
 * Collection callback when {@link Collection.save} method executes
 * @typeParam TModel - collection model type {@link Model}
 * @typeParam TTransport - collection transport type {@link Transport}
 */
export type SaveStartCallback<
  TModel extends Model,
  TTransport extends Transport<TModel>
> = {
  /** Model to be saved*/
  model: TModel
  /** {@link SaveConfig} config passed to the ${@link Collection.save} method*/
  config: SaveConfig
  /** {@link TransportSaveConfig} config passed to the {@link Transport.save} method*/
  transportConfig?: TransportSaveConfig<TTransport>
}
/**
 * Model callback when {@link Model.save} method executes
 * @typeParam TTransport - {@link Transport} that is associated with the models {@link Collection}
 */
export type ModelSaveStartCallback<
  TTransport extends Transport<Model> = Transport<Model>
> = {
  /** {@link SaveConfig} that is passed to the {@link Collection.save} method*/
  config: SaveConfig
  /** {@link TransportSaveConfig} that is passed to the {@link Transport.save} method*/
  transportConfig?: TransportSaveConfig<TTransport>
}

/**
 * Model callback  when {@link Model.save} method executes successfully
 * @typeParam TTransport - {@link Transport} that is associated with the model {@link Collection}
 */
export type ModelSaveSuccessCallback<
  TTransport extends Transport<Model> = Transport<Model>
> = {
  /** {@link Transport.save} method response*/
  response: TransportSaveResponse<TTransport>
} & ModelSaveStartCallback<TTransport>

/**
 * Model callback when {@link Model.save} method fails
 * @typeParam TModel - model that is being saved
 * @typeParam TTransport - {@link Transport} that is associated with the model {@link Collection}
 * @typeParam TError - error that is returned from the  {@link Collection.save} method
 */
export type ModelSaveErrorCallback<
  TModel extends Model,
  TTransport extends Transport<TModel> = Transport<TModel>,
  TError = any
> = ModelSaveStartCallback<TTransport> & {
  /** Error that is retured from the {@link Collection.save} method*/
  error: TError
  /** Serialized model data that failed to be saved*/
  dataToSave: Payload<TModel>
}

/**
 * Collection callback when {@link Collection.save} method is executed successfully
 * @typeParam TModel - collection model {@link Model}
 * @typeParam TTransport - collection transport {@link Transport}
 */
export type SaveSuccessCallback<
  TModel extends Model,
  TTransport extends Transport<TModel>
> = {
  /** response from the {@link Transport.save} call*/
  response: TransportSaveResponse<TTransport>
} & SaveStartCallback<TModel, TTransport>

/**
 * Collection callback when {@link Collection.save} method fails
 * @typeParam TModel - collection model {@link Model}
 * @typeParam TTransport - collection transport {@link Transport}
 * @typeParam TError - custom error returned from the {@link Collection.save}
 */
export type SaveErrorCallback<
  TModel extends Model,
  TTransport extends Transport<TModel>,
  TError = any
> = SaveStartCallback<TModel, TTransport> & {
  /** Error that is retured from the {@link Collection.save} method*/
  error: TError
}

/**
 * Return type of {@link Transport.delete} method
 * @typeParam T - transport @see {@link Transport.delete}
 */
export type TransportDeleteResponse<T extends Transport<any>> = Awaited<
  ReturnType<T['delete']>
>

/** Configuration for {@link Transport.delete} method
 * @typeParam T - transport @see {@link Transport}
 *
 */
export type TransportDeleteConfig<T extends Transport<any>> = Parameters<
  T['delete']
>[1]

/**
 * Collection delete {@link Collection.delete} method return type
 *
 * @typeParam TModel - collection model {@link Model}
 * @typeParam TTransport - collection transport {@link Transport}
 */
export type DeleteResult<
  TModel extends Model,
  TTransport extends Transport<TModel>
> =
  | {
      error: undefined
      /** original {@link Transport.delete} method response*/
      response: TransportDeleteResponse<TTransport>
      /** model that has been deleted*/
      model: TModel
    }
  | {
      /** error when {@link Collection.delete} method fails*/
      error: Omit<NonNullable<any>, 'false'>
      response: undefined
      model: undefined
    }

/**
 * Collection callback when {@link Collection.delete} method executes
 * @typeParam TModel - collection model type {@link Model}
 * @typeParam TTransport - collection transport type {@link Transport}
 */
export type DeleteStartCallback<
  TModel extends Model,
  TTransport extends Transport<TModel>
> = {
  /** Model to be saved*/
  model: TModel
  /** {@link DeleteConfig} configuration passed to the {@link Collection.delete} method*/
  config: DeleteConfig
  /** {@link TransportDeleteConfig} configuration passed to the {@link Transport.delete} method*/
  transportConfig?: TransportDeleteConfig<TTransport>
}

/**
 * Model callback when {@link Model.delete} method executes
 * @typeParam TTransport - {@link Transport} that is associated with the model {@link Collection}
 */
export type ModelDeleteStartCallback<TTransport extends Transport<Model>> = {
  /** {@link DeleteConfig} configuration passed to the {@link Collection.delete} method*/
  config: DeleteConfig

  /** {@link TransportDeleteConfig} configuration passed to the {@link Transport.delete} method*/
  transportConfig?: TransportDeleteConfig<TTransport>
}

/**
 * Collection callback when {@link Collection.delete} has executed successfully
 * @typeParam TModel - collection model {@link Model}
 * @typeParam TTransport - collection transport {@link Transport}
 */
export type DeleteSuccessCallback<
  TModel extends Model,
  TTransport extends Transport<TModel>
> = {
  /** response from the {@link Transport.delete} call*/
  response: TransportDeleteResponse<TTransport>
} & DeleteStartCallback<TModel, TTransport>

/**
 * Model callback  when the {@link Model.delete} executes successfully
 * @typeParam TTransport - {@link Transport} that is associated with the model {@link Collection}
 */
export type ModelDeleteSuccessCallback<TTransport extends Transport<Model>> = {
  /** @see {@link Transport.delete} method response*/
  response: TransportDeleteResponse<TTransport>
} & ModelDeleteStartCallback<TTransport>

/**
 * Collection callback when {@link Collection.delete} fails
 * @typeParam TModel - collection model {@link Model}
 * @typeParam TTransport - collection transport {@link Transport}
 * @typeParam TError - custom error returned from the {@link Collection.delete}
 */
export type DeleteErrorCallback<
  TModel extends Model,
  TTransport extends Transport<TModel>,
  TError = any
> = DeleteStartCallback<TModel, TTransport> & {
  /** Error that is retured from the {@link Collection.delete} method*/
  error: TError
}

/**
 * Model callback when {@link Model.delete} fails
 * @typeParam TModel - model that is being saved
 * @typeParam TTransport - {@link Transport} that is associated with the model {@link Collection}
 * @typeParam TError - error that is returned from the  {@link Collection.delete}
 */
export type ModelDeleteErrorCallback<
  TTransport extends Transport<Model>,
  TError = any
> = ModelDeleteStartCallback<TTransport> & {
  /** Error that is retured from the {@link Collection.delete}*/
  error: TError
}

/**
 * Return type of {@link Transport.load}
 * @typeParam T - transport @see {@link Transport.delete}
 */
export type TransportLoadResponse<T extends Transport<any>> = Awaited<
  ReturnType<T['load']>
>

/**
 * {@link Transport.load} configuration
 * @typeParam T - transport
 */
export type TransportLoadConfig<T extends Transport<any>> = Parameters<
  T['load']
>[0]

/**
 * Return type of {@link Collection.load} method
 * @typeParam  TModel - collection model {@link Model}
 * @typeParam TTransport - collection transport {@link Transport}
 */
export type LoadResult<
  TModel extends Model,
  TTransport extends Transport<TModel>
> =
  | {
      /** array of added models*/
      added: TModel[]
      /** array of removed models*/
      removed: TModel[]
      /** collection transport response {@link TransportLoadResonse}*/
      response: TransportLoadResponse<TTransport>
      error: undefined
    }
  | {
      /** error from {@link Collection.load} method */
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

/**
 * Collection callback when {@link Collection.load} executes
 * @typeParam TModel - collection model type {@link Model}
 * @typeParam TTransport - collection transport type {@link Transport}
 */
export type LoadSuccessCallback<
  TModel extends Model,
  TTransport extends Transport<TModel>
> = LoadStartCallback<TModel, TTransport> & {
  /** array of added models*/
  added: TModel[]
  /** array of removed  models*/
  removed: TModel[]
  /** collection transport response {@link TransportLoadResonse}*/
  response: TransportLoadResponse<TTransport>
}

/**
 * Collection callback when {@link Collection.load} method fails
 * @typeParam TModel - collection model {@link Model}
 * @typeParam TTransport - collection transport {@link Transport}
 * @typeParam TError - custom error returned from the {@link Collection.load}
 */
export type LoadErrorCallback<
  TModel extends Model,
  TTransport extends Transport<TModel>,
  TError = any
> = LoadStartCallback<TModel, TTransport> & {
  /** Error that is retured from the {@link Collection.load} method*/
  error: TError
}

/** Initial collection configuration*/
export type CollectionConfig = {
  /** @see {@link SaveConfig}*/
  save?: SaveConfig
  /** @see {@link DeleteConfig}*/
  delete?: DeleteConfig
  /** @see {@link LoadConfig}*/
  load?: LoadConfig
  /** @see {@link RemoveConfig}*/
  remove?: RemoveConfig
  /** @see {@link ResetConfig}*/
  reset?: ResetConfig
  /** @see {@link AddConfig}*/
  add?: AddConfig
}

/** Collection configuration with all properties required*/
export type RequiredCollectionConfig = {
  /** @see {@link SaveConfig}*/
  save: Required<SaveConfig>
  /** @see {@link DeleteConfig}*/
  delete: Required<DeleteConfig>
  /** @see {@link LoadConfig}*/
  load: Required<LoadConfig>
  /** @see {@link RemoveConfig}*/
  remove: Required<RemoveConfig>
  /** @see {@link ResetConfig}*/
  reset: Required<ResetConfig>
  /** @see {@link AddConfig}*/
  add: Required<AddConfig>
}

/**
 * Model insert postion inside the collection
 */
export type ModelInsertPosition = 'start' | 'end'

/** Collection add configuration*/
export type AddConfig = {
  /** Model insert position {@link ModelInsertPosition}*/
  insertPosition?: ModelInsertPosition
  // removeFromPreviousCollection?: boolean
}

/** Collection remove configuration*/
export type RemoveConfig = {
  /** Should the model be destroyed when removed from the colection {@link Model.destroy}*/
  destroy?: boolean
}

/** Collection reset configuration*/
export type ResetConfig = {
  /** Should the model be destroyed when removed from the colection via {@link Collection.reset} {@link Model.destroy}*/
  destroy?: boolean
}

/** Collection save configuration
 * @see {@link Collection.save}
 */
export type SaveConfig = {
  /** Model insert position {@link ModelInsertpPosition}*/
  insertPosition?: ModelInsertPosition
  /** Should the model be added immediately, before {@link Collection.save} process completes*/
  addImmediately?: boolean
  /** Should the model be added when there is an error while saving*/
  addOnError?: boolean
}

/** Collection delete configuration
 * @see {@link Collection.delete}
 */
export type DeleteConfig = {
  /** Should the model be removed when deleted*/
  remove?: boolean
  /** Should the model be removed immediately, before {@link Collection.delete} process completes*/
  removeImmediately?: boolean
  /** Should the model be removed when there is an error while deleting*/
  removeOnError?: boolean
  /** Should the model be destroyed when removed {@link Model.destroy}*/
  destroyOnRemoval?: boolean
}

/** Collection load configuration
 * @see {@link Collection.load}
 */
export type LoadConfig = {
  /** How to handle duplicate models in the collection {@link DuplicateModelStrategy}*/
  duplicateModelStrategy?: keyof typeof DuplicateModelStrategy
  /** should removed models be destroyed {@link Model.destroy}*/
  destroyOnRemoval?: boolean

  /** how should old and new models with the same identity be compared {@link ModelCompareResult}*/
  compareFn?: BivariantCompareFn<Model>
  /** model insert position {@link ModelInsertPosition}*/
  insertPosition?: ModelInsertPosition
  /** should the collection be reset when new models are added*/
  reset?: boolean
  /** if the collection is reset after {@link Collection.load} should the removed models be destroyed {@link Model.destroy}*/
  destroyOnReset?: false
}

/**
 *  Collection autosave configuration
 * @see {@link AutosaveCollection}
 */
export type AutosaveCollectionConfig = CollectionConfig & {
  autoSave?: {
    /** should autosave be enabled*/
    enabled?: boolean
    /** debounce autosave call in milliseconds*/
    debounce?: number
  }
}

/**
 * Autosave configuration with all the properties required
 * @see {@link AutosaveCollectionConfig}
 * @see {@link CollectionConfig}
 */
export type RequiredAutosaveCollectionConfig = RequiredCollectionConfig &
  Required<AutosaveCollectionConfig>

/**
 *  Extract model from the collection
 *  @typeParam T - {@link Collection}
 */
export type ExtractModel<T> = T extends Collection<infer T, any, any>
  ? T
  : never

/**
 *  Extract factory from the collection
 *  @typeParam T - {@link Collection}
 */
export type ExtractFactory<T> = T extends Collection<any, infer T, any>
  ? T
  : never

/**
 *  Extract transport from the collection
 *  @typeParam T - {@link Collection}
 */
export type ExtractTransport<T> = T extends Collection<any, any, infer T>
  ? T
  : never

/**
 * Extract model payload data
 * @typeParam T - Model {@link Model} to get the payload
 * @see {@link Model.payload}
 * */
export type Payload<T extends Model> = ReturnType<T['serialize']>

// https://stackoverflow.com/questions/52667959/what-is-the-purpose-of-bivariancehack-in-typescript-types
type BivariantCompareFn<T extends Model> = {
  bivarianceHack(newModel: T, oldModel: T): keyof typeof ModelCompareResult
}['bivarianceHack']
