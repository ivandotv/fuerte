import { makeObservable, observable } from 'mobx'
import { Model } from '../model/Model'
import {
  ModelDeleteErrorCallback,
  ModelDeleteStartCallback,
  ModelDeleteSuccessCallback,
  SaveConfig,
  TransportSaveConfig,
  TransportSaveResponse
} from '../utils/types'
import type { TestCollection } from './TestCollection'
import { TestTransport } from './TestTransport'

export type TestModelData = {
  foo?: string
  bar?: string
  id?: string
}

export class TestModel<
  T extends TestCollection = TestCollection
> extends Model<T> {
  static identityKey = 'id'

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

  serialize(): TestModelData {
    return {
      foo: this.foo,
      bar: this.bar,
      id: this.id ?? ''
    }
  }

  onSaveSuccess(data: {
    response: TransportSaveResponse<TestTransport>
    config: SaveConfig
    transportConfig: TransportSaveConfig<TestTransport>
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

  onRemoved(): void {
    super.onRemoved()
  }

  onDeleteStart(data: ModelDeleteStartCallback<TestTransport>): void {
    super.onDeleteStart(data)
  }

  onDeleteSuccess(data: ModelDeleteSuccessCallback<TestTransport>): void {
    super.onDeleteSuccess(data)
  }

  onDeleteError(data: ModelDeleteErrorCallback<TestTransport>): void {
    super.onDeleteError(data)
  }

  onDestroy() {
    super.onDestroy()
  }
}
