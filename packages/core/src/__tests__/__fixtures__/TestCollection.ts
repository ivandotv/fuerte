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
  override onReset(
    added: TestModel[],
    removed: TestModel[],
    fromLoad = false
  ): void {}

  override onRemoved(model: TestModel): void {}

  override onAdded(model: TestModel): void {}

  override onSaveSuccess(
    data: SaveSuccessCallback<TestModel, TestTransport>
  ): void {}

  override onSaveStart(
    data: SaveStartCallback<TestModel, TestTransport>
  ): void {}

  override onSaveError(
    data: SaveErrorCallback<TestModel, TestTransport>
  ): void {}

  override onDeleteStart(
    data: DeleteStartCallback<TestModel, TestTransport>
  ): void {}

  override onDeleteSuccess(
    data: DeleteSuccessCallback<TestModel, TestTransport>
  ): void {}

  override onDeleteError(
    data: DeleteErrorCallback<TestModel, TestTransport>
  ): void {}

  override onLoadStart(
    data: LoadStartCallback<TestModel, TestTransport>
  ): void {}

  override onLoadSuccess(
    data: LoadSuccessCallback<TestModel, TestTransport>
  ): void {}

  override onLoadError(
    data: LoadErrorCallback<TestModel, TestTransport>
  ): void {}

  override onSerialize() {}

  override onDestroy() {}
}
