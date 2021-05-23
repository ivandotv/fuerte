import equal from 'fast-deep-equal'
import {
  action,
  autorun,
  computed,
  IActionFactory,
  IReactionDisposer,
  makeObservable,
  observable
} from 'mobx'
import { v4 as uuid } from 'uuid'
import { Collection } from '../collection/Collection'
import {
  DeleteConfig,
  UnwrapPromise,
  ReloadConfig,
  SaveConfig,
  SaveStart
} from '../utils/types'
import { assertCollectionExists } from '../utils/utils'
import { IdentityError } from './identity-error'

export interface ModelTransportErrors<
  TSave = any | null,
  TReload = any | null,
  TDelete = any | null
> {
  save: TSave
  reload: TReload
  delete: TDelete
}

export type ModelConfig = {
  identityKey: string
  setIdentityFromResponse: boolean
}

export abstract class Model<
  TCollection extends Collection<any, any, any>,
  TDTO = any
> {
  collection: TCollection | undefined

  static config: ModelConfig = {
    identityKey: 'cid', //force child classes to set identity key
    setIdentityFromResponse: true
  }

  readonly cid: string

  // protected changeDisposer: IReactionDisposer | undefined

  protected errors: ModelTransportErrors = {
    save: null,
    // update: null,
    reload: null,
    delete: null
  }

  protected _isDeleted = false

  protected _isSaving = false

  protected _isDeleting = false

  protected _isReloading = false

  protected ignoreChange = false

  protected _isDestroyed = false

  protected payloadActionDisposer: IReactionDisposer | undefined

  protected pendingSaveCall:
    | {
        token: string
        state: 'pending' | 'resolved' | 'rejected'
      }
    | undefined

  protected pendingReloadCalls = 0

  lastSavedData: TDTO | undefined = undefined

  // protected lastSerializedData: TDTO | undefined = undefined

  // protected _identityValue: string

  // readonly identityKey: string

  get identityKey(): string {
    return (this.constructor as typeof Model).config.identityKey
  }

  constructor() {
    this.cid = uuid()

    // this.identityKey = (this.constructor as typeof Model).config.identityKey

    // this.identity
    // this[this.identityKey] = this.cid
    // if (!this.identityKey) {
    //   throw new Error('must set identity key')
    // }

    makeObservable<
      this,
      | '_isDeleted'
      | '_isSaving'
      | '_isReloading'
      | '_isDestroyed'
      // | '_isDirty'
      | 'errors'
      | '_isDeleting'
      | 'computePayload'
      // | 'identityValue'
      // | 'ignoreChange'
      // | 'lastSerializedData'
      // | 'onSerialize'
    >(this, {
      // ignoreChange: observable,

      // [this.identityKey]: observable,
      _isDeleted: observable,
      isDeleted: computed,

      _isSaving: observable,
      isSaving: computed,

      _isDeleting: observable,
      isDeleting: computed,

      isDirty: computed,
      _isDestroyed: observable,
      isDestroyed: computed,
      _isReloading: observable,
      isReloading: computed,

      isSyncing: computed,
      // lastSerializedData: observable,
      lastSavedData: observable,

      isNew: computed,

      computePayload: computed.struct,
      payload: computed,

      // identityValue: observable,
      // getIdentityKey: action,
      setIdentity: action,
      // getIdentityValue: action,
      identity: computed,
      // cid: observable,
      // [this.identityKey]: observable,
      hasErrors: computed,
      errors: observable,
      saveError: computed,
      deleteError: computed,
      reloadError: computed,

      _onAdded: action,
      _onRemoved: action,

      _onSaveStart: action,
      _onSaveSuccess: action,
      _onSaveError: action,
      _onReloadStart: action,
      _onReloadSuccess: action,
      _onReloadError: action,
      _onDeleteError: action,
      _onDeleteStart: action,
      _onDeleteSuccess: action
    })
  }

  // https://alexhisen.gitbook.io/mobx-recipes/use-computedstruct-for-computed-objects
  //computed
  get payload(): TDTO {
    // return this.lastSerializedData || this.onSerialize()

    return this.computePayload
  }

  //computed struct
  protected get computePayload(): TDTO {
    return this.createPayload()
  }

  protected createPayload(): TDTO {
    // - serialize the model
    throw new Error('Child class should implement getPayload')
  }

  protected startPayloadComputeCache(): IReactionDisposer {
    return autorun(() => {
      return this.payload
    })
  }
  // onHydrated(_data: any): void {}

  get hasErrors(): boolean {
    return !!this.errors.save || !!this.errors.reload || !!this.errors.delete
  }

  get saveError(): any {
    return this.errors.save
  }

  get deleteError(): any {
    return this.errors.delete
  }

  get reloadError(): any {
    return this.errors.reload
  }

  // @internal
  _onAdded(collection: TCollection): void {
    this.collection = collection
    this.onAdded()
    this.startPayloadComputeCache()
  }

  protected onAdded(): void {}

  // @internal
  _onRemoved(): void {
    const old = this.collection
    this.collection = undefined
    this.onRemoved(old!)
    this.payloadActionDisposer && this.payloadActionDisposer()
  }

  protected onRemoved(_collection: TCollection): void {}

  // todo - marked for removal
  // why does this exist?
  get isDeleted(): boolean {
    // return this._isRemoved
    return this._isDeleted
  }

  get isSyncing(): boolean {
    return this.isSaving || this.isDeleting || this.isReloading
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

  get isReloading(): boolean {
    return this._isReloading
  }

  async delete<T extends TCollection = TCollection>(
    config?: DeleteConfig,
    transportConfig?: any
  ): Promise<
    Pick<UnwrapPromise<ReturnType<T['delete']>>, 'response' | 'error'>
  > {
    assertCollectionExists(this.collection)

    const { response, error } = await this.collection.delete(
      this,
      config,
      transportConfig
    )

    return { response, error }
  }

  async reload<T extends TCollection = TCollection>(
    config?: ReloadConfig,
    transportConfig?: any
  ): Promise<
    Pick<UnwrapPromise<ReturnType<T['reload']>>, 'response' | 'error'>
  > {
    assertCollectionExists(this.collection)

    const { response, error } = await this.collection.reload(
      this,
      config,
      transportConfig
    )

    return { response, error }
  }

  async save<T extends TCollection = TCollection>(
    config?: SaveConfig,
    transportConfig?: any
  ): Promise<Pick<UnwrapPromise<ReturnType<T['save']>>, 'response' | 'error'>> {
    assertCollectionExists(this.collection)

    const { response, error } = await this.collection.save(
      this,
      config,
      transportConfig
    )

    return { response, error }
  }

  // @internal
  _onSaveStart({
    config,
    transportConfig,
    token
  }: {
    config: SaveConfig
    transportConfig: any
    token: string
  }): void {
    this._isSaving = true
    this.pendingSaveCall = {
      token,
      state: 'pending'
    }
    this.errors.save = undefined
    this.onSaveStart({ config, transportConfig })
  }

  protected onSaveStart(_data: {
    config: SaveConfig
    transportConfig: any
  }): void {}

  // @internal
  _onSaveSuccess({
    response,
    data,
    config,
    transportConfig,
    savedData,
    token
  }: {
    response: any
    data: any
    config: SaveConfig
    transportConfig: any
    savedData: any
    token: string
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

    const modelConfig = (this.constructor as typeof Model).config

    if (this.isNew && modelConfig.setIdentityFromResponse) {
      const key = this.identityKey

      const identityValue = this.extractIdentityValue(
        data,
        config,
        transportConfig
      )

      if (!identityValue) {
        throw new IdentityError(
          `Identity value for identity key: ${modelConfig?.identityKey} could not be extracted from the response.`
        )
      }

      this.setIdentity(identityValue)

      // @ts-expect-error - dynamic key access
      this.lastSavedData[key] = this.identity
    }
    this.onSaveSuccess({
      config,
      transportConfig,
      response,
      data: response.data
    })
  }

  protected onSaveSuccess(_data: {
    response: any
    data: any
    config: SaveConfig
    transportConfig: any
  }): void {}

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
    token: string
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

  protected onSaveError(_data: {
    error: any
    config: SaveConfig
    transportConfig: any
    dataToSave: TDTO
  }): void {}

  protected extractIdentityValue(
    data: any,
    config: any, // collection save config
    transportConfig: any // transportConfig - save
  ): string | undefined {
    //todo - ovde mozda da odradim varijantu da se uvek vraca id
    return data && data[this.identityKey]
    // return data && data.id
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
  /* RELOAD*/

  // @internal
  _onReloadStart({
    config,
    transportConfig
  }: {
    config: ReloadConfig
    transportConfig: any
  }): void {
    this._isReloading = true
    this.pendingReloadCalls++
    this.errors.reload = undefined
    this.onReloadStart({ config, transportConfig })
  }

  protected onReloadStart(_data: {
    config: ReloadConfig
    transportConfig: any
  }): void {}

  // @internal
  _onReloadSuccess(payload: {
    response: any
    config: ReloadConfig
    transportConfig: any
    data?: any
  }): void {
    if (payload.data) {
      this.updateFromReload(payload.data)
      this.lastSavedData = this.createPayload() // create new object
    }

    this.pendingReloadCalls--
    if (this.pendingReloadCalls === 0) {
      this._isReloading = false
    }

    this.onReloadSuccess(payload)
  }

  protected onReloadSuccess(_data: {
    response: any
    config: ReloadConfig
    transportConfig: any
    data?: any
  }): void {}

  _onReloadError(payload: {
    error: any
    data: any
    config: any
    transportConfig: any
  }): void {
    this.pendingReloadCalls--
    if (this.pendingReloadCalls === 0) {
      this._isReloading = false
      this.errors.reload = payload.error
    }
    this.onReloadError(payload)
  }

  protected onReloadError(_data: {
    error: any
    data: any
    config: any
    transportConfig: any
  }): void {}

  /* END RELOAD */

  protected updateFromReload(_data: any): void {
    throw new Error('Child class should implement updateFromReload')
  }

  protected onDeleteFromDataPush(_data?: any): void {}

  // @internal
  _onDeleteStart(data: { config: DeleteConfig; transportConfig: any }): void {
    this._isDeleting = true
    this.onDeleteStart(data)
  }

  protected onDeleteStart(_data: {
    config: DeleteConfig
    transportConfig: any
  }): void {}

  _onDeleteSuccess(data: {
    response: any
    data?: any
    config: DeleteConfig
    transportConfig: any
  }): void {
    this._isDeleting = false
    this.errors.delete = undefined
    this._isDeleted = true
    // this._markedForDeletion = false
    this.onDeleteSuccess(data)
  }

  protected onDeleteSuccess(_data: {
    response: any
    data?: any
    config: DeleteConfig
    transportConfig: any
  }): void {}

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

  protected onDeleteError(data: {
    error: any
    data?: any
    config: DeleteConfig
    transportConfig: any
  }): void {}

  get isDirty(): boolean {
    return this.modelIsDirty()
  }

  protected modelIsDirty(): boolean {
    return this.isNew || !equal(this.lastSavedData, this.payload)
  }

  getCollection(): TCollection | undefined {
    return this.collection
  }

  // @internal
  _onDestroy(): void {
    this.onDestroy()
  }

  onDestroy(): void {}
}
