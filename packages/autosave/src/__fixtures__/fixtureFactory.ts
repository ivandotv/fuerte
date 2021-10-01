import { AutosaveCollectionConfig } from '../utils/types'
import { TestAutosaveCollection } from './TestAutosaveCollection'
import { testModelFactory } from './TestFactory'
import { TestModel, TestModelData } from './TestModel'
import { TestTransport } from './TestTransport'

export function fixtureFactory() {
  return {
    model(data?: TestModelData): TestModel {
      return this.collection().create(data ? data : { foo: 'foo', bar: 'bar' })
    },
    factory() {
      return testModelFactory
    },
    collection(
      factory?: typeof testModelFactory,
      transport?: TestTransport,
      config?: AutosaveCollectionConfig
    ) {
      config = config || {}
      factory = factory || this.factory()
      transport = transport || this.transport()

      return new TestAutosaveCollection(factory, transport, config)
    },
    transport(): TestTransport {
      return new TestTransport()
    }
  }
}
