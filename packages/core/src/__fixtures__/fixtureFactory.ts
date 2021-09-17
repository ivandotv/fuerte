import { createModelFactory } from '../factory/factory'
import {
  CollectionConfig,
  CollectionConfigWithAutoSave,
  Factory
} from '../utils/types'
import { TestCollection } from './TestCollection'
import { TestCollectionWithAutoSave } from './TestCollectionWithAutoSave'
import { testModelFactory, testModelFactoryAsync } from './TestFactory'
import { TestModel, TestModelData } from './TestModel'
import { TestTransport } from './TestTransport'

export function fixtureFactory() {
  return {
    model(data?: TestModelData): TestModel {
      return this.factory().create(data ? data : { foo: 'foo', bar: 'bar' })
    },
    factory() {
      return createModelFactory(testModelFactory)
    },
    factoryAsync() {
      return createModelFactory(testModelFactoryAsync)
    },
    collection(
      factory?: Factory<TestModel>,
      transport?: TestTransport,
      config?: CollectionConfig
    ) {
      // modelClass = modelClass || TestModel
      config = config || {}
      factory = factory || this.factory()
      transport = transport || this.transport()

      return new TestCollection(factory, transport, config)
    },
    collectionWithAutoSave(
      factory?: Factory<TestModel>,
      transport?: TestTransport,
      config?: CollectionConfigWithAutoSave
    ) {
      config = config || {}
      factory = factory || this.factory()
      transport = transport || this.transport()

      return new TestCollectionWithAutoSave(factory, transport, config)
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
