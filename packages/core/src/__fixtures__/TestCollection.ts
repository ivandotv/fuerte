import { Collection } from '../collection/Collection'
import {
  DeleteErrorCallback,
  DeleteStartCallback,
  DeleteSuccessCallback,
  LoadErrorCallback,
  LoadStartCallback,
  LoadSuccessCallback,
  SaveErrorCallback,
  SaveStartCallback,
  SaveSuccessCallback
} from '../utils/types'
import { testModelFactory } from './TestFactory'
import { TestModel } from './TestModel'
import { TestTransport } from './TestTransport'

export class TestCollection extends Collection<
  TestModel,
  typeof testModelFactory,
  TestTransport
> {
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

  onSaveSuccess(data: SaveSuccessCallback<TestModel, TestTransport>): void {
    super.onSaveSuccess(data)
  }

  onSaveStart(data: SaveStartCallback<TestModel, TestTransport>): void {
    super.onSaveStart(data)
  }

  onSaveError(data: SaveErrorCallback<TestModel, TestTransport>): void {
    super.onSaveError(data)
  }

  onDeleteStart(data: DeleteStartCallback<TestModel, TestTransport>): void {
    super.onDeleteStart(data)
  }

  onDeleteSuccess(data: DeleteSuccessCallback<TestModel, TestTransport>): void {
    super.onDeleteSuccess(data)
  }

  onDeleteError(data: DeleteErrorCallback<TestModel, TestTransport>): void {
    super.onDeleteError(data)
  }

  onLoadStart(data: LoadStartCallback<TestModel, TestTransport>): void {
    super.onLoadStart(data)
  }

  onLoadSuccess(data: LoadSuccessCallback<TestModel, TestTransport>): void {
    super.onLoadSuccess(data)
  }

  onLoadError(data: LoadErrorCallback<TestModel, TestTransport>): void {
    super.onLoadError(data)
  }

  onSerialize() {
    super.onSerialize()
  }

  onDestroy() {
    super.onDestroy()
  }
}
