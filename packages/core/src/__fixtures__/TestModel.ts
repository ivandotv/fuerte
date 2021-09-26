import { makeObservable, observable } from 'mobx'
import { Model } from '../model/Model'
import {
  SaveConfig,
  TransportSaveConfig,
  TransportSaveResponse
} from '../utils/types'
import { TestCollection } from './TestCollection'
import { TestTransport } from './TestTransport'

export type TestModelData = {
  foo?: string
  bar?: string
  id?: string
}

export class TestModel extends Model<any> {
  static identityKey = 'id'
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
