import {
  action,
  computed,
  IReactionDisposer,
  makeObservable,
  observable,
  reaction,
  runInAction
} from 'mobx'
import { Model } from '../model/Model'
import {
  AddConfig,
  CollectionConfig,
  DeleteConfig,
  DeleteErrorCallback,
  DeleteResult,
  DeleteStartCallback,
  DeleteSuccessCallback,
  FactoryFn,
  LoadConfig,
  LoadErrorCallback,
  LoadResult,
  LoadStartCallback,
  LoadSuccessCallback,
  ModelInsertPosition,
  RemoveConfig,
  RequiredCollectionConfig,
  ResetConfig,
  SaveConfig,
  SaveErrorCallback,
  SaveResult,
  SaveStartCallback,
  SaveSuccessCallback,
  Transport,
  TransportDeleteConfig,
  TransportDeleteResponse,
  TransportLoadConfig,
  TransportLoadResponse,
  TransportSaveConfig,
  TransportSaveResponse
} from '../types'
import { ASYNC_STATUS, isPromise, wrapInArray } from '../utils'

export const DuplicateModelStrategy = {
  KEEP_NEW: 'KEEP_NEW',
  KEEP_OLD: 'KEEP_OLD',
  COMPARE: 'COMPARE'
} as const

export const ModelCompareResult = {
  KEEP_NEW: 'KEEP_NEW',
  KEEP_OLD: 'KEEP_OLD',
  KEEP_BOTH: 'KEEP_BOTH'
} as const

export class Collection<
  TModel extends Model,
  TFactory extends FactoryFn<TModel>,
  TTransport extends Transport<TModel>
> {
  loadError = undefined

  loadStatus: keyof typeof ASYNC_STATUS = 'IDLE'

  // holds models that are immediately removed while deleting
  _deleting: Map<string, TModel> = new Map()

  // holds models that are saving but are not yet added to collection
  protected _saving: Map<
    string,
    { token: Record<string, never>; model: TModel }
  > = new Map()

  protected declare config: RequiredCollectionConfig

  protected _models: TModel[] = []

  protected modelByCid: Map<string, TModel> = new Map()

  protected modelByIdentity: Map<string | number, TModel> = new Map()

  protected identityReactionByCid: Map<string, IReactionDisposer> = new Map()

  constructor(
    protected factory: TFactory,
    protected transport: TTransport,
    config?: CollectionConfig
  ) {
    this.config = {
      ...this.config,
      save: {
        insertPosition: 'end',
        addImmediately: true,
        addOnError: true,
        ...(config?.save ? config.save : undefined)
      },
      delete: {
        remove: true,
        destroyOnRemoval: true,
        removeImmediately: true,
        removeOnError: false,
        ...(config?.delete ? config.delete : undefined)
      },
      load: {
        duplicateModelStrategy: 'KEEP_NEW',
        compareFn: () => {
          return 'KEEP_NEW'
        },
        insertPosition: 'end',
        destroyOnRemoval: true,
        reset: false,
        destroyOnReset: false,
        ...(config?.load ? config.load : undefined)
      },
      add: {
        insertPosition: 'end',
        ...(config?.add ? config.add : undefined)
      },
      remove: {
        destroy: false,
        ...(config?.remove ? config.remove : undefined)
      },
      reset: {
        destroy: false,
        ...(config?.reset ? config.reset : undefined)
      }
    }

    makeObservable<
      this,
      | '_deleting'
      | '_saving'
      | '_models'
      | 'onSaveStart'
      | 'onSaveError'
      | 'onSaveSuccess'
      | 'onDeleteStart'
      | 'onDeleteSuccess'
      | 'onDeleteError'
      | 'onLoadStart'
      | 'onLoadSuccess'
      | 'onLoadError'
      | 'addToCollection'
      | 'removeFromCollection'
      | 'modelByCid'
      | 'modelByIdentity'
    >(this, {
      save: action,
      delete: action,
      load: action,
      _saving: observable.shallow,
      _deleting: observable.shallow,
      onSaveStart: action,
      onSaveSuccess: action,
      onSaveError: action,
      onDeleteStart: action,
      onDeleteSuccess: action,
      onDeleteError: action,
      onLoadStart: action,
      onLoadSuccess: action,
      onLoadError: action,
      loadStatus: observable,
      loadError: observable,
      add: action,
      _models: observable.shallow,
      modelByCid: observable.shallow,
      modelByIdentity: observable.shallow,
      addToCollection: action,
      removeFromCollection: action,
      destroy: action,
      syncing: computed,
      deleting: computed,
      saving: computed,
      new: computed,
      models: computed
    })
  }

  /**
   * Get collection config configuration {@link RequiredCollectionConfig}
   */
  getConfig(): RequiredCollectionConfig {
    return this.config
  }

  /**
   * Get collection transport instance {@link Transport}
   */
  getTransport(): TTransport {
    return this.transport
  }

  /**
   * Save the model to the collection.
   * Callbacks: {@link Collection.onSaveStart} {@link Collection.onSaveSuccess} {@link Collection.onSaveError}
   * will be called depending on the {@link Transport.save} result
   * When the model is added {@link Collection.onAdded} callback will be called
   * @param model - model to save
   * @param config - save configuration to be used {@link SaveConfig}
   * @param transportConfig - transport configuration to use {@link TransportSaveConfig}
   * @returns transport save result {@link SaveResult}
   */
  async save(
    model: TModel,
    config?: SaveConfig,
    transportConfig?: TransportSaveConfig<TTransport>
  ): Promise<SaveResult<TModel, TTransport>> {
    const saveConfig = {
      ...this.config.save,
      ...config
    }

    if (saveConfig.addImmediately) {
      // immediately add to collection
      this.addToCollection(model, { insertPosition: saveConfig.insertPosition })
    } else {
      this.assertIsModel(model)
    }

    const token = {}
    runInAction(() => {
      this._saving.set(model.cid, { token: token, model })
    })
    const dataToSave = model.payload
    // try {
    this.onSaveStart({
      model,
      config: saveConfig,
      transportConfig
    })
    // model.clearSaveError()
    model._onSaveStart({
      config: saveConfig,
      transportConfig,
      token
    })

    let response!: TransportSaveResponse<TTransport>
    let hasError = false
    let error
    let result

    try {
      response = await this.transportSave(model, transportConfig)
    } catch (e) {
      // fix closure leaks - read error stack
      // https://twitter.com/BenLesh/status/1365056053243613185
      e?.stack
      error = e
      hasError = true
    }

    if (hasError) {
      if (!saveConfig.addImmediately && saveConfig.addOnError) {
        this.addToCollection(model, {
          insertPosition: saveConfig.insertPosition
        })
      }

      this.onSaveError({
        model,
        error,
        config: saveConfig,
        transportConfig
      })

      model._onSaveError({
        error,
        config: saveConfig,
        transportConfig,
        token,
        dataToSave
      })

      result = {
        error,
        model: undefined,
        response: undefined
      }
    } else {
      // add it to the collection after save
      if (!saveConfig.addImmediately) {
        this.addToCollection(model, {
          insertPosition: saveConfig.insertPosition
        })
      }

      this.onSaveSuccess({
        model,
        response,
        config: saveConfig,
        transportConfig
      })

      model._onSaveSuccess({
        response,
        config: saveConfig,
        transportConfig,
        savedData: dataToSave,
        token
      })

      result = {
        response,
        model,
        error: undefined
      }
    }

    const tokenData = this._saving.get(model.cid)
    if (tokenData?.token === token) {
      runInAction(() => {
        this._saving.delete(model.cid)
      })
    }

    return result
  }

  protected transportSave(
    model: TModel,
    config?: TransportSaveConfig<TTransport>
  ): Promise<TransportSaveResponse<TTransport>> {
    return this.transport.save(model, config) as Promise<
      TransportSaveResponse<TTransport>
    >
  }

  protected transportDelete(
    model: TModel,
    config?: TransportDeleteConfig<TTransport>
  ): Promise<TransportDeleteResponse<TTransport>> {
    return this.transport.delete(model, config) as Promise<
      TransportDeleteResponse<TTransport>
    >
  }

  protected transportLoad(
    config?: TransportLoadConfig<TTransport>
  ): Promise<TransportLoadResponse<TTransport>> {
    return this.transport.load(config) as Promise<
      TransportLoadResponse<TTransport>
    >
  }

  /**
   * Callback for when {@link Collection.save} process starts
   * @param data - @see {@link SaveStartCallback}
   */
  protected onSaveStart(data: SaveStartCallback<TModel, TTransport>): void {}

  /**
   * Callback for when  {@link Collection.save} process completes successfully
   * @param data  - @see {@link SaveSuccessCallback}
   */
  protected onSaveSuccess(
    data: SaveSuccessCallback<TModel, TTransport>
  ): void {}

  /**
   * Callback for when {@link Collection.delete} process completes with error.
   * @param data - @see {@link SaveErrorCallback}
   */
  protected onSaveError(data: SaveErrorCallback<TModel, TTransport>): void {}

  /**
   * Get all models that are currently in the process of deleting
   */
  get deleting(): TModel[] {
    return [...this._deleting.values()]
  }

  /**
   * Get all models that are currently in the process of saving
   */
  get saving(): TModel[] {
    const models: TModel[] = []
    this._saving.forEach((data) => {
      models.push(data.model)
    })

    return models
  }

  /**
   * Delete model from the collection by model identity key, or model CID.
   * Callbacks  {@link Collection.onDeleteStart} {@link Collection.onDeleteSuccess} {@link Collection.onDeleteError}
   * will be called depending on the {@link Transport.delete} result.
   * When the model is removed from the collection {@link Collection.onRemoved} callback will be called
   * @param id  - model id
   * @param config - delete config to be used {@link DeleteConfig}
   * @param transportConfig - transport config to be used {@link TransportDeleteConfig}
   * @returns transport delete result {@link DeleteResult}
   */
  async delete(
    id: string,
    config?: DeleteConfig,
    transportConfig?: TransportDeleteConfig<TTransport>
  ): Promise<DeleteResult<TModel, TTransport>> {
    const deleteConfig = {
      ...this.config.delete,
      ...config
    }

    const model = this.resolveModel(id)

    try {
      this.modelCanBeDeleted(model)
    } catch (e) {
      return {
        error: e.message,
        response: undefined,
        model: undefined
      }
    }

    if (deleteConfig.remove && deleteConfig.removeImmediately) {
      this.removeFromCollection(model, {
        destroy: deleteConfig.destroyOnRemoval
      })
    }
    this._deleting.set(model.cid, model)

    this.onDeleteStart({
      model,
      config: deleteConfig,
      transportConfig: transportConfig
    })
    model._onDeleteStart({
      config: deleteConfig,
      transportConfig: transportConfig
    })

    let response!: TransportDeleteResponse<TTransport>
    let hasError = false
    let error
    let result

    try {
      response = await this.transportDelete(model, transportConfig)
    } catch (e) {
      e?.stack
      error = e
      hasError = true
    }

    if (hasError) {
      if (
        deleteConfig.remove &&
        !deleteConfig.removeImmediately &&
        deleteConfig.removeOnError
      ) {
        this.removeFromCollection(model, {
          destroy: deleteConfig.destroyOnRemoval
        })
      }
      this.onDeleteError({
        model,
        error,
        config: deleteConfig,
        transportConfig: transportConfig
      })
      model._onDeleteError({
        error,
        config: deleteConfig,
        data: error?.data,
        transportConfig: transportConfig
      })

      // throw error
      return {
        response: undefined,
        model: undefined,
        error
      }
    } else {
      if (deleteConfig.remove && !deleteConfig.removeImmediately) {
        this.removeFromCollection(model, {
          destroy: deleteConfig.destroyOnRemoval
        })
      }
      this.onDeleteSuccess({
        model,
        response,
        config: deleteConfig,
        transportConfig: transportConfig
      })
      model._onDeleteSuccess({
        response,
        config: deleteConfig,
        transportConfig: transportConfig
      })

      result = {
        response,
        model,
        error: undefined
      }
    }

    runInAction(() => {
      this._deleting.delete(model.cid)
    })

    return result
  }

  protected modelCanBeDeleted(model?: TModel): asserts model is TModel {
    this.assertModelIsExists(model)

    if (model.isDeleted) {
      throw new Error('Model is deleted')
    }
    if (model.isDeleting) {
      throw new Error('Model is in the process of deleting')
    }
  }

  protected assertModelIsExists(model?: TModel): asserts model {
    if (!model) {
      throw new Error('Model is not in the collection')
    }
  }

  /**
   * Callback for when  {@link Collection.delete} process starts
   * @param data  - @see {@link DeleteStartCallback}
   */
  protected onDeleteStart(
    data: DeleteStartCallback<TModel, TTransport>
  ): void {}

  /**
   * Callback for when  {@link Collection.delete} process completes successfully
   * @param data - @see {@link DeleteSuccessCallback}
   */
  protected onDeleteSuccess(
    data: DeleteSuccessCallback<TModel, TTransport>
  ): void {}

  /**
   * Callback for when  {@link Collection.delete} process completes with errors
   * @param data - @see {@link DeleteErrorCallback}
   */
  protected onDeleteError(
    _data: DeleteErrorCallback<TModel, TTransport>
  ): void {}

  /**
   * Load initial collection data. It calls {@link Transport.load} method.
   * Callbacks {@link Collection.onLoadStart} {@link Collection.onLoadSuccess} {@link Collection.onLoadError} will be called
   * @param config - load configuration {@link LoadConfig}
   * @param  transportConfig - transport configuration {@link TransportLoadConfig}
   * @returns transport load result {@link LoadResult}
   */
  async load(
    config?: LoadConfig,
    transportConfig?: TransportLoadConfig<TTransport>
  ): Promise<LoadResult<TModel, TTransport>> {
    this.loadError = undefined

    const loadConfig = {
      ...this.config.load,
      ...config
    }

    try {
      this.loadStatus = 'PENDING'
      this.onLoadStart({
        config: loadConfig,
        transportConfig
      })

      const response = await this.transportLoad(transportConfig)

      runInAction(() => {
        this.loadStatus = 'RESOLVED'
      })

      // run reset instead of the rest of the load function
      if (loadConfig.reset) {
        const [added, removed] = await this.resetCollection(response.data, {
          destroy: loadConfig.destroyOnReset
        })

        this.onLoadSuccess({
          config: loadConfig,
          transportConfig,
          response,
          added,
          removed
        })

        return {
          response,
          added,
          removed,
          error: undefined
        }
      }

      const modelsToAdd: TModel[] = []
      const modelsToRemove: string[] = []

      for (const modelData of response.data) {
        const modifiedData = this.onModelCreateData(modelData)

        if (!modifiedData) {
          continue
        }
        const model = await Promise.resolve(
          this._create(modifiedData, false, this)
        )
        if (this.notPresent(model)) {
          modelsToAdd.push(model)
        } else {
          // model is already present
          // resolve if it should be added
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const oldModel = this.modelByIdentity.get(model.identity)!

          const compareResult = loadConfig.compareFn(model, oldModel)

          switch (loadConfig.duplicateModelStrategy) {
            case 'KEEP_NEW':
              modelsToRemove.push(oldModel.cid)
              modelsToAdd.push(model)
              break
            case 'COMPARE':
              switch (compareResult) {
                case 'KEEP_NEW':
                  modelsToAdd.push(model)
                  modelsToRemove.push(oldModel.cid)
                  break

                case 'KEEP_OLD':
                  break

                case 'KEEP_BOTH':
                  if (!this.notPresent(model)) {
                    throw new Error('New model has a non unique identity')
                  }
                  modelsToAdd.push(model)
                  break
                default:
                  throw new Error('Invalid compare result')
              }
          }
        }
      } //end for

      const removed = this.remove(modelsToRemove, {
        destroy: loadConfig.destroyOnRemoval
      })
      const added = this.addToCollection(modelsToAdd, {
        insertPosition: loadConfig.insertPosition
      })

      this.onLoadSuccess({
        config: loadConfig,
        transportConfig,
        response,
        added,
        removed
      })

      return {
        response,
        added,
        removed,
        error: undefined
      }
    } catch (error) {
      // fix closure leaks - read error stack
      // https://twitter.com/BenLesh/status/1365056053243613185
      error?.stack
      runInAction(() => {
        this.loadError = error
        this.loadStatus = 'REJECTED'
      })

      this.onLoadError({
        config: loadConfig,
        transportConfig,
        error
      })

      return {
        error,
        response: undefined,
        added: undefined,
        removed: undefined
      }
    }
  }

  /**
   * Callback for when the collection is about to create a new model. This callback firest only on {@link Collection.reset} and {@link Collection.load} methods.
   * If will not fire when the model is created via {@link Collection.create}
   *
   * @param data - same data as the arguments to the factory that the collection is using
   * @returns - modified data. If no data is returned from the callback, model will not be created
   */
  protected onModelCreateData(
    data: Parameters<TFactory>[0]
  ): Parameters<TFactory>[0] | void {
    return data
  }

  /**
   * Callback for when {@link Collection.load} starts
   * @param data - @see {@link LoadStartCallback}
   */
  protected onLoadStart(data: LoadStartCallback<TModel, TTransport>): void {}

  /**
   * Callback for when {@link Collection.load} completes successfully
   * @param data - @see {@link LoadSuccessCallback}
   */
  protected onLoadSuccess(
    data: LoadSuccessCallback<TModel, TTransport>
  ): void {}

  /**
   * Callback for when {@link Collection.load} completes with errors
   * @param data - @see {@link LoadErrorCallback}
   */
  protected onLoadError(data: LoadErrorCallback<TModel, TTransport>): void {}

  /**
   * Destroys the collection. It calls {@link Model.destroy} on all the models in the collection.
   */
  destroy(): void {
    this.onDestroy()

    this.identityReactionByCid.forEach((dispose) => dispose())

    this._models.forEach((model) => {
      model.destroy()
    })
    this._models = []
  }

  protected assertIsModel(model: unknown): asserts model is TModel {
    /* eslint-disable-next-line no-prototype-builtins */
    if (!Model.prototype.isPrototypeOf(model as any)) {
      throw new Error(`not an instance of Model class`)
    }
  }

  /**
   * Callback for when the  {@link Collection.destroy} method is called
   */
  protected onDestroy(): void {}

  push(model: TModel[]): TModel[]

  push(model: TModel): TModel | undefined

  /**
   * Push model to the collection. Alias for {@link Collection.add}. It does not call {@link Transport.save} method.
   * @param model - model to push
   */
  push(model: TModel | TModel[]): TModel | TModel[] | undefined {
    // https://stackoverflow.com/questions/65110771/how-to-have-functions-pass-arguments-with-the-same-overloads
    return this.add(model as any)
  }

  add(model: TModel[]): TModel[]

  add(model: TModel): TModel | undefined

  /**
   * Adds model to the collection at the end. It does not call {@link Transport.save} method.
   * @param model  - model to add
   */
  add(model: TModel | TModel[]): TModel | TModel[] | undefined {
    // @ts-expect-error - overload using overload
    return this.addToCollection(model, { insertPosition: 'end' })
  }

  unshift(model: TModel[]): TModel[]

  unshift(model: TModel): TModel | undefined

  /**
   * Add model to the beginning of the  collection (index 0). It does not call {@link Transport.save} method.
   * @param model  - model to add
   */
  unshift(model: TModel | TModel[]): TModel | TModel[] | undefined {
    // @ts-expect-error - overload using another overload
    return this.addToCollection(model, { insertPosition: 'start' })
  }

  /**
   * Add model to the collection at the specific index. If index if out of bounds, it will throw.
   * If the model is successfully added to the collection {@link Collection.onAdded} callback will be executed
   * @param model - model to add
   * @param index - at what position in the collection to add the model
   */
  addAtIndex(model: TModel[], index: number): TModel[]

  addAtIndex(model: TModel, index: number): TModel | undefined

  addAtIndex(
    model: TModel | TModel[],
    index: number
  ): TModel | TModel[] | undefined {
    // @ts-expect-error - overload using overload
    return this.addToCollection(model, { insertPosition: index })
  }

  protected addToCollection(
    model: TModel,
    config: Omit<AddConfig, 'insertPosition'> & {
      insertPosition?: number | ModelInsertPosition
    }
  ): TModel | undefined

  protected addToCollection(
    model: TModel[],
    config: Omit<AddConfig, 'insertPosition'> & {
      insertPosition?: number | ModelInsertPosition
    }
  ): TModel[]

  protected addToCollection(
    model: TModel | TModel[],
    config: Omit<AddConfig, 'insertPosition'> & {
      insertPosition?: number | ModelInsertPosition
    }
  ): TModel | TModel[] | undefined {
    const models = wrapInArray(model)

    const addConfig = {
      ...this.config.add,
      ...config
    }
    const newModels: TModel[] = []

    for (const model of models) {
      this.assertIsModel(model)
      // model with the same id is already in the collection
      if (!this.notPresent(model)) {
        continue
      }

      newModels.push(model)

      this.startTracking(model)

      this.onAdded(model)
      model._onAdded(this)
    }

    // add models to the collection
    if (addConfig.insertPosition === 'end') {
      this._models.push(...newModels)
    } else if (addConfig.insertPosition === 'start') {
      this._models.unshift(...newModels)
    } else {
      //number at index
      if (
        addConfig.insertPosition > this._models.length ||
        addConfig.insertPosition < 0
      ) {
        throw new Error('insertion index out of bounds')
      }
      this._models.splice(addConfig.insertPosition, 0, ...newModels)
    }

    return Array.isArray(model) ? newModels : newModels[0]
  }

  protected notPresent(model: TModel): boolean {
    const byCid = !this.modelByCid.get(model.cid)
    let byIdentifier = false
    const identifier = model.identity
    // if there is an identifier value then we also need to check that
    if (identifier) {
      byIdentifier = !!this.modelByIdentity.get(identifier)
    }

    return byCid && !byIdentifier
  }

  protected startTracking(model: TModel): void {
    this.modelByCid.set(model.cid, model)
    const identifier = model.identity
    if (identifier) {
      this.modelByIdentity.set(identifier, model)
    }

    const idReaction = reaction(
      () => model.identity,
      (value) => {
        this.modelByIdentity.set(value, model)
      },
      { name: `id-${model.cid}` }
    )
    this.identityReactionByCid.set(model.cid, idReaction)
  }

  protected stopTracking(model: TModel): void {
    this.modelByCid.delete(model.cid)
    this.modelByIdentity.delete(model.identity)

    const reaction = this.identityReactionByCid.get(model.cid)
    reaction ? reaction() : null
  }

  protected resolveModel(id: string): TModel | undefined {
    const model = this.modelByIdentity.get(id)

    return model || this.modelByCid.get(id)
  }

  protected resolveModels(needle: string | string[]): TModel[] {
    const needles = wrapInArray(needle)
    const models = []
    for (const needle of needles) {
      const model = this.resolveModel(needle)
      if (model) {
        models.push(model)
      }
    }

    return models
  }

  /**
   * Create new model.
   * @param data - data for the new model. When the model is created {@link Model.init} method will be called.
   * @returns newly created model
   */
  create(data: Parameters<TFactory>[0]): ReturnType<TFactory> {
    return this._create(data, true)
  }

  protected _create(
    data: Parameters<TFactory>[0],
    asNew = true,
    collection?: this
  ): ReturnType<TFactory> {
    const result = this.factory(data)
    if (isPromise(result)) {
      result.then((model: TModel) => {
        model.init(asNew, collection)
      })
    } else {
      result.init(asNew, collection)
    }

    return result as ReturnType<TFactory>
  }

  getByIdentity(id: string): TModel | undefined

  getByIdentity(id: string[]): TModel[] | undefined

  /**
   * Get model or array of models from the collection by identity key, or model CID.
   * @param id - identity key or CID
   */
  getByIdentity(id: string | string[]): TModel | TModel[] | undefined {
    if (Array.isArray(id)) {
      return this.resolveModels(id)
    }

    return this.resolveModel(id)
  }

  /**
   * Return all the models in the collection
   */
  get models(): ReadonlyArray<TModel> {
    return this._models as ReadonlyArray<TModel>
  }

  /**
   * Get all new models in the collection. New models are the ones that have not been saved to the storage yet via {@link Transport.save}
   */
  get new(): TModel[] {
    return this.models.filter((model) => {
      return model.isNew
    })
  }

  /**
   * Get all the "deleted" models. Deleted models are the ones that have been removed from the storage via {@link Transport.delete} but haven't been
   * removed from the collection yet.
   */
  get deleted(): TModel[] {
    return this.models.filter((model) => {
      return model.isDeleted
    })
  }

  /**
   * Get all the models that are currently syncing. Syncing models are the ones that are currently in the process of being "saved", or "deleted" from the storege via {@link Transport.save} or {@link Transport.delete}
   */
  get syncing(): TModel[] {
    return this.deleting.concat(this.saving)
  }

  /**
   * Remove the last model in the collection. This method does not call  {@link Transport.delete}
   * {@link Collection.onRemoved} callback will be called
   * @param config - remove config {@link RemoveConfig}
   */
  pop(config?: RemoveConfig): TModel | undefined {
    if (this.models.length > 0) {
      return this.removeFromCollection(
        this.models[this.models.length - 1],
        config
      ) as TModel
    }

    return undefined
  }

  /**
   * Remove the first model in the collection. This method does not call  {@link Transport.delete}
   * {@link Collection.onRemoved} callback will be called
   * @param config - remove config {@link RemoveConfig}
   */
  shift(config?: RemoveConfig): TModel | undefined {
    if (this.models.length > 0) {
      return this.removeFromCollection(this.models[0], config) as TModel
    }

    return undefined
  }

  /**
   * Remove the model from the collection at specific index. This method does not call  {@link Transport.delete}
   * {@link Collection.onRemoved} callback will be called
   * @param index - index in the collection. If index is out of bounds, it will throw
   * @param config - {@link RemoveConfig}
   */
  removeAtIndex(index: number, config?: RemoveConfig): TModel | undefined {
    if (index < 0 || index >= this._models.length) {
      return undefined
    }
    const model = this._models[index]

    return this.removeFromCollection(model, config) as TModel
  }

  remove(id: string, config?: RemoveConfig): TModel | undefined

  remove(id: string[], config?: RemoveConfig): TModel[]

  /**
   * Remove the model or array of models from the collection, by model identity key or by model CID.
   * This method does not call  {@link Transport.delete}.
   * If the model is removed {@link Collection.onRemoved} callback is called
   * @param id  - model identity key or CID
   * @param config  - {@link RemoveConfig}
   * @returns remove
   */
  remove(
    id: string | string[],
    config?: RemoveConfig
  ): TModel | TModel[] | undefined {
    const resolved = this.resolveModels(id)
    let final: TModel | TModel[] = resolved
    if (!Array.isArray(id)) {
      if (!resolved.length) {
        return undefined
      } else {
        final = final[0]
      }
    }

    // @ts-expect-error -generic type missmatch for some reason?
    return this.removeFromCollection(final, config)
  }

  protected removeFromCollection(
    model: TModel,
    config?: RemoveConfig
  ): TModel | undefined

  protected removeFromCollection(
    model: TModel[],
    config?: RemoveConfig
  ): TModel[]

  protected removeFromCollection(
    model: TModel | TModel[],
    config?: RemoveConfig
  ): TModel | TModel[] | undefined {
    const modelCids = new Set(
      wrapInArray(model).map((model) => {
        return model.cid
      })
    )

    const removed: TModel[] = []
    const currentCount = this._models.length

    const handleRemoval = (model: TModel): void => {
      removed.push(model)
      this.stopTracking(model)

      if (config?.destroy) {
        model.destroy()
      }
      this.onRemoved(model)
      model._onRemoved(this)
    }
    // optimize for only one element
    if (modelCids.size === 1) {
      for (let i = 0; i < currentCount; i++) {
        const model = this._models[i]
        this.assertIsModel(model)
        const inCollection = modelCids.has(model.cid) //model is in the collection
        if (inCollection) {
          this._models.splice(i, 1)
          handleRemoval(model)
          break
        }
      }
    } else {
      // go through whole array - todo - maybe optimize
      const modelsToKeep = []
      for (let i = 0; i < currentCount; i++) {
        const model = this._models[i]
        this.assertIsModel(model)
        const inCollection = modelCids.has(model.cid)
        if (inCollection) {
          handleRemoval(model)
        } else {
          modelsToKeep.push(model)
        }
      }

      this._models = modelsToKeep
    }

    return Array.isArray(model) ? removed : removed[0]
  }

  /**
   * Callback that is called every time the model is removed from to the collection
   * @param model - model that has been removed from the collection
   */
  protected onRemoved(model: TModel): void {}

  /**
   * Callback that is called every time the model is added to the collection
   * @param model - model that has been added to the collection
   */
  protected onAdded(model: TModel): void {}

  protected serializeModels(): any[] {
    return this._models.reduce<any[]>((arr, model) => {
      const result = model.payload
      if (result) {
        arr.push(result)
      }

      return arr
    }, [])
  }

  /**
   * Callback that is called when {@link Collection.serialize} method is executed.
   * By Default collection serializes all the models in the callection by calling {@link Model.serialize}.
   * It returns an object with the `models` property which contains all the serialized models.
   *
   * @returns If you want to add additional data to the serialization, return the data from the callback, and it will be
   * added to the serialized object.
   */
  protected onSerialize(): Record<string, any> | void {
    return undefined
  }

  protected async resetCollection<T>(
    data?: T[],
    config?: ResetConfig
  ): Promise<TModel[][]> {
    if (!data) {
      const removed = this.removeFromCollection(this._models, config)

      this.onReset([], removed)

      return [[], removed]
    }

    const modelsToAdd: TModel[] = []
    for (const modelData of data) {
      const modifiedData = this.onModelCreateData(modelData)

      if (!modifiedData) {
        continue
      }

      const model = await Promise.resolve(
        this._create(modifiedData, true, this)
      )

      modelsToAdd.push(model)
    }

    const removed = this.removeFromCollection(this._models, config)
    const added = this.addToCollection(modelsToAdd, {
      insertPosition: 'end'
    })

    this.onReset(added, removed)

    return [added, removed]
  }

  /**
   * Callback that is called when the collection has been reset.
   * @param added - newly added models
   * @param removed - models that have been removed
   */
  protected onReset(added: TModel[], removed: TModel[]): void {}

  /**
   * Remove all models from the collection, and optionally add new models to the collection. If no new model data is present, then the collection will just be emptied.
   * If there is model data, new models will be created and added to the collection.
   * When models are added {@link Collection.onAdded} and {@link Collection.onModelCreateData} callbacks will be fired.
   * When models are removed {@link Collection.onRemoved}
   * {@link Collection.onReset} callback is always called
   * @param modelData - array of model data to create new models
   * @param config - {@link ResetConfig}
   * @returns all the model that have been added and removed.
   */
  reset<T>(modelData?: T[], config?: ResetConfig): Promise<TModel[][]> {
    return this.resetCollection(modelData, config)
  }

  /**
   * Serializes collection by calling {@link Model.serialize} on each model in the collection.
   * If you need custom serialization logic you can implement it via {@link Collection.onSerialize} callback
   * @returns serialize
   */
  serialize(): any {
    return {
      models: this.serializeModels(),
      ...this.onSerialize()
    }
  }
}
