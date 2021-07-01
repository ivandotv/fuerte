import {
  action,
  computed,
  IReactionDisposer,
  makeObservable,
  observable,
  reaction,
  runInAction
} from 'mobx'
import { IdentityError } from '../model/identity-error'
import { Model } from '../model/Model'
import { Transport } from '../transport/transport'
import {
  AddConfig,
  CollectionConfig,
  DeleteConfig,
  DeleteError,
  DeleteStart,
  DeleteSuccess,
  Factory,
  LoadConfig,
  LoadError,
  LoadStart,
  LoadSuccess,
  ModelInsertPosition,
  RequiredCollectionConfig,
  SaveConfig,
  SaveError,
  SaveStart,
  SaveSuccess,
  TransportDeleteConfig,
  TransportDeleteResponse,
  TransportLoadConfig,
  TransportLoadResponse,
  TransportSaveConfig,
  TransportSaveResponse,
  UnwrapPromise
} from '../utils/types'
import { ASYNC_STATUS, debounceReaction, wrapInArray } from '../utils/utils'
import {
  CompareError,
  defaultConfig,
  DuplicateModelStrategy,
  ModelCompareResult
} from './collection-config'

export class Collection<
  TModel extends Model<Collection<any, any, any>>,
  TTransport extends Transport<TModel>,
  TFactory extends Factory<TModel>
> {
  loadError = undefined

  loadStatus: keyof typeof ASYNC_STATUS = ASYNC_STATUS.IDLE

  protected _models: TModel[] = []

  // holds models that are immediately removed while deleting
  _modelsDeleting: Map<string, TModel> = new Map()

  // holds models that are saving but are not yet added to collection
  protected _modelsSaving: Map<
    string,
    { token: Record<string, never>; model: TModel }
  > = new Map()

  protected modelByCid: Map<string, TModel> = new Map()

  protected modelByIdentity: Map<string | number, TModel> = new Map()

  protected identityReactionByCid: Map<string, IReactionDisposer> = new Map()

  protected autoSaveReactionByCid: Map<string, IReactionDisposer> = new Map()

  protected config: RequiredCollectionConfig

  constructor(
    protected factory: TFactory,
    protected transport: TTransport,
    config?: CollectionConfig
  ) {
    this.config = {
      autoSave: {
        ...defaultConfig.autoSave,
        ...(config?.autoSave ? config.autoSave : undefined)
      },
      save: {
        ...defaultConfig.save,
        ...(config?.save ? config.save : undefined)
      },
      add: {
        ...defaultConfig.add,
        ...(config?.add ? config.add : undefined)
      },
      delete: {
        ...defaultConfig.delete,
        ...(config?.delete ? config.delete : undefined)
      },
      load: {
        ...defaultConfig.load,
        ...(config?.load ? config.load : undefined)
      }
    }

    makeObservable<
      this,
      | 'addToCollection'
      | 'removeFromCollection'
      | 'modelByCid'
      | '_modelsDeleting'
      | '_modelsSaving'
      | 'onSaveStart'
      | 'onSaveError'
      | 'onSaveSuccess'
      | 'onDeleteStart'
      | 'onDeleteSuccess'
      | 'onDeleteError'
      | 'onLoadStart'
      | 'onLoadSuccess'
      | 'onLoadError'
      | '_models'
      | 'modelByIdentity'
    >(this, {
      save: action,
      add: action,
      delete: action,
      load: action,
      _models: observable.shallow,
      _modelsSaving: observable.shallow,
      _modelsDeleting: observable.shallow,
      modelByCid: observable.shallow,
      modelByIdentity: observable.shallow,
      onSaveStart: action,
      onSaveSuccess: action,
      onSaveError: action,
      onDeleteStart: action,
      onDeleteSuccess: action,
      onDeleteError: action,
      onLoadStart: action,
      onLoadSuccess: action,
      onLoadError: action,
      addToCollection: action,
      removeFromCollection: action,
      destroy: action,
      modelsSyncing: computed,
      modelsDeleting: computed,
      modelsSaving: computed,
      newModels: computed,
      models: computed,
      loadStatus: observable,
      loadError: observable
    })
  }

  getConfig(): RequiredCollectionConfig {
    return this.config
  }

  getTransport(): TTransport {
    return this.transport
  }

  protected assertIsModel(model: unknown): asserts model is TModel {
    if (model instanceof Model !== true) {
      throw new Error(`model is not instance of Model class`)
    }
  }

  protected isModel(model: unknown): model is TModel {
    return model instanceof Model
  }

  push(model: TModel | TModel[]): TModel[] {
    return this.add(model)
  }

  add(model: TModel | TModel[]): TModel[] {
    return this.addToCollection(model, { insertPosition: 'end' })
  }

  unshift(model: TModel | TModel[]): TModel[] {
    return this.addToCollection(model, { insertPosition: 'start' })
  }

  addAtIndex(model: TModel | TModel[], index: number): TModel[] {
    return this.addToCollection(model, { insertPosition: index })
  }

  protected addToCollection(
    model: TModel | TModel[],
    config: Omit<AddConfig, 'insertPosition'> & {
      insertPosition?: number | ModelInsertPosition
    }
  ): TModel[] {
    const models = wrapInArray(model)

    const addConfig = {
      ...this.config.add,
      ...config
    }
    const newModels = []

    for (const model of models) {
      this.assertIsModel(model)
      // model with the same id is already in the collection
      if (!this.isUniqueByIdentifier(model)) {
        continue
      }

      newModels.push(model)

      // if (config.removeFromPreviousCollection) {
      const previousCollection = model.getCollection()
      // model is already in some other collection
      if (previousCollection) {
        previousCollection.removeFromCollection([model.cid])
      }
      // }

      // this.modelByClientId.set(model.cid, model)
      this.addToInternalTracking(model)

      // model.setTransport(this.transport) // ovo prebaciti u store
      model._onAdded(this)

      this.onAdded(model)
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

    return newModels
  }

  protected isUniqueByIdentifier(model: TModel): boolean {
    const byCid = !this.modelByCid.get(model.cid)
    let byIdentifier = false
    const identifier = model.identity
    // if there is an identifier value we need to check that also
    if (identifier) {
      byIdentifier = !!this.modelByIdentity.get(identifier)
    }

    return byCid && !byIdentifier
  }

  protected addToInternalTracking(model: TModel): void {
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

    if (this.config.autoSave.enabled) {
      this.startAutoSave(model)
    }
  }

  protected autoSave(payload: { data: any; model: TModel }): void {
    this.save(payload.model)
  }

  startAutoSave(): TModel[]

  startAutoSave(model: TModel): TModel | undefined

  startAutoSave(models: TModel[]): TModel[]

  startAutoSave(models?: TModel | TModel[]): TModel | TModel[] | undefined {
    const modelsArr = models
      ? Array.isArray(models)
        ? models
        : [models]
      : this._models

    const modelsStarted: TModel[] = []
    modelsArr.forEach((model) => {
      const disposerHit = this.autoSaveReactionByCid.get(model.cid)
      if (!disposerHit) {
        modelsStarted.push(model)
        const saveReaction = reaction(
          () => {
            return {
              model,
              data: model.payload
            }
          },
          this.config.autoSave.debounceMs
            ? debounceReaction(
                this.autoSave.bind(this),
                this.config.autoSave.debounceMs
              )
            : this.autoSave.bind(this),
          {
            name: `save-${model.cid}`
          }
        )

        this.autoSaveReactionByCid.set(model.cid, saveReaction)
      }
    })
    if (modelsStarted.length) {
      this.onStartAutoSave(modelsStarted)
    }

    //models undefined -> return array
    //models array -> return array
    if (!models || Array.isArray(models)) {
      return modelsStarted
    } else {
      //models is TModel instance
      return modelsStarted.length ? modelsStarted[0] : undefined
    }
  }

  protected onStartAutoSave(models: TModel[]): void {}

  stopAutoSave(): TModel[]

  stopAutoSave(model: TModel): TModel | undefined

  stopAutoSave(models: TModel[]): TModel[]

  stopAutoSave(models?: TModel | TModel[]): TModel | TModel[] | undefined {
    const modelsArr = models
      ? Array.isArray(models)
        ? models
        : [models]
      : this._models

    const modelsStopped: TModel[] = []
    modelsArr.forEach((model) => {
      const disposer = this.autoSaveReactionByCid.get(model.cid)
      if (disposer) {
        disposer()
        this.autoSaveReactionByCid.delete(model.cid)
        modelsStopped.push(model)
      }
    })

    if (modelsStopped.length) {
      this.onStopAutoSave(modelsStopped)
    }

    //models undefined -> return array
    //models array -> return array
    if (!models || Array.isArray(models)) {
      return modelsStopped
    } else {
      //models is TModel instance
      return modelsStopped.length ? modelsStopped[0] : undefined
    }
  }

  protected onStopAutoSave(models: TModel[]): void {}

  // protected notifyStopAtu
  protected removeFromInternalTracking(model: TModel): void {
    this.modelByCid.delete(model.cid)
    this.modelByIdentity.delete(model.identity)

    const identityR = this.identityReactionByCid.get(model.cid)
    identityR ? identityR() : null

    this.stopAutoSave(model)
    // const autoSaveR = this.autoSaveReactionByCid.get(model.cid)
    // autoSaveR ? autoSaveR() : null
  }

  protected resolveModels(
    needle: string | TModel | (string | TModel)[]
  ): TModel[] {
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

  protected resolveModel(needle: TModel | string): TModel | undefined {
    const r = this.modelByCid.get(
      typeof needle === 'string' ? needle : needle.cid
    )

    return r
  }

  // create(data: TDTO): TModel | Promise<TModel> {
  create(
    data: Parameters<TFactory['create']>[0]
  ): ReturnType<TFactory['create']> {
    // @ts-expect-error - generic return type
    return this.factory.create(data)
  }

  //todo - mozda napraviti protected metod
  async save(
    modelOrModelData: TModel | Parameters<TFactory['create']>[0],
    config?: SaveConfig,
    loadConfig?: TransportSaveConfig<TTransport>
  ): Promise<
    | {
        response: TransportSaveResponse<TTransport>
        model: TModel
        error: undefined
      }
    | {
        error: Omit<NonNullable<any>, 'false'>
        response: undefined
        model: undefined
      }
  > {
    const saveConfig = {
      ...this.config.save,
      ...config
    }

    let model: TModel
    if (!this.isModel(modelOrModelData)) {
      model = await this.factory.create(modelOrModelData)
    } else {
      model = modelOrModelData
    }

    if (saveConfig.addImmediately) {
      // immediately add to collection
      this.addToCollection(model, { insertPosition: saveConfig.insertPosition })
    } else {
      this.assertIsModel(model)
    }

    const token = {}
    runInAction(() => {
      this._modelsSaving.set(model.cid, { token: token, model })
    })
    const dataToSave = model.payload
    try {
      // model take current data // todo - ovo u stvari treba da ide u transport

      this.onSaveStart({
        model,
        config: saveConfig,
        transportConfig: loadConfig
      })
      // model.clearSaveError()
      model._onSaveStart({
        config: saveConfig,
        transportConfig: loadConfig,
        token
      })

      let response = (await this.transport.save(
        model,
        loadConfig
      )) as TransportSaveResponse<TTransport>

      response = this.parseSaveResponse(response, saveConfig, loadConfig)

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
        transportConfig: loadConfig
      })

      model._onSaveSuccess({
        response,
        config: saveConfig,
        transportConfig: loadConfig,
        savedData: dataToSave,
        token
      })

      return {
        response,
        model,
        error: undefined
      }
    } catch (error) {
      // if promise rejects with undefined
      error?.stack
      // identity form the model could not be set
      const identityError = error instanceof IdentityError

      if (
        !identityError &&
        !saveConfig.addImmediately &&
        saveConfig.addOnError
      ) {
        this.addToCollection(model, {
          insertPosition: saveConfig.insertPosition
        })
      }

      this.onSaveError({
        model,
        error,
        config: saveConfig,
        transportConfig: loadConfig
      })

      model._onSaveError({
        error,
        config: saveConfig,
        transportConfig: loadConfig,
        token,
        dataToSave
      })

      // throw error
      return {
        error,
        response: undefined,
        model: undefined
      }
    } finally {
      const tokenData = this._modelsSaving.get(model.cid)
      if (tokenData?.token === token) {
        runInAction(() => {
          this._modelsSaving.delete(model.cid)
        })
      }
    }
  }

  getByIdentity(value: string): TModel | undefined

  getByIdentity(values: string[]): TModel[] | undefined

  getByIdentity(values: string | string[]): TModel | TModel[] | undefined {
    if (Array.isArray(values)) {
      const result = []
      for (const value of values) {
        const model = this.modelByIdentity.get(value)
        if (model) {
          result.push(model)
        }
      }

      return result
    }

    return this.modelByIdentity.get(values)
  }

  getByCid(value: string): TModel | undefined

  getByCid(values: string[]): TModel[] | undefined

  getByCid(values: string | string[]): TModel | TModel[] | undefined {
    if (Array.isArray(values)) {
      const result = []
      for (const value of values) {
        const model = this.modelByCid.get(value)
        if (model) {
          result.push(model)
        }
      }

      return result
    }

    return this.modelByCid.get(values)
  }

  protected parseLoadResponse<T>(
    response: T,
    _loadConfig: Required<LoadConfig>,
    _transportConfig: any
  ): T {
    return response
  }

  protected parseSaveResponse(
    response: UnwrapPromise<ReturnType<TTransport['save']>>,
    _saveConfig: SaveConfig,
    _transportConfig?: Parameters<TTransport['save']>[1]
  ): UnwrapPromise<ReturnType<TTransport['save']>> {
    return response
  }

  protected parseDeleteResponse<T>(
    response: T,
    _deleteConfig: DeleteConfig,
    _transportConfig: any
  ): T {
    return response
  }

  protected onSaveStart(_data: SaveStart<TTransport, TModel>): void {}

  protected onSaveSuccess(_data: SaveSuccess<TTransport, TModel>): void {}

  protected onSaveError(_data: SaveError<TTransport, TModel>): void {}

  get models(): ReadonlyArray<TModel> {
    return this._models as ReadonlyArray<TModel>
  }

  get newModels(): TModel[] {
    return this.models.filter((model) => model.isNew)
  }

  get deletedModels(): TModel[] {
    return this.models.filter((model) => model.isDeleted)
  }

  get modelsSyncing(): TModel[] {
    return this.modelsDeleting.concat(this.modelsSaving)
  }

  get modelsDeleting(): TModel[] {
    return [...this._modelsDeleting.values()]
  }

  get modelsSaving(): TModel[] {
    const models: TModel[] = []
    this._modelsSaving.forEach((data) => {
      models.push(data.model)
    })

    return models
  }

  pop(): TModel | undefined {
    if (this.models.length > 0) {
      return this.removeFromCollection([
        this.models[this.models.length - 1].cid
      ])[0]
    }

    return undefined
  }

  shift(): TModel | undefined {
    if (this.models.length > 0) {
      return this.removeFromCollection([this.models[0].cid])[0]
    }

    return undefined
  }

  remove(cidOrModel: string | TModel | (string | TModel)[]): TModel[] {
    return this.removeFromCollection(
      this.resolveModels(cidOrModel).map((model) => model.cid)
    )
  }

  removeAtIndex(index: number): TModel | undefined {
    if (index < 0 || index >= this._models.length) {
      return undefined
    }
    const model = this._models[index]
    const removed = this.removeFromCollection([model.cid])

    return removed[0]
  }

  protected removeFromCollection(cid: string[]): TModel[] {
    const cids = new Set(cid)

    const removed = []
    const currentCount = this._models.length

    // optimize for only one element
    if (cids.size === 1) {
      for (let i = 0; i < currentCount; i++) {
        const model = this._models[i]
        this.assertIsModel(model)
        const inCollection = cids.has(model.cid) //model is in the collection
        if (inCollection) {
          this._models.splice(i, 1)
          removed.push(model)
          // this.modelByClientId.delete(model.cid)
          this.removeFromInternalTracking(model)
          model._onRemoved()
          this.onRemoved(model)
          break
        }
      }
    } else {
      // go through whole array - todo - maybe optimize
      const modelsToKeep = []
      for (let i = 0; i < currentCount; i++) {
        const model = this._models[i]
        this.assertIsModel(model)
        const inCollection = cids.has(model.cid)
        if (inCollection) {
          removed.push(model)
          // this.modelByClientId.delete(model.cid)
          this.removeFromInternalTracking(model)
          model._onRemoved()
          this.onRemoved(model)
        } else {
          modelsToKeep.push(model)
        }
      }

      this._models = modelsToKeep
    }

    return removed
  }

  async delete(
    cidOrModel: string | TModel,
    config?: DeleteConfig,
    transportConfig?: TransportDeleteConfig<TTransport>
  ): Promise<
    | {
        response: TransportDeleteResponse<TTransport>
        model: TModel
        error: undefined
      }
    | {
        error: Omit<NonNullable<any>, 'false'>
        response: undefined
        model: undefined
      }
  > {
    const deleteConfig = {
      ...this.config.delete,
      ...config
    }

    const model = this.resolveModel(cidOrModel)

    this.modelCanBeDeleted(model)

    if (deleteConfig.remove && deleteConfig.removeImmediately) {
      this.removeFromCollection([model.cid])
    }
    try {
      this._modelsDeleting.set(model.cid, model)

      this.onDeleteStart({
        model,
        config: deleteConfig,
        transportConfig: transportConfig
      })
      model._onDeleteStart({
        config: deleteConfig,
        transportConfig: transportConfig
      })

      let response = (await this.transport.delete(
        model,
        transportConfig
      )) as UnwrapPromise<ReturnType<TTransport['delete']>>

      response = this.parseDeleteResponse(
        response,
        deleteConfig,
        transportConfig
      )

      if (deleteConfig.remove && !deleteConfig.removeImmediately) {
        this.removeFromCollection([model.cid])
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

      return {
        response,
        model,
        error: undefined
      }
    } catch (error) {
      if (
        deleteConfig.remove &&
        !deleteConfig.removeImmediately &&
        deleteConfig.removeOnError
      ) {
        this.removeFromCollection([model.cid])
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
    } finally {
      runInAction(() => {
        this._modelsDeleting.delete(model.cid)
      })
    }
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

  protected onDeleteStart(_data: DeleteStart<TTransport, TModel>): void {}

  protected onDeleteSuccess(_data: DeleteSuccess<TTransport, TModel>): void {}

  protected onDeleteError(_data: DeleteError<TTransport, TModel>): void {}

  protected onRemoved(_model: TModel): void {}

  protected onAdded(_model: TModel): void {}

  serialize(): any {
    return {
      models: this.serializeModels(),
      ...this.onSerialize()
    }
  }

  protected serializeModels(): any[] {
    return this._models.reduce<any[]>((arr, model) => {
      const result = model.payload
      if (result) {
        arr.push(result)
      }

      return arr
    }, [])
  }

  protected onSerialize(): any {}

  // protected addModel
  async load(
    config?: LoadConfig,
    transportConfig?: TransportLoadConfig<TTransport>
  ): Promise<
    | {
        response: TransportLoadResponse<TTransport>
        added: TModel[]
        removed: TModel[]
        error: undefined
      }
    | {
        error: Omit<NonNullable<any>, 'false'>
        response: undefined
        added: undefined
        removed: undefined
      }
  > {
    this.loadError = undefined

    const loadConfig = {
      ...this.config.load,
      ...config
    }

    try {
      // throw immediately if the compare function is not provided
      if (
        config?.duplicateModelStrategy === DuplicateModelStrategy.COMPARE &&
        typeof config.compareFn === 'undefined'
      ) {
        throw new CompareError(
          'No compare function found for duplicate model strategy'
        )
      }
      this.loadStatus = ASYNC_STATUS.PENDING
      this.onLoadStart({
        config: loadConfig,
        transportConfig: transportConfig
      })
      let response = (await this.transport.load(
        transportConfig
      )) as TransportLoadResponse<TTransport>
      response = this.parseLoadResponse(response, loadConfig, transportConfig)

      runInAction(() => {
        this.loadStatus = ASYNC_STATUS.RESOLVED
      })

      // run reset instead of the rest of the load function
      if (loadConfig.reset) {
        const [added, removed] = await this.resetCollection(response.data)
        // this.loaded = true
        this.onLoadSuccess({
          config: loadConfig,
          transportConfig: transportConfig,
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
      const modelsToRemove: TModel[] = []

      for (const modelData of response.data) {
        // check if model with the id of the new model is already in collection
        const modifiedData = this.onModelCreateData(modelData)

        if (!modifiedData) {
          continue
        }
        const model = await this.factory.create(modifiedData)

        if (this.isUniqueByIdentifier(model)) {
          modelsToAdd.push(model)
        } else {
          // model is already present
          // resolve if it should be added
          /* eslint-disable */
          const oldModel = this.modelByIdentity.get(model.identity)!
          /* eslint-enable */

          const compareResult = loadConfig.compareFn(model, oldModel)

          switch (loadConfig.duplicateModelStrategy) {
            case DuplicateModelStrategy.KEEP_NEW:
              modelsToRemove.push(oldModel)
              modelsToAdd.push(model)
              break
            case DuplicateModelStrategy.COMPARE:
              switch (compareResult) {
                case ModelCompareResult.KEEP_NEW:
                  modelsToAdd.push(model)
                  modelsToRemove.push(oldModel)
                  break

                case ModelCompareResult.KEEP_OLD:
                  // do nothing for no
                  break

                case ModelCompareResult.KEEP_BOTH:
                  if (!this.isUniqueByIdentifier(model)) {
                    throw new CompareError(
                      'New model has a non unique identity'
                    )
                  }
                  modelsToAdd.push(model)
                  break
                default:
                  throw new CompareError('Invalid compare result')
              }
          }
        }
      } //end for

      const removed = this.remove(modelsToRemove)
      const added = this.addToCollection(modelsToAdd, {
        insertPosition: loadConfig.insertPosition
      })

      // this.loaded = true
      // this.load
      this.onLoadSuccess({
        config: loadConfig,
        transportConfig: transportConfig,
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
        this.loadStatus = ASYNC_STATUS.REJECTED
      })

      this.onLoadError({
        config: loadConfig,
        transportConfig: transportConfig,
        error
      })

      return {
        error,
        response: undefined,
        added: undefined,
        removed: undefined
      }
      // throw error
    }
  }

  protected onLoadStart(_data: LoadStart<TTransport, TModel>): void {}

  protected onLoadSuccess(_data: LoadSuccess<TTransport, TModel>): void {}

  protected onLoadError(_data: LoadError<TTransport, TModel>): void {}

  protected async resetCollection<T>(data?: T[]): Promise<TModel[][]> {
    if (!data) {
      const removed = this.removeFromCollection(
        this._models.map((model) => model.cid)
      )

      this.onReset([], removed)

      return [[], removed]
    }

    const modelsToAdd: TModel[] = []
    for (const modelData of data) {
      const modifiedData = this.onModelCreateData(modelData)

      if (!modifiedData) {
        continue
      }

      const model = await this.factory.create(modifiedData)

      modelsToAdd.push(model)
    }

    const removed = this.removeFromCollection(
      this._models.map((model) => model.cid)
    )
    const added = this.addToCollection(modelsToAdd, { insertPosition: 'end' })

    this.onReset(added, removed)

    return [added, removed]
  }

  reset<T>(modelData?: T[]): Promise<TModel[][]> {
    return this.resetCollection(modelData)
  }

  protected onReset(_added: TModel[], _removed: TModel[]): void {}

  //todo - better name
  protected onModelCreateData(
    data: Parameters<TFactory['create']>[0]
  ): Parameters<TFactory['create']>[0] | void {
    return data
  }

  destroy(): void {
    this.onDestroy()

    this.stopAutoSave()
    this.identityReactionByCid.forEach((dispose) => {
      dispose()
    })

    const models = this.removeFromCollection(
      this._models.map((model) => model.cid)
    )

    models.forEach((model) => {
      model.destroy()
    })
  }

  protected onDestroy(): void {}
}
