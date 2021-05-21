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

describe('Collection remove models', () => {
  test('Remove one model via "cid"', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()

    collection.add(model)
    const result = collection.remove(model.cid)

    expect(result[0]).toBe(model)
    expect(collection.models.length).toBe(0)
  })
  test('Remove multiple models via "cid"', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const modelOne = fixtures.model()
    const modelTwo = fixtures.model()

    collection.add([modelOne, modelTwo])
    const result = collection.remove([modelOne.cid, modelTwo.cid])

    expect(result).toEqual([modelOne, modelTwo])
    expect(collection.models.length).toBe(0)
  })
  test('Remove one model via model instance', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()

    collection.add(model)
    const result = collection.remove(model)

    expect(result[0]).toBe(model)
    expect(collection.models.length).toBe(0)
  })
  test('Remove multiple models via model instances', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const modelOne = fixtures.model()
    const modelTwo = fixtures.model()

    collection.add([modelOne, modelTwo])
    const result = collection.remove([modelOne, modelTwo])

    expect(result).toEqual([modelOne, modelTwo])
    expect(collection.models.length).toBe(0)
  })
  test('Remove via "pop"', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const modelOne = fixtures.model()
    const modelTwo = fixtures.model()

    collection.add([modelOne, modelTwo])
    const result = collection.pop()

    expect(result).toBe(modelTwo)
    expect(collection.models.length).toBe(1)
  })
  test('If the collection is empty, "pop" returns undefined', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)

    const result = collection.pop()

    expect(result).toBeUndefined()
  })
  test('Remove via "shift"', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const modelOne = fixtures.model()
    const modelTwo = fixtures.model()

    collection.add([modelOne, modelTwo])
    const result = collection.shift()

    expect(result).toBe(modelOne)
    expect(collection.models.length).toBe(1)
  })
  test('If the collection is empty, "shift" returns undefined', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)

    const result = collection.shift()

    expect(result).toBeUndefined()
  })

  test('Remove at particular index', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const modelOne = fixtures.model()
    const modelTwo = fixtures.model()
    const modelThree = fixtures.model()
    collection.add([modelOne, modelTwo, modelThree])

    const result = collection.removeAtIndex(1)

    expect(result).toBe(modelTwo)
    expect(collection.models.length).toBe(2)
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

    expect(result).toBe(undefined)
    expect(collection.models.length).toBe(3)
  })

  describe('Callbacks ', () => {
    test('When models are removed, "onRemoved"  hook is called', () => {
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
      expect(onRemovedSpy).toBeCalledTimes(models.length)
    })
    test('If nothing is removed, no callbacks are being called', () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const models = modelPool.slice(0, 5)
      const onRemovedSpy = jest.spyOn(collection, 'onRemoved')

      collection.add(models)
      collection.remove('fake_cid')

      expect(onRemovedSpy).not.toBeCalled()
    })
  })
})
