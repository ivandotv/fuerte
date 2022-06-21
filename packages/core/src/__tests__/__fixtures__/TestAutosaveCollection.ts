import { AutosaveCollection } from '../../collection/AutosaveCollection'
import { testModelFactory } from './TestFactory'
import { TestModel } from './TestModel'
import { TestTransport } from './TestTransport'

export class TestAutosaveCollection extends AutosaveCollection<
  TestModel,
  typeof testModelFactory,
  TestTransport
> {
  override autoSave(payload: { model: TestModel; data: any }): void {
    return super.autoSave(payload)
  }

  override onStartAutoSave(models: TestModel[]): void {}

  override onStopAutoSave(models: TestModel[]): void {}
}
