import { CollectionWithAutoSave } from '../collection/CollectionWithAutoSave'
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

export class TestCollectionWithAutoSave extends CollectionWithAutoSave<
  TestModel,
  TestFactory,
  TestTransport
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

  onReset(added: TestModel[], removed: TestModel[], fromLoad = false): void {
    super.onReset(added, removed)
  }

  onRemoved(model: TestModel): void {
    super.onRemoved(model)
  }

  onAdded(model: TestModel): void {
    super.onAdded(model)
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
