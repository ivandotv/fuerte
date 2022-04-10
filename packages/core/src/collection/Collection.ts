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
import { Transport } from '../types'
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
  TransportDeleteConfig,
  TransportDeleteResponse,
  TransportLoadConfig,
  TransportLoadResponse,
  TransportSaveConfig,
  TransportSaveResponse
} from '../types'
import { ASYNC_STATUS, isPromise, wrapInArray } from '../utils/utils'

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

  getConfig(): RequiredCollectionConfig {
    return this.config
  }

  getTransport(): TTransport {
    return this.transport
  }

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
    try {
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

      const response = await this.transportSave(model, transportConfig)
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

      return {
        response,
        model,
        error: undefined
      }
    } catch (error) {
      // fix closure leaks - read error stack
      // https://twitter.com/BenLesh/status/1365056053243613185
      error?.stack
      // identity from the model could not be set
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
        transportConfig
      })

      model._onSaveError({
        error,
        config: saveConfig,
        transportConfig,
        token,
        dataToSave
      })

      return {
        error,
        model: undefined,
        response: undefined
      }
    } finally {
      const tokenData = this._saving.get(model.cid)
      if (tokenData?.token === token) {
        runInAction(() => {
          this._saving.delete(model.cid)
        })
      }
    }
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

  protected onSaveStart(data: SaveStartCallback<TModel, TTransport>): void {}

  protected onSaveSuccess(
    data: SaveSuccessCallback<TModel, TTransport>
  ): void {}

  protected onSaveError(data: SaveErrorCallback<TModel, TTransport>): void {}

  get deleting(): TModel[] {
    return [...this._deleting.values()]
  }

  get saving(): TModel[] {
    const models: TModel[] = []
    this._saving.forEach((data) => {
      models.push(data.model)
    })

    return models
  }

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
    try {
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

      const response = await this.transportDelete(model, transportConfig)

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
    } finally {
      runInAction(() => {
        this._deleting.delete(model.cid)
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

  protected onDeleteStart(
    data: DeleteStartCallback<TModel, TTransport>
  ): void {}

  protected onDeleteSuccess(
    data: DeleteSuccessCallback<TModel, TTransport>
  ): void {}

  protected onDeleteError(
    _data: DeleteErrorCallback<TModel, TTransport>
  ): void {}

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
        const model = await Promise.resolve(this.create(modifiedData))
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

  protected onLoadStart(data: LoadStartCallback<TModel, TTransport>): void {}

  protected onLoadSuccess(
    data: LoadSuccessCallback<TModel, TTransport>
  ): void {}

  protected onLoadError(data: LoadErrorCallback<TModel, TTransport>): void {}

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
      throw new Error(`model is not instance of Model class`)
    }
  }

  protected onDestroy(): void {}

  push(model: TModel[]): TModel[]

  push(model: TModel): TModel | undefined

  push(model: TModel | TModel[]): TModel | TModel[] | undefined {
    // https://stackoverflow.com/questions/65110771/how-to-have-functions-pass-arguments-with-the-same-overloads
    return this.add(model as any)
  }

  add(model: TModel[]): TModel[]

  add(model: TModel): TModel | undefined

  add(model: TModel | TModel[]): TModel | TModel[] | undefined {
    // @ts-expect-error - overload using overload
    return this.addToCollection(model, { insertPosition: 'end' })
  }

  unshift(model: TModel[]): TModel[]

  unshift(model: TModel): TModel | undefined

  unshift(model: TModel | TModel[]): TModel | TModel[] | undefined {
    // @ts-expect-error - overload using overload
    return this.addToCollection(model, { insertPosition: 'start' })
  }

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

  create(data: Parameters<TFactory>[0]): ReturnType<TFactory> {
    const result = this.factory(data)
    if (isPromise(result)) {
      result.then((model: TModel) => {
        model.init()
      })
    } else {
      result.init()
    }

    return result as ReturnType<TFactory>
  }

  getById(id: string): TModel | undefined

  getById(id: string[]): TModel[] | undefined

  getById(id: string | string[]): TModel | TModel[] | undefined {
    if (Array.isArray(id)) {
      return this.resolveModels(id)
    }

    return this.resolveModel(id)
  }

  get models(): ReadonlyArray<TModel> {
    return this._models as ReadonlyArray<TModel>
  }

  get new(): TModel[] {
    return this.models.filter((model) => {
      return model.isNew
    })
  }

  get deleted(): TModel[] {
    return this.models.filter((model) => {
      return model.isDeleted
    })
  }

  get syncing(): TModel[] {
    return this.deleting.concat(this.saving)
  }

  pop(config?: RemoveConfig): TModel | undefined {
    if (this.models.length > 0) {
      return this.removeFromCollection(
        this.models[this.models.length - 1],
        config
      ) as TModel
    }

    return undefined
  }

  shift(config?: RemoveConfig): TModel | undefined {
    if (this.models.length > 0) {
      return this.removeFromCollection(this.models[0], config) as TModel
    }

    return undefined
  }

  removeAtIndex(index: number, config?: RemoveConfig): TModel | undefined {
    if (index < 0 || index >= this._models.length) {
      return undefined
    }
    const model = this._models[index]

    return this.removeFromCollection(model, config) as TModel
  }

  remove(id: string, config?: RemoveConfig): TModel | undefined

  remove(id: string[], config?: RemoveConfig): TModel[]

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

    const handleRemoval = (m: TModel): void => {
      removed.push(m)
      this.stopTracking(m)
      // this.notifyRemoved(m)
      if (config?.destroy) {
        m.destroy()
      }
      this.onRemoved(m)
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

  protected onRemoved(model: TModel): void {}

  protected onAdded(model: TModel): void {}

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

      const model = await Promise.resolve(this.create(modifiedData))

      modelsToAdd.push(model)
    }

    const removed = this.removeFromCollection(this._models, config)
    const added = this.addToCollection(modelsToAdd, {
      insertPosition: 'end'
    })

    this.onReset(added, removed)

    return [added, removed]
  }

  reset<T>(modelData?: T[], config?: ResetConfig): Promise<TModel[][]> {
    return this.resetCollection(modelData, config)
  }

  protected onReset(_added: TModel[], _removed: TModel[]): void {}

  protected onModelCreateData(
    data: Parameters<TFactory>[0]
  ): Parameters<TFactory>[0] | void {
    return data
  }
}
