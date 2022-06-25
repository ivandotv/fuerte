import { IReactionDisposer, reaction } from 'mobx'
import { Model } from '../model/Model'
import {
  AutosaveCollectionConfig,
  FactoryFn,
  RequiredAutosaveCollectionConfig,
  Transport
} from '../types'
import { debounceReaction } from '../utils'
import { Collection } from './Collection'

export class AutosaveCollection<
  TModel extends Model<Collection<any, any, any>>,
  TFactory extends FactoryFn<TModel>,
  TTransport extends Transport<TModel>
> extends Collection<TModel, TFactory, TTransport> {
  protected override identityReactionByCid: Map<string, IReactionDisposer> =
    new Map()

  protected saveReactionByCid: Map<string, IReactionDisposer> = new Map()

  protected declare config: RequiredAutosaveCollectionConfig

  constructor(
    factory: TFactory,
    transport: TTransport,
    config?: AutosaveCollectionConfig
  ) {
    super(factory, transport, config)
    this.config.autoSave = {
      enabled: false,
      debounce: 0,
      ...(config?.autoSave || undefined)
    }
  }

  /**
   * Return collection confing {@link RequiredAutosaveCollectionConfig}
   *
   */
  override getConfig(): RequiredAutosaveCollectionConfig {
    return super.getConfig() as RequiredAutosaveCollectionConfig
  }

  protected override startTracking(model: TModel): void {
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

  protected autoSave(payload: { data: unknown; model: TModel }): void {
    this.save(payload.model)
  }

  startAutoSave(): TModel[]

  startAutoSave(model: TModel): TModel | undefined

  startAutoSave(models: TModel[]): TModel[]

  /**
   * Starts auto save for provided models.  If called without models the process will be started for all the models in the collection.
   * {@link AutosaveCollection.onStartAutoSave} callback
   * will be called with all the models for which the autosave process has been started.
   * @param models - model to start autosave process
   * @returns models that have autosave process started
   */
  startAutoSave(models?: TModel | TModel[]): TModel | TModel[] | undefined {
    const modelsArr = models
      ? Array.isArray(models)
        ? models
        : [models]
      : this._models

    const modelsStarted: TModel[] = []
    modelsArr.forEach((model) => {
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

  /**
   * Stops auto save process for provided models. If called without models, the process will be stopped
   * for all the models in the collection
   * {@link AutosaveCollection.onStopAutoSave} callback
   * will be called with all the models for which the autosave process has been stopped
   * @param models - models to stop the autosave process
   * @returns models that have autosave process stopped
   */
  stopAutoSave(models?: TModel | TModel[]): TModel | TModel[] | undefined {
    const modelsArr = models
      ? Array.isArray(models)
        ? models
        : [models]
      : this._models

    const modelsStopped: TModel[] = []
    modelsArr.forEach((model) => {
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

  /**
   * Callback that is called when {@link AutosaveCollection.stopAutoSave} method has been executed
   * @param models - the array of models for which the auto save process has been stopped.
   */
  protected onStopAutoSave(models: TModel[]): void {}

  /**
   * Callback that is called when {@link AutosaveCollection.startAutoSave} method is executed
   * @param models - the array of models for which the auto save process has been started
   */
  protected onStartAutoSave(models: TModel[]): void {}

  /**
   * Destroy the collection
   * @see {@link Collection.destroy}
   */
  override destroy(): void {
    super.destroy()

    this.stopAutoSave()
  }

  /**
   * Check if autosave process is enabled for a particular model
   * @param cid  - model cid
   * @returns true if the process is enabled
   */
  autoSaveEnabled(cid: string): boolean {
    return !!this.saveReactionByCid.get(cid)
  }
}
