import { configure, makeObservable, observable } from 'mobx'
import { fixtureFactory } from '../../__fixtures__/fixtureFactory'
import { TestModel } from '../../__fixtures__/TestModel'

configure({ enforceActions: 'always' })

const fixtures = fixtureFactory()

let modelPool: any[]
beforeEach(() => {
  modelPool = []
  for (let index = 0; index < 10; index++) {
    const model = fixtures.model()
    modelPool.push(model)
  }
})

describe('Collection add models', () => {
  test('Add one model via "add" method', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()

    collection.add(model)

    expect(collection.models.length).toBe(1)
    expect(collection.models[0]).toBe(model)
  })
  test('Add models at the end via "push" method', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const firstBatch = modelPool.slice(0, 5)
    const secondBatch = modelPool.slice(5)

    collection.push(firstBatch)
    collection.push(secondBatch)

    expect(collection.models.slice(5)).toEqual(secondBatch)
  })

  test('Add models at the beginning', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const firstBatch = modelPool.slice(0, 5)
    const secondBatch = modelPool.slice(5)

    collection.unshift(firstBatch)
    collection.unshift(secondBatch)

    expect(collection.models.slice(0, 5)).toEqual(secondBatch)
  })
  test('Add models at specific index', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const firstBatch = modelPool.slice(0, 5)
    const secondBatch = modelPool.slice(5)

    const insertionIndex = 3
    collection.push(firstBatch)
    collection.addAtIndex(secondBatch, insertionIndex)

    const test = collection.models.slice(
      insertionIndex,
      insertionIndex + secondBatch.length
    )
    expect(test).toEqual(secondBatch)
  })
  test('Throw if index is bigger than the current count', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    const index = 1

    expect.assertions(1)
    try {
      collection.addAtIndex(model, index)
    } catch (e) {
      expect(e.message).toEqual(expect.stringContaining('out of bounds'))
    }
  })
  test('Throw if index is a negative integer', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    const index = -1

    expect.assertions(1)
    try {
      collection.addAtIndex(model, index)
    } catch (e) {
      expect(e.message).toEqual(expect.stringContaining('out of bounds'))
    }
  })
  test('Do not add models that already exist in the collection ', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const models = modelPool.slice(0, 5)

    collection.add(models)
    const result = collection.add(models)

    expect(result).toEqual([])
    expect(collection.models.length).toEqual(models.length)
  })

  test('If model is not an instance of Model class, throw', () => {
    const collection = fixtures.collection()
    const model = { id: 'test' }

    expect.assertions(1)
    try {
      // @ts-expect-error - model is not a real model
      const result = collection.add(model)
    } catch (err) {
      expect(err.message).toMatch(/not instance of Model class/)
    }
  })

  test('Do not add the model if "cid" is not unique', () => {
    const collection = fixtures.collection()
    const model = fixtures.model()

    collection.add(model)
    const result = collection.add(model)

    expect(result).toEqual([])
    expect(collection.models.length).toBe(1)
  })
  test('Do not add the model if key identifier is not unique', () => {
    const collection = fixtures.collection()
    const model = fixtures.model()
    const modelTwo = fixtures.model()

    model.setIdentity('1')
    modelTwo.setIdentity('1')

    collection.add(model)
    const result = collection.add(modelTwo)

    expect(result.length).toEqual(0)
    expect(collection.models.length).toBe(1)
  })

  test('Return models that where successfully added', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const models = modelPool.slice(0, 5)

    const result = collection.add(models)

    expect(result).toEqual(models)
  })

  test('When model is added it can be retrieved', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model({ foo: 'foo', bar: 'bar', id: '1' })

    collection.add(model)
    const found = collection.getByIdentity(model.identity)

    expect(found).toBe(model)
  })

  test('When models are added, "onAdded"  hook is called', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const models = modelPool.slice(0, 5)
    const onAddedSpy = jest.spyOn(collection, 'onAdded')

    collection.add(models)

    for (let i = 0; i < models.length; i++) {
      expect(onAddedSpy.mock.calls[i]).toEqual(
        expect.arrayContaining([models[i]])
      )
    }
    expect(onAddedSpy).toBeCalledTimes(models.length)
  })
  test('If nothing is added, no callbacks are being called', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const models = modelPool.slice(0, 5)
    collection.add(models)
    const onAddedSpy = jest.spyOn(collection, 'onAdded')

    collection.add(models)

    expect(onAddedSpy).toBeCalledTimes(0)
  })
  test('When model is in another collection it is removed from that collection', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const collectionTwo = fixtures.collection(fixtures.factory(), transport)
    const models = modelPool.slice(0, 5)
    const onRemovedSpy = jest.spyOn(collection, 'onRemoved')

    collection.add(models)
    collectionTwo.add(models)

    for (let i = 0; i < models.length; i++) {
      expect(onRemovedSpy.mock.calls[i]).toEqual(
        expect.arrayContaining([models[i]])
      )
    }
    expect(onRemovedSpy).toBeCalledTimes(models.length)
  })

  describe('React to model identity changes', () => {
    test('Track initial identity value setup', () => {
      const collection = fixtures.collection()
      const identity = 'original'
      const newIdentity = 'new value'

      class Test extends TestModel {
        isbn: string | undefined

        static identityKey = 'isbn'

        static setIdentityFromResponse = true

        constructor() {
          super()
          makeObservable(this, {
            isbn: observable
          })
        }
      }

      const model = new Test()
      collection.add(model)

      expect(collection.getByIdentity(newIdentity)).toBeUndefined()

      model.setIdentity(newIdentity)

      expect(collection.getByIdentity(newIdentity)).toBe(model)
    })

    test('Track identity value change', () => {
      const collection = fixtures.collection()
      const newIdentityValue = '123'

      class Test extends TestModel {
        constructor(public isbn: string) {
          super()
          makeObservable(this, {
            isbn: observable
          })
        }

        static identityKey = 'isbn'

        static setIdentityFromResponse = true
      }

      const model = new Test('1')
      collection.add(model)

      expect(collection.getByIdentity(model.identity)).toBe(model)

      model.setIdentity(newIdentityValue)
      expect(collection.getByIdentity(newIdentityValue)).toBe(model)
    })
  })
})
