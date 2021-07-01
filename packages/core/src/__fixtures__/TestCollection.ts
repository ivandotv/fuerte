import { Collection } from '../collection/Collection'
import {
  CollectionConfig,
  DeleteConfig,
  LoadConfig,
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

  onReset(added: TestModel[], removed: TestModel[], fromLoad = false): void {
    super.onReset(added, removed)
  }

  onRemoved(model: TestModel): void {
    super.onRemoved(model)
  }

  onAdded(model: TestModel): void {
    super.onAdded(model)
  }

  onModelCreateData(data: any): void {
    super.onModelCreateData(data)

    return data
  }

  onSaveSuccess(data: {
    model: TestModel
    response: any
    config: SaveConfig
    transportConfig: any
    test: boolean
  }): void {
    super.onSaveSuccess(data)
  }

  onSaveStart(data: SaveStart<TestTransport, TestModel>): void {
    super.onSaveStart(data)
  }

  onSaveError(data: {
    model: TestModel
    error: any
    config: SaveConfig
    transportConfig: any
  }): void {
    super.onSaveError(data)
  }

  onDeleteSuccess(data: {
    model: TestModel
    response: any
    config: DeleteConfig
    transportConfig: any
  }): void {
    super.onDeleteSuccess(data)
  }

  onDeleteError(data: {
    model: TestModel
    error: any
    config: DeleteConfig
    transportConfig: any
  }): void {
    super.onDeleteError(data)
  }

  onLoadStart(data: { config: LoadConfig; transportConfig?: any }): void {
    super.onLoadStart(data)
  }

  onLoadSuccess(data: {
    config: LoadConfig
    transportConfig?: any
    response: any
    added: TestModel[]
    removed: TestModel[]
  }): void {
    super.onLoadSuccess(data)
  }

  onLoadError(data: {
    config: LoadConfig
    transportConfig?: any
    error: any
  }): void {
    super.onLoadError(data)
  }

  autoSave(payload: { model: TestModel; data: any }): void {
    return super.autoSave(payload)
  }

  onStartAutoSave(models: TestModel[]): void {
    super.onStartAutoSave(models)
  }

  onStopAutoSave(models: TestModel[]): void {
    super.onStopAutoSave(models)
  }

  onSerialize() {
    super.onSerialize()
  }

  onDestroy() {
    super.onDestroy()
  }
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
