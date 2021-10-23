import { LiteCollection } from '../collection/LiteCollection'
import { testModelFactory } from './TestFactory'
import { TestModel } from './TestModel'

export class TestLiteCollection extends LiteCollection<
  TestModel,
  typeof testModelFactory
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

  onSerialize() {
    super.onSerialize()
  }

  onDestroy() {
    super.onDestroy()
  }
}
