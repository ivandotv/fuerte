import { randomUUID } from 'crypto'
import { makeObservable, observable } from 'mobx'
import { Model } from '../../model/Model'
import {
  ModelDeleteErrorCallback,
  ModelDeleteStartCallback,
  ModelDeleteSuccessCallback,
  ModelSaveErrorCallback,
  ModelSaveStartCallback,
  ModelSaveSuccessCallback
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

  serialize() {
    return {
      foo: this.foo,
      bar: this.bar,
      id: this.id ?? ''
    }
  }

  override onRemoved(collection: TestCollection): void {}

  override onAdded(collection: TestCollection): void {}

  override onSaveStart(data: ModelSaveStartCallback<TestTransport>): void {}

  override onSaveSuccess(data: ModelSaveSuccessCallback<TestTransport>): void {}

  override onSaveError(
    data: ModelSaveErrorCallback<TestModel, TestTransport>
  ): void {}

  override onDeleteStart(data: ModelDeleteStartCallback<TestTransport>): void {}

  override onDeleteSuccess(
    data: ModelDeleteSuccessCallback<TestTransport>
  ): void {}

  override onDeleteError(data: ModelDeleteErrorCallback<TestTransport>): void {}

  override onDestroy(): void {}
}
