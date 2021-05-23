import { makeObservable, observable } from 'mobx'
import { Model, ModelConfig } from '../model/Model'
import { ReloadConfig, SaveConfig } from '../utils/types'
import { TestCollection } from './TestCollection'

export type TestModelData = {
  foo: string
  bar: string
  id?: string
}

export class TestModel extends Model<TestCollection> {
  static config: ModelConfig = {
    identityKey: 'id',
    setIdentityFromResponse: true
  }

  // id: string | undefined

  foo: string

  bar: string

  id: string | undefined

  constructor(foo = 'foo', bar = 'bar', id?: string) {
    super()
    this.foo = foo
    this.bar = bar
    this.id = id

    makeObservable(this, {
      foo: observable,
      bar: observable,
      id: observable
    })
  }

  testMethod(b: boolean): boolean {
    return b
  }

  createPayload(): TestModelData {
    // get that sweet code coverage
    try {
      super.createPayload()
      // eslint-disable-next-line
    } catch (e) {}

    return {
      foo: this.foo,
      bar: this.bar,
      id: this.id ?? ''
    }
  }

  updateFromReload(data: TestModelData): void {
    super.updateFromReload(data)
    this.foo = data.foo
    this.bar = data.bar
  }

  onSaveSuccess(data: {
    response: any
    config: SaveConfig
    transportConfig: any
    data: any
  }): void {
    super.onSaveSuccess(data)
  }

  onSaveError(data: {
    error: any
    config: SaveConfig
    transportConfig: any
    dataToSave: any
  }): void {
    super.onSaveError(data)
  }

  onSaveStart(data: { config: SaveConfig; transportConfig: any }): void {
    super.onSaveStart(data)
  }

  onReloadStart(data: {
    config: ReloadConfig
    transportConfig: any
    isBulk: boolean
  }): void {
    super.onReloadStart(data)
  }

  onReloadSuccess(data: {
    response: { data: any }
    config: ReloadConfig
    transportConfig: any
    isBulk: boolean
    data: any
  }): void {
    super.onReloadSuccess(data)
  }

  onReloadError(data: {
    error: any
    data: any
    config: ReloadConfig
    transportConfig: any
  }): void {
    super.onReloadError(data)
  }

  onRemoved(): void {
    super.onRemoved()
  }

  onDeleteStart(data: any): void {
    super.onDeleteStart(data)
  }

  onDeleteSuccess(data: any): void {
    super.onDeleteSuccess(data)
  }

  onDeleteError(data: any): void {
    super.onDeleteError(data)
  }

  onDestroy() {
    super.onDestroy()
  }
}
