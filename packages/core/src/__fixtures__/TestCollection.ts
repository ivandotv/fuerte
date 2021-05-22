import { Collection } from '../collection/Collection'
import { HttpTransport } from '../transport/http-transport'
import {
  CollectionConfig,
  DeleteConfig,
  LoadConfig,
  ReloadError,
  ReloadStart,
  ReloadSuccess,
  SaveConfig,
  SaveStart
} from '../utils/types'
import { TestFactory } from './TestFactory'
import { TestModel } from './TestModel'
import { TestTransport } from './TestTransport'

export class TestCollection extends Collection<
  TestModel,
  TestTransport,
  TestFactory
> {
  constructor(
    factory: TestFactory,
    transport: TestTransport,
    config?: CollectionConfig,
    public foo = 'foo',
    public bar = 'bar'
  ) {
    super(factory, transport, config)
  }

  testMethod(a: string): string {
    return a
  }

  onReset(added: TestModel[], removed: TestModel[], fromLoad = false): void {}

  onRemoved(_model: TestModel): void {}

  onAdded(_model: TestModel): void {}

  onModelCreateData(data: any): void {
    return data
  }

  onSaveSuccess(_data: {
    model: TestModel
    response: any
    config: SaveConfig
    transportConfig: any
    test: boolean
  }): void {}

  onSaveStart(_data: SaveStart<TestTransport, TestModel>): void {}

  onSaveError(data: {
    model: TestModel
    error: any
    config: SaveConfig
    transportConfig: any
  }): void {}

  onReloadStart(_data: ReloadStart<TestTransport, TestModel>): void {}

  onReloadSuccess(_data: ReloadSuccess<TestTransport, TestModel>): void {}

  onReloadError(_data: ReloadError<TestTransport, TestModel>): void {}

  onDeleteSuccess(_data: {
    model: TestModel
    response: any
    config: DeleteConfig
    transportConfig: any
  }): void {}

  onDeleteError(_data: {
    model: TestModel
    error: any
    config: DeleteConfig
    transportConfig: any
  }): void {}

  onLoadStart(_data: { config: LoadConfig; transportConfig?: any }): void {}

  onLoadSuccess(_data: {
    config: LoadConfig
    transportConfig?: any
    response: any
    added: TestModel[]
    removed: TestModel[]
  }): void {}

  onLoadError(_data: {
    config: LoadConfig
    transportConfig?: any
    error: any
  }): void {}

  autoSave(payload: { model: TestModel; data: any }): void {
    return super.autoSave(payload)
  }

  onStartAutoSave(models: TestModel[]): void {}

  onStopAutoSave(models: TestModel[]): void {}
}

// const tt = new TestFactory()
// const ttModel = tt.create({ foo: 'a', bar: 'a' })

// const cc = new TestCollection(new TestFactory(), new HttpTransport(''))

// const testModel = cc.create({ foo: 'a', bar: 'a' })

// cc.save({ foo: 'a', bar: 'a' }, undefined, {
//   request: {
//     method: 'POST'
//   }
// }).then(result => {
//   if (!result.error) {
//     result.response.data
//   }
// })
