import { configure } from 'mobx'
import { CollectionConfig } from '../../utils/types'
import { fixtureFactory } from '../../__fixtures__/fixtureFactory'
import { TestModel } from '../../__fixtures__/TestModel'

configure({ enforceActions: 'always' })

const fixtures = fixtureFactory()

describe('Collection', () => {
  test('Pass in custom collection configuration', () => {
    const customConfig: CollectionConfig = {
      autoSave: {
        enabled: true
      },
      add: {
        insertPosition: 'start'
      },
      load: {
        insertPosition: 'start'
      },
      save: {
        insertPosition: 'start'
      },
      delete: { removeOnError: true },
      reload: { removeOnError: true }
    }

    const collection = fixtures.collection(undefined, undefined, customConfig)

    expect(collection.getConfig()).toMatchObject(customConfig)
  })

  test('Can retrieve passed in transport', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(undefined, transport)
    expect(collection.getTransport()).toBe(transport)
  })

  test('Create model via create method', () => {
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
    const modelTwo = fixtures.model()

    collection.add([model, modelTwo])

    expect(collection.newModels).toEqual([model, modelTwo])
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

      const result = collection.getByIdentity(id)

      expect(result).toBe(model)
    })

    test('Get multiple models by identity', () => {
      const collection = fixtures.collection()
      const id = 'new-id'
      const idTwo = 'new-id-2'
      const model = fixtures.model({ foo: 'foo', bar: 'bar', id })
      const modelTwo = fixtures.model({ foo: 'foo', bar: 'bar', id: idTwo })

      collection.add([model, modelTwo])

      const result = collection.getByIdentity([id, idTwo])

      expect(result).toStrictEqual([model, modelTwo])
    })

    test('When look for one model, if not present, return undefined', () => {
      const collection = fixtures.collection()
      const id = 'new-id'

      const result = collection.getByIdentity(id)

      expect(result).toBeUndefined()
    })

    test('If there are no models , return empty array', () => {
      const collection = fixtures.collection()
      const id = 'new-id'
      const idTwo = 'new-id-2'

      const result = collection.getByIdentity([id, idTwo])

      expect(result).toStrictEqual([])
    })
  })
  describe('Get by cid', () => {
    test('Get one model by cid', () => {
      const collection = fixtures.collection()
      const model = fixtures.model()

      collection.add(model)

      const result = collection.getByCid(model.cid)

      expect(result).toBe(model)
    })

    test('Get multiple models by cid', () => {
      const collection = fixtures.collection()
      const model = fixtures.model()
      const modelTwo = fixtures.model()

      collection.add([model, modelTwo])

      const result = collection.getByCid([model.cid, modelTwo.cid])

      expect(result).toStrictEqual([model, modelTwo])
    })

    test('When look for one model, if not present, return undefined', () => {
      const collection = fixtures.collection()

      const cid = 'c123'
      const result = collection.getByCid(cid)

      expect(result).toBeUndefined()
    })

    test('If there are no models , return empty array', () => {
      const collection = fixtures.collection()
      const cid = 'new-id'
      const cidTwo = 'new-id-2'

      const result = collection.getByIdentity([cid, cidTwo])

      expect(result).toStrictEqual([])
    })
  })
})
