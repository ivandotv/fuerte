import { BulkCollection } from '../bulk-collection/BulkCollection'
import {
  CollectionConfig,
  SaveConfig,
  ReloadConfig,
  DeleteConfig
} from '../utils/types'
import { TestBulkPersistence } from './BulkTestPersistance'
import { TestFactory } from './TestFactory'
import { TestModel } from './TestModel'

export class TestBulkCollection extends BulkCollection<
  TestModel,
  TestBulkPersistence,
  TestFactory
> {
  constructor(
    factory: TestFactory,
    transport: TestBulkPersistence,
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
    saveConfig: SaveConfig
    transportConfig: any
  }): void {}

  onSaveStart(_data: {
    model: TestModel
    saveConfig: SaveConfig
    transportConfig: any
  }): void {}

  onReloadSuccess(_data: {
    model: TestModel
    response: any
    data: any
    reloadConfig: ReloadConfig
    transportConfig: any
  }): void {}

  onDeleteSuccess(_data: {
    model: TestModel
    response: any
    deleteConfig: DeleteConfig
    transportConfig: any
  }): void {}

  onDeleteError(_data: {
    model: TestModel
    error: any
    deleteConfig: DeleteConfig
    transportConfig: any
  }): void {}

  onBulkSaveStart(_data: {
    models: TestModel[]
    saveConfig: SaveConfig
    transportConfig: any
  }): void {}

  onBulkSaveSuccess(_data: {
    models: TestModel[]
    response: any
    saveConfig: SaveConfig
    transportConfig: any
  }): void {}

  onBulkSaveError(_data: {
    models: TestModel[]
    error: any
    saveConfig: SaveConfig
    transportConfig: any
  }): void {}

  onBulkReloadStart(_data: {
    models: TestModel[]
    reloadConfig: ReloadConfig
    transportConfig: any
  }): void {}

  onBulkReloadSuccess(_data: {
    models: TestModel[]
    response: any
    reloadConfig: ReloadConfig
    transportConfig: any
  }): void {}

  onBulkReloadError(_data: {
    models: TestModel[]
    error: any
    reloadConfig: ReloadConfig
    transportConfig: any
  }): void {}
}

// const tt = new TestFactory()
// const ttModel = tt.create({ foo: 'a', bar: 'a' })

// const cc = new TestCollection(new TestFactory(), new TestPersistence())

// const testModel = cc.create({ foo: 'a', bar: 'a' })

// cc.save({ foo: 'a', bar: 'a' })
