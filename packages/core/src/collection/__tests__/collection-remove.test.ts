import { configure } from 'mobx'
import { fixtureFactory } from '../../__fixtures__/fixtureFactory'

configure({ enforceActions: 'observed' })

const fixtures = fixtureFactory()
let modelPool: any[]

beforeEach(() => {
  modelPool = []
  for (let index = 0; index < 10; index++) {
    const model = fixtures.model()
    modelPool.push(model)
  }
})

describe('Collection - remove #remove #collection', () => {
  test('Remove one model via id', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)

    const result = collection.remove(model.cid)

    expect(result[0]).toBe(model)
    expect(collection.models).toHaveLength(0)
  })

  test('Remove multiple models via id', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const modelOne = fixtures.model()
    const modelTwo = fixtures.model()
    collection.add([modelOne, modelTwo])

    const result = collection.remove([modelOne.cid, modelTwo.cid])

    expect(result).toEqual([modelOne, modelTwo])
    expect(collection.models).toHaveLength(0)
  })

  test('Remove one model via model instance', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)

    const result = collection.remove(model)

    expect(result[0]).toBe(model)
    expect(collection.models).toHaveLength(0)
  })

  test('Remove multiple models via model instances', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const modelOne = fixtures.model()
    const modelTwo = fixtures.model()
    collection.add([modelOne, modelTwo])

    const result = collection.remove([modelOne, modelTwo])

    expect(result).toEqual([modelOne, modelTwo])
    expect(collection.models).toHaveLength(0)
  })

  test('Remove the last model', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const modelOne = fixtures.model()
    const modelTwo = fixtures.model()
    collection.add([modelOne, modelTwo])

    const result = collection.pop()

    expect(result).toBe(modelTwo)
    expect(collection.models).toHaveLength(1)
  })

  test('If the collection is empty, removing last model returns undefined', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)

    const result = collection.pop()

    expect(result).toBeUndefined()
  })

  test('Remove the first model in the collection', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const modelOne = fixtures.model()
    const modelTwo = fixtures.model()
    collection.add([modelOne, modelTwo])

    const result = collection.shift()

    expect(result).toBe(modelOne)
    expect(collection.models).toHaveLength(1)
  })

  test('If the collection is empty, removing the first model returns undefined', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)

    const result = collection.shift()

    expect(result).toBeUndefined()
  })

  test('Remove the model at particular collection index', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const modelOne = fixtures.model()
    const modelTwo = fixtures.model()
    const modelThree = fixtures.model()
    collection.add([modelOne, modelTwo, modelThree])

    const result = collection.removeAtIndex(1)

    expect(result).toBe(modelTwo)
    expect(collection.models).toHaveLength(2)
    expect(collection.models).toEqual([modelOne, modelThree])
  })

  test('If index is out of bounds, return undefined', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const modelOne = fixtures.model()
    const modelTwo = fixtures.model()
    const modelThree = fixtures.model()
    collection.add([modelOne, modelTwo, modelThree])

    const result = collection.removeAtIndex(999)

    expect(result).toBeUndefined()
    expect(collection.models).toHaveLength(3)
  })

  describe('Callbacks', () => {
    test('When models are removed, removed callback is called', () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const models = modelPool.slice(0, 5)
      const onRemovedSpy = jest.spyOn(collection, 'onRemoved')

      collection.add(models)
      collection.remove(models)

      for (let i = 0; i < models.length; i++) {
        expect(onRemovedSpy.mock.calls[i]).toEqual(
          expect.arrayContaining([models[i]])
        )
      }
      expect(onRemovedSpy).toHaveBeenCalledTimes(models.length)
    })
    test('If nothing is removed, no callbacks are being called', () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const models = modelPool.slice(0, 5)
      const onRemovedSpy = jest.spyOn(collection, 'onRemoved')

      collection.add(models)
      collection.remove('fake_cid')

      expect(onRemovedSpy).not.toHaveBeenCalled()
    })
  })
})
