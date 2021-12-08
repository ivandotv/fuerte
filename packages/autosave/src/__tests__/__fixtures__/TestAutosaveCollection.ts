import { AutosaveCollection } from '../../AutosaveCollection'
import { testModelFactory } from './TestFactory'
import { TestModel } from './TestModel'
import { TestTransport } from './TestTransport'

export class TestAutosaveCollection extends AutosaveCollection<
  TestModel,
  typeof testModelFactory,
  TestTransport
> {
  autoSave(payload: { model: TestModel; data: any }): void {
    return super.autoSave(payload)
  }

  onStartAutoSave(models: TestModel[]): void {
    super.onStartAutoSave(models)
  }

  onStopAutoSave(models: TestModel[]): void {
    super.onStopAutoSave(models)
  }
}
