import { Collection } from '../collection/Collection'
import { FetchPersistence } from '../transport/fetch-persistence'
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
import { TestPersistence } from './TestPersistence'

export class TestCollection extends Collection<
  TestModel,
  FetchPersistence<TestModel>,
  TestFactory
> {
  constructor(
    factory: TestFactory,
    transport: FetchPersistence<TestModel>,
    config?: CollectionConfig,
    public foo = 'foo',
    public bar = 'bar'
  ) {
    super(factory, transport, config)

    // const model = this.models[0]
    // model.testMethod(true)
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
    persistenceConfig: any
    test: boolean
  }): void {}

  onSaveStart(_data: SaveStart<TestPersistence, TestModel>): void {}

  onSaveError(data: {
    model: TestModel
    error: any
    config: SaveConfig
    transportConfig: any
  }): void {}

  onReloadStart(_data: ReloadStart<TestPersistence, TestModel>): void {}

  onReloadSuccess(_data: ReloadSuccess<TestPersistence, TestModel>): void {}

  onReloadError(_data: ReloadError<TestPersistence, TestModel>): void {}

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

  onLoadStart(_data: { config: LoadConfig; persistenceConfig?: any }): void {}

  onLoadSuccess(_data: {
    config: LoadConfig
    persistenceConfig?: any
    response: any
    added: TestModel[]
    removed: TestModel[]
  }): void {}

  onLoadError(_data: {
    config: LoadConfig
    persistenceConfig?: any
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

const cc = new TestCollection(new TestFactory(), new FetchPersistence(''))

const testModel = cc.create({ foo: 'a', bar: 'a' })

cc.save({ foo: 'a', bar: 'a' }).then((result) => {
  if (!result.error) {
    result.response.data
  }
})
