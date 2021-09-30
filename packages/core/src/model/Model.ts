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
import { Transport } from '../transport/transport'
import {
  DeleteConfig,
  ModelDeleteErrorCallback,
  ModelDeleteStartCallback,
  ModelDeleteSuccessCallback,
  ModelSaveErrorCallback,
  ModelSaveStartCallback,
  ModelSaveSuccessCallback,
  ModelTransportErrors,
  SaveConfig,
  TransportDeleteConfig,
  TransportSaveConfig,
  UnwrapPromise
} from '../utils/types'
import { assertCollectionExists } from '../utils/utils'
import { IdentityError } from './identity-error'

export abstract class Model<
  TCollection extends Collection<any, any, any> = Collection<any, any, any>,
  TDTO = any
> {
  static identityKey = 'cid'

  static setIdentityFromResponse = false

  collection: TCollection | undefined

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

  protected payloadActionDisposer!: IReactionDisposer

  protected initialized = false

  protected pendingSaveCall:
    | {
        token: Record<string, never>
        state: 'pending' | 'resolved' | 'rejected'
      }
    | undefined

  lastSavedData: TDTO | undefined = undefined

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
      | 'errors'
      | '_isDeleting'
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

      computePayload: computed.struct,
      payload: computed,

      setIdentity: action,
      identity: computed,
      hasErrors: computed,
      errors: observable,
      saveError: computed,
      deleteError: computed,
      _onAdded: action,
      _onRemoved: action,

      _onSaveStart: action,
      _onSaveSuccess: action,
      _onSaveError: action,
      _onDeleteError: action,
      _onDeleteStart: action,
      _onDeleteSuccess: action,
      destroy: action
    })
  }

  // @internal
  init(): void {
    if (this.initialized) return
    this.payloadActionDisposer = this.startPayloadCompute()
    this.lastSavedData = this.payload
    this.initialized = true
  }

  // https://alexhisen.gitbook.io/mobx-recipes/use-computedstruct-for-computed-objects
  get payload(): TDTO {
    return this.computePayload
  }

  //computed struct
  protected get computePayload(): TDTO {
    return this.serialize()
  }

  protected abstract serialize(): TDTO

  protected startPayloadCompute(): IReactionDisposer {
    return autorun(() => {
      return this.payload
    })
  }

  get hasErrors(): boolean {
    return !!this.errors.save || !!this.errors.delete
  }

  get saveError(): any {
    return this.errors.save
  }

  get deleteError(): any {
    return this.errors.delete
  }

  // @internal
  _onAdded(collection: TCollection): void {
    this.collection = collection
    this.onAdded()
  }

  protected onAdded(): void {}

  // @internal
  _onRemoved(): void {
    this.onRemoved()
    this.collection = undefined
  }

  protected onRemoved(): void {}

  get isDeleted(): boolean {
    return this._isDeleted
  }

  get isSyncing(): boolean {
    return this.isSaving || this.isDeleting
  }

  get isDeleting(): boolean {
    return this._isDeleting
  }

  get isSaving(): boolean {
    return this._isSaving
  }

  get isDestroyed(): boolean {
    return this._isDestroyed
  }

  async delete<
    T extends TCollection = TCollection,
    TTransport extends Transport<Model> = Transport<Model>
  >(
    config?: DeleteConfig,
    transportConfig?: TransportDeleteConfig<TTransport>
  ): Promise<
    Pick<UnwrapPromise<ReturnType<T['delete']>>, 'response' | 'error'>
  > {
    assertCollectionExists(this.collection)

    const { response, error } = await this.collection.delete(
      this.cid,
      config,
      transportConfig
    )

    return { response, error }
  }

  async save<
    T extends TCollection = TCollection,
    TTransport extends Transport = Transport
  >(
    config?: SaveConfig,
    transportConfig?: TransportSaveConfig<TTransport>
  ): Promise<Pick<UnwrapPromise<ReturnType<T['save']>>, 'response' | 'error'>> {
    assertCollectionExists(this.collection)

    const { response, error } = await this.collection.save(
      this,
      config,
      transportConfig
    )

    return { response, error }
  }

  remove(): this {
    assertCollectionExists(this.collection)

    return this.collection.remove(this.identity)
  }

  addTo<T extends Collection<any, any, any> = Collection<any, any, any>>(
    collection: T,
    index?: number
  ): this | undefined {
    const l = collection.models.length
    index = index ?? (l === 0 ? 0 : l)

    return collection.addAtIndex(this, index)
  }

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
      this.lastSavedData = savedData
    }

    if (token === this.pendingSaveCall?.token) {
      this._isSaving = false
      this.pendingSaveCall.state = 'resolved'
    }

    if (
      this.isNew &&
      (this.constructor as typeof Model).setIdentityFromResponse
    ) {
      const identityValue = this.extractIdentityValue(
        response?.data,
        config,
        transportConfig
      )

      if (!identityValue) {
        throw new IdentityError(`Can't set identity key: ${this.identityKey}`)
      }

      this.setIdentity(identityValue)

      // @ts-expect-error - dynamic key access
      this.lastSavedData[this.identityKey] = this.identity
    }

    this.onSaveSuccess({
      config,
      transportConfig,
      response
    })
  }

  protected onSaveSuccess(data: ModelSaveSuccessCallback): void {}

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
      /* Only when there is no more save errros */
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

  protected onSaveError(data: ModelSaveErrorCallback<TDTO>): void {}

  protected extractIdentityValue(
    data: any | undefined,
    config: any, // collection save config
    transportConfig: any // transportConfig - save
  ): string | undefined {
    return data && data[this.identityKey]
  }

  //todo - mozda izbaciti undefined
  get identity(): string {
    // @ts-expect-error  dynamic key access
    return this[this.identityKey]
  }

  setIdentity(newValue: string): void {
    // @ts-expect-error force setting identifier property on the model
    this[this.identityKey] = newValue
  }

  get isNew(): boolean {
    return this.modelIsNew()
  }

  protected modelIsNew(): boolean {
    // return !this.identity
    return this.identity === this.cid || !this.identity
  }

  // @internal
  _onDeleteStart(data: { config: DeleteConfig; transportConfig: any }): void {
    this._isDeleting = true
    this.onDeleteStart(data)
  }

  protected onDeleteStart(data: ModelDeleteStartCallback<Transport>): void {}

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

  protected onDeleteSuccess(
    data: ModelDeleteSuccessCallback<Transport>
  ): void {}

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

  protected onDeleteError(data: ModelDeleteErrorCallback<Transport>): void {}

  get isDirty(): boolean {
    return this.modelIsDirty()
  }

  protected modelIsDirty(): boolean {
    return !equal(this.lastSavedData, this.payload)
  }

  getCollection(): TCollection | undefined {
    return this.collection
  }

  destroy(): void {
    this.onDestroy()
    this._isDestroyed = true
    if (this.collection) {
      this.collection.remove(this.cid)
    }
    if (this.payloadActionDisposer) {
      this.payloadActionDisposer()
    }
  }

  onDestroy(): void {}
}
