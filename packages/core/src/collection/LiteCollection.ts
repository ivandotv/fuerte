import {
  action,
  computed,
  IReactionDisposer,
  makeObservable,
  observable,
  reaction
} from 'mobx'
import { Model } from '../model/Model'
import {
  AddConfig,
  FactoryFn,
  LiteCollectionConfig,
  ModelInsertPosition,
  RemoveConfig,
  RequiredLiteCollectionConfig,
  ResetConfig
} from '../utils/types'
import { isPromise, wrapInArray } from '../utils/utils'

export class LiteCollection<
  TModel extends Model<LiteCollection<any, any>>,
  TFactory extends FactoryFn<TModel>
> {
  protected _models: TModel[] = []

  protected modelByCid: Map<string, TModel> = new Map()

  protected modelByIdentity: Map<string | number, TModel> = new Map()

  protected config: RequiredLiteCollectionConfig

  protected identityReactionByCid: Map<string, IReactionDisposer> = new Map()

  constructor(protected factory: TFactory, config?: LiteCollectionConfig) {
    this.config = {
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
      | 'addToCollection'
      | 'removeFromCollection'
      | 'modelByCid'
      | '_models'
      | 'modelByIdentity'
    >(this, {
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

  getConfig(): RequiredLiteCollectionConfig {
    return this.config
  }

  protected assertIsModel(model: unknown): asserts model is TModel {
    /* eslint-disable-next-line no-prototype-builtins */
    if (!Model.prototype.isPrototypeOf(model as any)) {
      throw new Error(`model is not instance of Model class`)
    }
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
      if (!this.notPresent(model)) {
        continue
      }

      newModels.push(model)

      // const previousCollection = model.collection
      // // model is already in some other collection
      // if (previousCollection) {
      //   previousCollection.removeFromCollection(model)
      // }

      this.startTracking(model)

      // model._onAdded(this)
      this.notifyAdded(model)

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

  get deleting(): TModel[] {
    return this._models.filter((m) => m.isDeleting)
  }

  get saving(): TModel[] {
    return this._models.filter((m) => m.isSaving)
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
      this.notifyRemoved(m)
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

  protected notifyRemoved(model: TModel): void {
    model._onRemoved(this, true)
  }

  protected notifyAdded(model: TModel): void {
    model._onAdded(this, true)
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

  destroy(): void {
    this.onDestroy()

    this.identityReactionByCid.forEach((dispose) => dispose())

    this._models.forEach((model) => {
      this.notifyRemoved(model)
    })
  }

  protected onDestroy(): void {}
}
