import { action, makeObservable, observable, runInAction } from 'mobx'
import { IdentityError } from '../model/identity-error'
import { Model } from '../model/Model'
import { Transport } from '../transport/transport'
import {
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
  RequiredCollectionConfig,
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
} from '../utils/types'
import { ASYNC_STATUS } from '../utils/utils'
import { LiteCollection } from './LiteCollection'

export class Collection<
  TModel extends Model<Collection<any, any, any>>,
  TFactory extends FactoryFn<TModel>,
  TTransport extends Transport<TModel>
> extends LiteCollection<TModel, TFactory> {
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

  constructor(
    factory: TFactory,
    protected transport: TTransport,
    config?: CollectionConfig
  ) {
    super(factory, config)

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
      }
    }

    makeObservable<
      this,
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
      loadError: observable
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
      // model take current data // todo - ovo u stvari treba da ide u transport

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

      const response = await this.callTransportSave(model, transportConfig)
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

  protected callTransportSave(
    model: TModel,
    config?: TransportSaveConfig<TTransport>
  ): Promise<TransportSaveResponse<TTransport>> {
    return this.transport.save(model, config) as Promise<
      TransportSaveResponse<TTransport>
    >
  }

  protected callTransportDelete(
    model: TModel,
    config?: TransportDeleteConfig<TTransport>
  ): Promise<TransportDeleteResponse<TTransport>> {
    return this.transport.delete(model, config) as Promise<
      TransportDeleteResponse<TTransport>
    >
  }

  protected callTransportLoad(
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

      const response = await this.callTransportDelete(model, transportConfig)

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

      const response = await this.callTransportLoad(transportConfig)

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

      // this.loaded = true
      // this.load
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

  protected override notifyAdded(model: TModel): void {
    model._onAdded(this, false)
  }

  protected override notifyRemoved(model: TModel): void {
    model._onRemoved(this, false)
  }

  override destroy(): void {
    super.destroy()

    this._models.forEach((model) => {
      model.destroy()
    })
    this._models = []
  }
}
