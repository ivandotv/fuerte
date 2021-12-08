import { CollectionConfig, LiteCollectionConfig } from '../../utils/types'
import { TestCollection } from './TestCollection'
import { testModelFactory, testModelFactoryAsync } from './TestFactory'
import { TestLiteCollection } from './TestLiteCollection'
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
    factoryAsync() {
      return testModelFactoryAsync
    },
    liteCollection(
      factory?: typeof testModelFactory,
      config?: LiteCollectionConfig
    ) {
      config = config || {}
      factory = factory || this.factory()

      return new TestLiteCollection(factory, config)
    },
    collection(
      factory?: typeof testModelFactory,
      transport?: TestTransport,
      config?: CollectionConfig
    ) {
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
