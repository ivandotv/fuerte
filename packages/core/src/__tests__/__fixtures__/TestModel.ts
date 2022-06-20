import { randomUUID } from 'crypto'
import { makeObservable, observable } from 'mobx'
import { Model } from '../../model/Model'
import {
  ModelDeleteErrorCallback,
  ModelDeleteStartCallback,
  ModelDeleteSuccessCallback,
  SaveConfig,
  TransportSaveConfig,
  TransportSaveResponse
} from '../../types'
import { TestCollection } from './TestCollection'
import { TestTransport } from './TestTransport'

export type TestModelData = {
  foo?: string
  bar?: string
  id?: string
}

export class TestModel extends Model<TestCollection> {
  static override identityKey = 'id'

  foo: string

  bar: string

  id: string | undefined

  constructor(foo = 'foo', bar = 'bar', id?: string) {
    super()
    this.foo = foo
    this.bar = bar
    this.id = id ?? randomUUID()

    makeObservable(this, {
      foo: observable,
      bar: observable,
      id: observable
    })
  }

  testMethod(b: boolean): boolean {
    return b
  }

  serialize() {
    return {
      foo: this.foo,
      bar: this.bar,
      id: this.id ?? ''
    }
  }

  protected override onRemoved(collection: TestCollection): void {}

  override onSaveSuccess(data: {
    response: TransportSaveResponse<TestTransport>
    config: SaveConfig
    transportConfig: TransportSaveConfig<TestTransport>
  }): void {
    super.onSaveSuccess(data)
  }

  override onSaveError(data: {
    error: any
    config: SaveConfig
    transportConfig: any
    dataToSave: any
  }): void {
    super.onSaveError(data)
  }

  override onSaveStart(data: {
    config: SaveConfig
    transportConfig: any
  }): void {
    super.onSaveStart(data)
  }

  override onDeleteStart(data: ModelDeleteStartCallback<TestTransport>): void {
    super.onDeleteStart(data)
  }

  override onDeleteSuccess(
    data: ModelDeleteSuccessCallback<TestTransport>
  ): void {
    super.onDeleteSuccess(data)
  }

  override onDeleteError(data: ModelDeleteErrorCallback<TestTransport>): void {
    super.onDeleteError(data)
  }

  override onDestroy() {
    super.onDestroy()
  }
}
