import { CollectionConfig } from '../utils/types'
import { TestCollection } from './TestCollection'
import { TestFactory } from './TestFactory'
import { TestModel, TestModelData } from './TestModel'
import { TestTransport } from './TestTransport'

// eslint-disable-next-line
export function fixtureFactory() {
  return {
    model(data?: TestModelData): TestModel {
      return new TestModel(data?.foo, data?.bar, data?.id)
    },
    factory(): TestFactory {
      return new TestFactory()
    },
    collection(
      factory?: TestFactory,
      transport?: TestTransport,
      config?: CollectionConfig
    ) {
      // modelClass = modelClass || TestModel
      config = config || {}
      factory = factory || this.factory()
      transport = transport || this.transport()

      return new TestCollection(factory, transport, config)
    },
    transport(): TestTransport {
      return new TestTransport()
    },
    rawModelData: [
      { foo: '1', bar: '1', id: '1' },
      { foo: '2', bar: '2', id: '2' },
      { foo: '3', bar: '3', id: '3' },
      { foo: '4', bar: '4', id: '4' },
      { foo: '5', bar: '5', id: '5' }
    ]
  }
}
