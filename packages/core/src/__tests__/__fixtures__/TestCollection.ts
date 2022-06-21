import { Collection } from '../../collection/Collection'
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
} from '../../types'
import { testModelFactory } from './TestFactory'
import { TestModel } from './TestModel'
import { TestTransport } from './TestTransport'

export class TestCollection extends Collection<
  TestModel,
  typeof testModelFactory,
  TestTransport
> {
  onReset(added: TestModel[], removed: TestModel[], fromLoad = false): void {}

  onRemoved(model: TestModel): void {}

  onAdded(model: TestModel): void {}

  onSaveSuccess(data: SaveSuccessCallback<TestModel, TestTransport>): void {}

  onSaveStart(data: SaveStartCallback<TestModel, TestTransport>): void {}

  onSaveError(data: SaveErrorCallback<TestModel, TestTransport>): void {}

  onDeleteStart(data: DeleteStartCallback<TestModel, TestTransport>): void {}

  onDeleteSuccess(
    data: DeleteSuccessCallback<TestModel, TestTransport>
  ): void {}

  onDeleteError(data: DeleteErrorCallback<TestModel, TestTransport>): void {}

  onLoadStart(data: LoadStartCallback<TestModel, TestTransport>): void {}

  onLoadSuccess(data: LoadSuccessCallback<TestModel, TestTransport>): void {}

  onLoadError(data: LoadErrorCallback<TestModel, TestTransport>): void {}

  onSerialize() {}

  onDestroy() {}
}
