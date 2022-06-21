import equal from 'fast-deep-equal'
import {
  action,
  autorun,
  computed,
  IReactionDisposer,
  makeObservable,
  observable
} from 'mobx'
import { nanoid } from 'nanoid/non-secure'
import { Collection } from '../collection/Collection'
import {
  DeleteConfig,
  DeleteResult,
  ExtractTransport,
  ModelDeleteErrorCallback,
  ModelDeleteStartCallback,
  ModelDeleteSuccessCallback,
  ModelSaveErrorCallback,
  ModelSaveStartCallback,
  ModelSaveSuccessCallback,
  ModelTransportErrors,
  Payload,
  SaveConfig,
  SaveResult,
  Transport
} from '../types'

const collectionError = 'Model is not part of the collection'

export abstract class Model<
  TCollection extends Collection<any, any, any> = Collection<any, any, any>
> {
  static identityKey = 'cid'

  private collection?: TCollection

  /**
   * Cid (client id)  of model
   * Every model has a unique client id that is used iternally
   * for tracking the uniqueness of the model
   */
  readonly cid: string

  protected errors: ModelTransportErrors = {
    save: null,
    delete: null
  }

  protected _isDeleted = false

  protected _isSaving = false

  protected _isDeleting = false

  protected ignoreChange = false

  protected _isDestroyed = false

  protected _isNew = true

  protected payloadActionDisposer!: IReactionDisposer

  protected initialized = false

  protected pendingSaveCall:
    | {
        token: Record<string, never>
        state: 'pending' | 'resolved' | 'rejected'
      }
    | undefined

  /**
   * Last saved data of the model
   */
  readonly lastSavedData: Payload<this> | undefined = undefined

  /**
   * Gets identity key of the model
   */
  get identityKey(): string {
    return (this.constructor as typeof Model).identityKey
  }

  constructor() {
    this.cid = nanoid()

    makeObservable<
      this,
      | '_isDeleted'
      | '_isSaving'
      | '_isDestroyed'
      | '_isDeleting'
      | '_isNew'
      | 'errors'
      | 'computePayload'
      | 'lastSavedData'
    >(this, {
      init: action,
      _isDeleted: observable,
      isDeleted: computed,

      _isSaving: observable,
      isSaving: computed,

      _isDeleting: observable,
      isDeleting: computed,

      isDirty: computed,
      _isDestroyed: observable,
      isDestroyed: computed,

      isSyncing: computed,
      lastSavedData: observable,

      isNew: computed,
      _isNew: observable,
      setIsNew: action,

      computePayload: computed.struct,
      payload: computed,

      setIdentity: action,
      identity: computed,
      hasErrors: computed,
      errors: observable,
      saveError: computed,
      deleteError: computed,

      _onSaveStart: action,
      _onSaveSuccess: action,
      _onSaveError: action,
      _onDeleteError: action,
      _onDeleteStart: action,
      _onDeleteSuccess: action,
      destroy: action
    })
  }

  abstract serialize(): any

  // @internal
  init(asNew = true, collection?: TCollection): void {
    if (this.initialized) return
    this.collection = collection
    this.payloadActionDisposer = this.startPayloadCompute()
    // @ts-expect-error -read only
    this.lastSavedData = this.payload
    this.initialized = true
    this._isNew = asNew
  }

  // https://alexhisen.gitbook.io/mobx-recipes/use-computedstruct-for-computed-objects
  /**
   * data that mirrors the data returned by the `serialize` method. Transport layer should use this data for saving the model.
   */
  get payload(): Payload<this> {
    return this.computePayload
  }

  //computed struct
  protected get computePayload(): Payload<this> {
    return this.serialize()
  }

  protected startPayloadCompute(): IReactionDisposer {
    return autorun(() => {
      return this.payload
    })
  }

  /**
   * Check if model has encountered any errors while saving or deleting
   */
  get hasErrors(): boolean {
    return !!this.errors.save || !!this.errors.delete
  }

  /**
   * Get model transport save error
   */
  get saveError(): any {
    return this.errors.save
  }

  /**
   * Get model transport delete error
   */
  get deleteError(): any {
    return this.errors.delete
  }

  /**
   * Check if the model has been deleted via {@link Transport.delete}
   * Model can still exist in the collection and be deleted at the same time.
   */
  get isDeleted(): boolean {
    return this._isDeleted
  }

  /**
   * Check if the model is in the proces of deleting via {@link Transport.delete} or saving
   * via {@link Transport.save}
   */
  get isSyncing(): boolean {
    return this.isSaving || this.isDeleting
  }

  /**
   * Check if the model is in the proces of deleting via {@link Transport.delete}.
   */
  get isDeleting(): boolean {
    return this._isDeleting
  }

  /**
   * Check if the model is in the proces of saving via {@link Transport.save}.
   */
  get isSaving(): boolean {
    return this._isSaving
  }

  /**
   * Check if the model {@link Model.destroy} method has been called
   */
  get isDestroyed(): boolean {
    return this._isDestroyed
  }

  //@internal
  _onAdded(collection: TCollection): void {
    this.collection = collection
    this.onAdded(collection)
  }

  /**
   * Callback that is fired when the model is added to the collection.
   * @param collection - collection that contains the model
   */
  protected onAdded(collection: TCollection): void {}

  //@internal
  _onRemoved(collection: TCollection): void {
    this.collection = undefined
    this.onRemoved(collection)
  }

  /**
   * Callback that is fired when the model is removed from the collection.
   * @param collection - collection from which the model was removed
   */
  protected onRemoved(collection: TCollection): void {}

  // @internal
  _onSaveStart({
    config,
    transportConfig,
    token
  }: {
    config: SaveConfig
    transportConfig: any
    token: Record<string, never>
  }): void {
    this._isSaving = true
    this.pendingSaveCall = {
      token,
      state: 'pending'
    }
    this.errors.save = undefined
    this.onSaveStart({ config, transportConfig })
  }

  /**
   * Get the collection the model is part of
   */
  getCollection(): TCollection | undefined {
    return this.collection
  }

  /**
   * Save the model by calling {@link Collection.save}. If the model is not part of the collection, it will throw
   * @param config - transport configuration from the collection transport.
   */
  async save<TConfig = Parameters<ExtractTransport<TCollection>['save']>[1]>(
    config: TConfig
  ): Promise<SaveResult<this, ExtractTransport<TCollection>>> {
    if (!this.collection) throw new Error(collectionError)

    return await this.collection!.save(this, undefined, config)
  }

  /**
   * Callback that is executed when {@link Model.save} process starts.
   *
   * @param data -  @see {@link ModelSaveStartCallback}
   */
  protected onSaveStart(data: ModelSaveStartCallback): void {}

  // @internal
  _onSaveSuccess({
    response,
    config,
    transportConfig,
    savedData,
    token
  }: {
    response: any
    config: SaveConfig
    transportConfig: any
    savedData: any
    token: Record<string, never>
  }): void {
    if (
      token === this.pendingSaveCall?.token ||
      this.pendingSaveCall?.state === 'pending'
    ) {
      // @ts-expect-error - read only
      this.lastSavedData = savedData
    }

    if (token === this.pendingSaveCall?.token) {
      this._isSaving = false
      this.pendingSaveCall.state = 'resolved'
    }

    this._isNew = false

    this.onSaveSuccess({
      config,
      transportConfig,
      response
    })
  }

  /**
   * Callback that is called when {@link Model.save} executes successfully
   * @param data - @see {@link ModelSaveSuccessCallback}
   */
  protected onSaveSuccess(data: ModelSaveSuccessCallback): void {}

  //@internal
  _onSaveError({
    error,
    config,
    transportConfig,
    token,
    dataToSave
  }: {
    error: any
    config: SaveConfig
    transportConfig: any
    token: Record<string, never>
    dataToSave: any
  }): void {
    if (this.pendingSaveCall?.token === token) {
      /* Only when there is no more save errors */
      this._isSaving = false
      this.errors.save = error
      this.pendingSaveCall.state = 'rejected'
    }
    this.onSaveError({
      error,
      config,
      transportConfig,
      dataToSave
    })
  }

  /**
   * Callback that is excuted when {@link Model.save} call finishes with error
   * @param data - @see {@link ModelSaveErrorCallback}
   */
  protected onSaveError(data: ModelSaveErrorCallback<Payload<this>>): void {}

  /**
   * Get identity value
   */
  get identity(): string {
    // @ts-expect-error  dynamic key access
    return this[this.identityKey]
  }

  /**
   * Set new identity value
   * @param newValue - new value
   */
  setIdentity(newValue: string): void {
    // @ts-expect-error force setting identifier property on the model
    this[this.identityKey] = newValue
  }

  /**
   * Check if the model is new. Model is new if it has been created but not yet saved via {@link Transport.save}
   */
  get isNew(): boolean {
    return this._isNew
  }

  /**
   * Set `isNew` property on the model. This method should generally not be used by the client code.
   * Transport layer could use this property in order to determine if it should use `POST` or `PATCH` methods
   * for persistence.
   *
   * @param isNew - true if the model should be marked as new
   */
  setIsNew(isNew: boolean): void {
    this._isNew = isNew
  }

  /**
   * Delete the model by calling {@link Collection.delete}. If the model is not part of the collection, it will throw
   * @param config - transport configuration from the collection transport.
   */
  async delete<
    TConfig = Parameters<ExtractTransport<TCollection>['delete']>[1]
  >(
    config: TConfig
  ): Promise<DeleteResult<this, ExtractTransport<TCollection>>> {
    if (!this.collection) throw new Error(collectionError)

    return await this.collection!.delete(this.cid, undefined, config)
  }

  // @internal
  _onDeleteStart(data: { config: DeleteConfig; transportConfig: any }): void {
    this._isDeleting = true
    this.onDeleteStart(data)
  }

  /**
   * Callback that is called when {@link Model.delete} method starts executing
   * @param data - @see {@link ModelDeleteStartCallback}
   */
  protected onDeleteStart(data: ModelDeleteStartCallback<Transport>): void {}

  // @internal
  _onDeleteSuccess(data: {
    response: any
    data?: any
    config: DeleteConfig
    transportConfig: any
  }): void {
    this._isDeleting = false
    this.errors.delete = undefined
    this._isDeleted = true
    this.onDeleteSuccess(data)
  }

  /**
   * Callback that is executed when {@link Model.delete} method finishes executing successfully
   * @param data - @see {@link ModelDeleteSuccessCallback}
   */
  protected onDeleteSuccess(
    data: ModelDeleteSuccessCallback<Transport>
  ): void {}

  //@internal
  _onDeleteError(data: {
    error: any
    data?: any
    config: DeleteConfig
    transportConfig: any
  }): void {
    this.errors.delete = data.error
    this._isDeleting = false
    this._isDeleted = false

    this.onDeleteError(data)
  }

  /**
   * Callback that is executed when {@link Model.delete} method executes with error
   * @param data - @see {@link ModelDeleteErrorCallback}
   */
  protected onDeleteError(data: ModelDeleteErrorCallback<Transport>): void {}

  /**
   * Checks if the model is dirty. Model is dirty when properites that are serialized for saving have been changed since the last {@link Transport.save} call.
   */
  get isDirty(): boolean {
    return this.modelIsDirty()
  }

  protected modelIsDirty(): boolean {
    return !equal(this.lastSavedData, this.payload)
  }

  destroy(): void {
    this.onDestroy()
    this._isDestroyed = true
    this.payloadActionDisposer()
  }

  /**
   * Callback that is executed when the model is destroyed
   */
  // @internal
  onDestroy(): void {}

  /**
   * Custom model toJSON method. Use {@link Model.serialize} if you want to serialize the model.
   * @returns json
   */
  toJSON(): Payload<this> {
    return this.payload
  }
}
