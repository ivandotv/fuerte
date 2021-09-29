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
import { ASYNC_STATUS, isPromise, wrapInArray } from '../utils/utils'

export type FactoryFn<T, K = any> = (args: K) => T | Promise<T>

export class Collection<
  TModel extends Model<Collection<any, any, any>>,
  TFactory extends FactoryFn<TModel>,
  TTransport extends Transport<TModel>
> {
  loadError = undefined

  loadStatus: keyof typeof ASYNC_STATUS = 'IDLE'

  protected _models: TModel[] = []

  // holds models that are immediately removed while deleting
  _deleting: Map<string, TModel> = new Map()

  // holds models that are saving but are not yet added to collection
  protected _saving: Map<
    string,
    { token: Record<string, never>; model: TModel }
  > = new Map()

  protected modelByCid: Map<string, TModel> = new Map()

  protected modelByIdentity: Map<string | number, TModel> = new Map()

  protected config: RequiredCollectionConfig

  protected identityReactionByCid: Map<string, IReactionDisposer> = new Map()

  constructor(
    protected factory: TFactory,
    protected transport: TTransport,
    config?: CollectionConfig
  ) {
    this.config = {
      save: {
        insertPosition: 'end',
        addImmediately: true,
        addOnError: true,
        ...(config?.save ? config.save : undefined)
      },
      add: {
        insertPosition: 'end',
        ...(config?.add ? config.add : undefined)
      },
      delete: {
        remove: true,
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
        reset: false,
        ...(config?.load ? config.load : undefined)
      }
    }

    makeObservable<
      this,
      | 'addToCollection'
      | 'removeFromCollection'
      | 'modelByCid'
      | '_deleting'
      | '_saving'
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
      _saving: observable.shallow,
      _deleting: observable.shallow,
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
      syncing: computed,
      deleting: computed,
      saving: computed,
      new: computed,
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
    if (!this.isModel(model)) {
      throw new Error(`model is not instance of Model class`)
    }
  }

  protected isModel(model: unknown): model is TModel {
    return model instanceof Model
  }

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
      if (!this.isUniqueByIdentifier(model)) {
        continue
      }

      newModels.push(model)

      const previousCollection = model.getCollection()
      // model is already in some other collection
      if (previousCollection) {
        previousCollection.removeFromCollection(model)
      }

      this.startTracking(model)

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

    return Array.isArray(model) ? newModels : newModels[0]
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

  protected startTracking(model: TModel): void {
    this.modelByCid.set(model.cid, model)
    const identifier = model.identity
    if (identifier) {
      this.modelByIdentity.set(identifier, model)
    }

    const idReaction = reaction(
      () => model.identity,
      value => {
        this.modelByIdentity.set(value, model)
      },
      { name: `id-${model.cid}` }
    )
    this.identityReactionByCid.set(model.cid, idReaction)
  }

  protected stopTracking(model: TModel): void {
    this.modelByCid.delete(model.cid)
    this.modelByIdentity.delete(model.identity)

    const identityR = this.identityReactionByCid.get(model.cid)
    identityR ? identityR() : null
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

    // @ts-expect-error - generic return type
    return result
  }

  async save(
    modelOrModelData: TModel | Parameters<TFactory>[0],
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
      try {
        model = await this.factory(modelOrModelData)
      } catch (error) {
        return {
          error,
          response: undefined,
          model: undefined
        }
      }
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
      this._saving.set(model.cid, { token: token, model })
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

      const response = (await this.transport.save(
        model,
        loadConfig
      )) as TransportSaveResponse<TTransport>

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
        transportConfig: loadConfig
      })

      model._onSaveError({
        error,
        config: saveConfig,
        transportConfig: loadConfig,
        token,
        dataToSave
      })

      return {
        error,
        response: undefined,
        model: undefined
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

  protected onSaveStart(_data: SaveStart<TTransport, TModel>): void {}

  protected onSaveSuccess(_data: SaveSuccess<TTransport, TModel>): void {}

  protected onSaveError(_data: SaveError<TTransport, TModel>): void {}

  get models(): ReadonlyArray<TModel> {
    return this._models as ReadonlyArray<TModel>
  }

  get new(): TModel[] {
    return this.models.filter(model => {
      return model.isNew
    })
  }

  get deleted(): TModel[] {
    return this.models.filter(model => {
      return model.isDeleted
    })
  }

  get syncing(): TModel[] {
    return this.deleting.concat(this.saving)
  }

  get deleting(): TModel[] {
    return [...this._deleting.values()]
  }

  get saving(): TModel[] {
    const models: TModel[] = []
    this._saving.forEach(data => {
      models.push(data.model)
    })

    return models
  }

  pop(): TModel | undefined {
    if (this.models.length > 0) {
      return this.removeFromCollection(
        this.models[this.models.length - 1]
      ) as TModel
    }

    return undefined
  }

  shift(): TModel | undefined {
    if (this.models.length > 0) {
      return this.removeFromCollection(this.models[0]) as TModel
    }

    return undefined
  }

  removeAtIndex(index: number): TModel | undefined {
    if (index < 0 || index >= this._models.length) {
      return undefined
    }
    const model = this._models[index]

    return this.removeFromCollection(model) as TModel
  }

  remove(id: string): TModel | undefined

  remove(id: string[]): TModel[]

  remove(id: string | string[]): TModel | TModel[] | undefined {
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
    return this.removeFromCollection(final)
  }

  protected removeFromCollection(model: TModel): TModel | undefined

  protected removeFromCollection(model: TModel[]): TModel[]

  protected removeFromCollection(
    model: TModel | TModel[]
  ): TModel | TModel[] | undefined {
    const modelCids = new Set(
      wrapInArray(model).map(model => {
        return model.cid
      })
    )

    const removed: TModel[] = []
    const currentCount = this._models.length

    // optimize for only one element
    if (modelCids.size === 1) {
      for (let i = 0; i < currentCount; i++) {
        const model = this._models[i]
        this.assertIsModel(model)
        const inCollection = modelCids.has(model.cid) //model is in the collection
        if (inCollection) {
          this._models.splice(i, 1)
          removed.push(model)
          // this.modelByClientId.delete(model.cid)
          this.stopTracking(model)
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
        const inCollection = modelCids.has(model.cid)
        if (inCollection) {
          removed.push(model)
          // this.modelByClientId.delete(model.cid)
          this.stopTracking(model)
          model._onRemoved()
          this.onRemoved(model)
        } else {
          modelsToKeep.push(model)
        }
      }

      this._models = modelsToKeep
    }

    return Array.isArray(model) ? removed : removed[0]
  }

  async delete(
    id: string,
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
      this.removeFromCollection(model)
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

      const response = (await this.transport.delete(
        model,
        transportConfig
      )) as UnwrapPromise<ReturnType<TTransport['delete']>>

      if (deleteConfig.remove && !deleteConfig.removeImmediately) {
        this.removeFromCollection(model)
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
        this.removeFromCollection(model)
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
        config?.duplicateModelStrategy === 'COMPARE' &&
        typeof config.compareFn === 'undefined'
      ) {
        throw new Error('No compare function')
      }
      this.loadStatus = 'PENDING'
      this.onLoadStart({
        config: loadConfig,
        transportConfig: transportConfig
      })
      const response = (await this.transport.load(
        transportConfig
      )) as TransportLoadResponse<TTransport>

      runInAction(() => {
        this.loadStatus = 'RESOLVED'
      })

      // run reset instead of the rest of the load function
      if (loadConfig.reset) {
        const [added, removed] = await this.resetCollection(response.data)

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
      const modelsToRemove: string[] = []

      for (const modelData of response.data) {
        const modifiedData = this.onModelCreateData(modelData)

        if (!modifiedData) {
          continue
        }
        const model = await this.factory(modifiedData)

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
                  if (!this.isUniqueByIdentifier(model)) {
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
        this.loadStatus = 'REJECTED'
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
      const removed = this.removeFromCollection(this._models)

      this.onReset([], removed)

      return [[], removed]
    }

    const modelsToAdd: TModel[] = []
    for (const modelData of data) {
      const modifiedData = this.onModelCreateData(modelData)

      if (!modifiedData) {
        continue
      }

      const model = await this.factory(modifiedData)

      modelsToAdd.push(model)
    }

    const removed = this.removeFromCollection(this._models)
    const added = this.addToCollection(modelsToAdd, {
      insertPosition: 'end'
    })

    this.onReset(added, removed)

    return [added, removed]
  }

  reset<T>(modelData?: T[]): Promise<TModel[][]> {
    return this.resetCollection(modelData)
  }

  protected onReset(_added: TModel[], _removed: TModel[]): void {}

  protected onModelCreateData(
    data: Parameters<TFactory>[0]
  ): Parameters<TFactory>[0] | void {
    return data
  }

  destroy(): void {
    this.onDestroy()

    this.identityReactionByCid.forEach(dispose => {
      dispose()
    })

    const models = this.removeFromCollection(this._models)

    models.forEach(model => {
      model.destroy()
    })
  }

  protected onDestroy(): void {}
}
