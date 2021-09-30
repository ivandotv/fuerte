import { configure } from 'mobx'
import { CollectionConfig } from '../../utils/types'
import { fixtureFactory } from '../../__fixtures__/fixtureFactory'
import { testModelFactoryAsync } from '../../__fixtures__/TestFactory'
import { TestModel } from '../../__fixtures__/TestModel'
import { Collection } from '../Collection'

configure({ enforceActions: 'always' })

const fixtures = fixtureFactory()

describe('Collection #collection', () => {
  test('Pass in and retrieve the custom configuration object', () => {
    const customConfig: CollectionConfig = {
      add: {
        insertPosition: 'start'
      },
      load: {
        insertPosition: 'start'
      },
      save: {
        insertPosition: 'start'
      },
      delete: { removeOnError: true }
    }
    const collection = fixtures.collection(undefined, undefined, customConfig)

    expect(collection.getConfig()).toMatchObject(customConfig)
  })

  test('Can retrieve passed in transport object', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(undefined, transport)
    expect(collection.getTransport()).toBe(transport)
  })

  test('Create the model synchronously', () => {
    const collection = fixtures.collection()
    const modelData = { foo: 'new foo', bar: 'new bar', id: 'new id' }

    const model = collection.create(modelData)

    expect(model).toBeInstanceOf(TestModel)
    expect(model.foo).toBe(modelData.foo)
    expect(model.bar).toBe(modelData.bar)
    expect(model.id).toBe(modelData.id)
  })

  test('Create the model assynchronously', async () => {
    class AsyncCollection extends Collection<
      TestModel,
      typeof testModelFactoryAsync,
      any
    > {}

    const collection = new AsyncCollection(
      testModelFactoryAsync,
      fixtures.transport()
    )
    const modelData = { foo: 'new foo', bar: 'new bar', id: 'new id' }

    const model = await collection.create(modelData)

    expect(model).toBeInstanceOf(TestModel)
    expect(model.foo).toBe(modelData.foo)
    expect(model.bar).toBe(modelData.bar)
    expect(model.id).toBe(modelData.id)
  })
  test('Create the model via the create method', () => {
    const collection = fixtures.collection()
    const modelData = { foo: 'new foo', bar: 'new bar', id: 'new id' }

    const model = collection.create(modelData)

    expect(model).toBeInstanceOf(TestModel)
    expect(model.foo).toBe(modelData.foo)
    expect(model.bar).toBe(modelData.bar)
    expect(model.id).toBe(modelData.id)
  })

  test('Retrieve new models', () => {
    const collection = fixtures.collection()
    const model = fixtures.model()
    const modelTwo = fixtures.model({ foo: 'foo', bar: 'bar' })
    collection.add([model, modelTwo])

    expect(collection.new).toEqual([model, modelTwo])
  })

  test('Serialize collection', () => {
    const collection = fixtures.collection()
    const model = fixtures.model({ foo: '1', bar: '1', id: '1' })
    const modelTwo = fixtures.model({ foo: '2', bar: '2', id: '2' })
    collection.add([model, modelTwo])

    const result = collection.serialize()

    expect(result).toStrictEqual({ models: [model.payload, modelTwo.payload] })
  })

  test('Destroy the collection', () => {
    const collection = fixtures.collection()
    const model = fixtures.model()
    const modelTwo = fixtures.model()
    const modelDestroySpy = jest.spyOn(model, 'destroy')
    const modelTwoDestroySpy = jest.spyOn(model, 'destroy')
    const collectionOnDestroySpy = jest.spyOn(collection, 'onDestroy')
    collection.add([model, modelTwo])

    collection.destroy()

    expect(modelDestroySpy).toHaveBeenCalledTimes(1)
    expect(modelTwoDestroySpy).toHaveBeenCalledTimes(1)
    expect(collectionOnDestroySpy).toHaveBeenCalledTimes(1)
    expect(collection.models).toHaveLength(0)
  })

  describe('Get by identity', () => {
    test('Get one model by identity', () => {
      const collection = fixtures.collection()
      const id = 'new-id'
      const model = fixtures.model({ foo: 'foo', bar: 'bar', id })

      collection.add(model)

      const result = collection.getById(id)

      expect(result).toBe(model)
    })

    test('Get multiple models by identity', () => {
      const collection = fixtures.collection()
      const id = 'new-id'
      const idTwo = 'new-id-2'
      const model = fixtures.model({ foo: 'foo', bar: 'bar', id })
      const modelTwo = fixtures.model({ foo: 'foo', bar: 'bar', id: idTwo })

      collection.add([model, modelTwo])

      const result = collection.getById([id, idTwo])

      expect(result).toStrictEqual([model, modelTwo])
    })

    test('When querying for wrong model by identity, return undefined', () => {
      const collection = fixtures.collection()
      const id = 'new-id'

      const result = collection.getById(id)

      expect(result).toBeUndefined()
    })

    test('When querying for multiple models by identity, if none found, return empty array', () => {
      const collection = fixtures.collection()
      const id = 'new-id'
      const idTwo = 'new-id-2'

      const result = collection.getById([id, idTwo])

      expect(result).toStrictEqual([])
    })
  })
})
