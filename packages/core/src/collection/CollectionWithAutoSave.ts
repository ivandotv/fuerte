import { IReactionDisposer, reaction } from 'mobx'
import { Model } from '../model/Model'
import { Transport } from '../transport/transport'
import {
  CollectionConfigWithAutoSave,
  RequiredCollectionConfigWithAutoSave
} from '../utils/types'
import { debounceReaction } from '../utils/utils'
import { Collection, FactoryFn } from './Collection'

export class CollectionWithAutoSave<
  TModel extends Model<Collection<any, any, any>>,
  TFactory extends FactoryFn<TModel>,
  TTransport extends Transport<TModel>
> extends Collection<TModel, TFactory, TTransport> {
  protected identityReactionByCid: Map<string, IReactionDisposer> = new Map()

  protected saveReactionByCid: Map<string, IReactionDisposer> = new Map()

  protected declare config: RequiredCollectionConfigWithAutoSave

  constructor(
    factory: TFactory,
    transport: TTransport,
    config?: CollectionConfigWithAutoSave
  ) {
    super(factory, transport, config)
    this.config.autoSave = {
      enabled: false,
      debounce: 0,
      ...(config?.autoSave ? config.autoSave : undefined)
    }
  }

  getConfig(): RequiredCollectionConfigWithAutoSave {
    return super.getConfig() as RequiredCollectionConfigWithAutoSave
  }

  protected override startTracking(model: TModel) {
    super.startTracking(model)

    if (this.config.autoSave.enabled) {
      this.startAutoSave(model)
    }
  }

  protected override stopTracking(model: TModel): void {
    super.stopTracking(model)
    const identityR = this.identityReactionByCid.get(model.cid)
    identityR ? identityR() : null

    this.stopAutoSave(model)
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
    modelsArr.forEach(model => {
      const enabled = this.saveReactionByCid.get(model.cid)
      if (!enabled) {
        modelsStarted.push(model)
        const saveReaction = reaction(
          () => {
            return {
              model,
              data: model.payload
            }
          },
          this.config.autoSave.debounce
            ? debounceReaction(
                this.autoSave.bind(this),
                this.config.autoSave.debounce
              )
            : this.autoSave.bind(this),
          {
            name: `save-${model.cid}`
          }
        )

        this.saveReactionByCid.set(model.cid, saveReaction)
      }
    })
    if (modelsStarted.length) {
      this.onStartAutoSave(modelsStarted)
    }

    if (!models || Array.isArray(models)) {
      return modelsStarted
    } else {
      //models is TModel instance
      return modelsStarted.length ? modelsStarted[0] : undefined
    }
  }

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
    modelsArr.forEach(model => {
      const disposer = this.saveReactionByCid.get(model.cid)
      if (disposer) {
        disposer()
        this.saveReactionByCid.delete(model.cid)
        modelsStopped.push(model)
      }
    })

    if (modelsStopped.length) {
      this.onStopAutoSave(modelsStopped)
    }

    if (!models || Array.isArray(models)) {
      return modelsStopped
    } else {
      //models is TModel instance
      return modelsStopped.length ? modelsStopped[0] : undefined
    }
  }

  protected onStopAutoSave(models: TModel[]): void {}

  protected onStartAutoSave(models: TModel[]): void {}

  override destroy() {
    super.destroy()

    this.stopAutoSave()
  }

  autoSaveEnabled(cid: string): boolean {
    return !!this.saveReactionByCid.get(cid)
  }
}
