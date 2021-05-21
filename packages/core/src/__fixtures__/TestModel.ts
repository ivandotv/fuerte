import { makeObservable, observable } from 'mobx'
import { Model, ModelConfig } from '../model/Model'
import { ReloadConfig, SaveConfig, SaveStart } from '../utils/types'
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

    // if (id) {
    //   this.setIdentity(id)
    // }

    this.id = id

    // console.log('test model identity key ', this.identityKey)
    // console.log('test model identity value ', this.identity)
    makeObservable(this, {
      foo: observable,
      bar: observable,
      id: observable
    })

    // assertCollectionExists(this.collection)
    if (this.collection) {
      this.collection.testMethod('a')
      const _newModel = this.collection.create({ foo: 'a', bar: 'a' })
    }
  }

  testMethod(b: boolean): boolean {
    return b
  }

  createPayload(): TestModelData {
    return {
      foo: this.foo,
      bar: this.bar,
      id: this.id ?? ''
    }
  }

  updateFromReload(data: TestModelData): void {
    this.foo = data.foo
    this.bar = data.bar
  }

  onSaveSuccess(data: {
    response: any
    config: SaveConfig
    persistenceConfig: any
  }): void {}

  onSaveError(data: {
    error: any
    config: SaveConfig
    persistenceConfig: any
    dataToSave: any
  }): void {
    super.onSaveError(data)
  }

  onSaveStart(data: { config: SaveConfig; persistenceConfig: any }): void {}

  onReloadStart(data: {
    config: ReloadConfig
    persistenceConfig: any
    isBulk: boolean
  }): void {}

  onReloadSuccess(data: {
    response: { data: any }
    config: ReloadConfig
    persistenceConfig: any
    isBulk: boolean
    data: any
  }): void {}

  onReloadError(data: {
    error: any
    data: any
    config: ReloadConfig
    persistenceConfig: any
  }): void {}

  onRemoved(_collection: TestCollection): void {}

  onDeleteStart(data: any): void {}

  onDeleteSuccess(data: any): void {}

  onDeleteError(data: any): void {}

  // onDeleteFromDataPush(data: any): void {}

  // onUpdateFromDataPush(data: any): void {
  //   super.onUpdateFromDataPush(data)
  // }
}

// decorate(TestModel, {
//   foo: observable,
//   bar: observable
// })
