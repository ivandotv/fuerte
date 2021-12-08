import { configure, makeObservable, observable } from 'mobx'
import { fixtureFactory } from './__fixtures__/fixtureFactory'
import { TestModel } from './__fixtures__/TestModel'

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

describe('Collection - add #add #collection', () => {
  test('Add single model', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()

    const addedModel = collection.add(model)

    expect(collection.models).toHaveLength(1)
    expect(collection.models[0]).toBe(model)
    expect(addedModel).toBe(model)
  })

  test('When adding a single model, return undefined if the model is already in the collection', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()

    collection.add(model)

    const addedModel = collection.add(model)

    expect(collection.models).toHaveLength(1)
    expect(collection.models[0]).toBe(model)
    expect(addedModel).toBeUndefined()
  })

  test('Add models at the end of the collection', () => {
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

    expect(
      collection.models.slice(
        insertionIndex,
        insertionIndex + secondBatch.length
      )
    ).toEqual(secondBatch)
  })

  test('Throw if trying to add at index that is bigger than the current count', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    const index = 1

    expect(() => collection.addAtIndex(model, index)).toThrow('out of bounds')
  })

  test('Throw if trying to add at negative index.', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    const index = -1

    expect(() => collection.addAtIndex(model, index)).toThrow('out of bounds')
  })

  test('Do not add models that already exist in the collection', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const models = modelPool.slice(0, 5)
    collection.add(models)

    const result = collection.add(models)

    expect(result).toEqual([])
    expect(collection.models).toHaveLength(models.length)
  })

  test('If the model is not an instance of the Model class, throw', () => {
    const collection = fixtures.collection()
    const model = { id: 'test' }

    // @ts-expect-error - model is not a real model
    expect(() => collection.add(model)).toThrow(/not instance of Model class/)
  })

  test('Do not add the model if the client id is not unique', () => {
    const collection = fixtures.collection()
    const model = fixtures.model()

    collection.add(model)
    const result = collection.add(model)

    expect(result).toBeUndefined()
    expect(collection.models).toHaveLength(1)
  })

  test('Do not add the model if identity key is not unique', () => {
    const collection = fixtures.collection()
    const model = fixtures.model()
    const modelTwo = fixtures.model()
    model.setIdentity('1')
    modelTwo.setIdentity('1')

    collection.add(model)
    const result = collection.add(modelTwo)

    expect(result).toBeUndefined()
    expect(collection.models).toHaveLength(1)
  })

  test('Return all the models that where successfully added', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const models = modelPool.slice(0, 5)

    const result = collection.add(models)

    expect(result).toEqual(models)
  })

  test('Retrieve the added model', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model({ foo: 'foo', bar: 'bar', id: '1' })

    collection.add(model)
    const found = collection.getById(model.identity)

    expect(found).toBe(model)
  })

  test('When models are added, added hook is called', () => {
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
    expect(onAddedSpy).toHaveBeenCalledTimes(models.length)
  })

  test('If nothing is added, no callbacks are called', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const models = modelPool.slice(0, 5)
    collection.add(models)
    const onAddedSpy = jest.spyOn(collection, 'onAdded')

    collection.add(models)

    expect(onAddedSpy).toHaveBeenCalledTimes(0)
  })

  describe('React to model identity changes', () => {
    test('Get model by custom identity key', () => {
      const collection = fixtures.collection()
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

      expect(collection.getById(newIdentity)).toBeUndefined()

      model.setIdentity(newIdentity)

      expect(collection.getById(newIdentity)).toBe(model)
    })

    test('When model identity changes, get the model by new identity value', () => {
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

      expect(collection.getById(model.identity)).toBe(model)

      model.setIdentity(newIdentityValue)
      expect(collection.getById(newIdentityValue)).toBe(model)
    })
  })
})
