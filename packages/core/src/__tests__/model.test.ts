import { configure } from 'mobx'
import { fixtureFactory } from './__fixtures__/fixtureFactory'
import { TestModel } from './__fixtures__/TestModel'

configure({ enforceActions: 'never' })

const fixtures = fixtureFactory()

beforeAll(() => {
  TestModel.identityKey = 'id'
})

describe('Model #model', () => {
  describe('When the model is created', () => {
    test('It is new', () => {
      const model = fixtures.model()
      expect(model.isNew).toBe(true)
    })

    test('It is not syncing', () => {
      const model = fixtures.model()
      expect(model.isSyncing).toBe(false)
    })

    test('It has no transport errors', () => {
      const model = fixtures.model()
      expect(model.hasErrors).toBe(false)
    })

    test('It is not deleted', () => {
      const model = fixtures.model()
      expect(model.isDeleted).toBe(false)
    })

    test('It is not dirty', () => {
      const model = fixtures.model()
      expect(model.isDirty).toBe(false)
    })
  })

  test('calling model.save proxies the call to collection.save', async () => {
    const transport = fixtures.transport()
    const transportConfg = 'config'
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    const transportSaveSpy = jest.spyOn(transport, 'save')
    collection.add(model)

    await model.save(transportConfg)

    expect(transportSaveSpy).toHaveBeenCalledTimes(1)
    expect(transportSaveSpy).toHaveBeenCalledWith(model, transportConfg)
    expect(collection.getByIdentity(model.identity)).toBe(model)
  })

  test('calling model.save will throw if the model is not a part of the collection', async () => {
    const model = fixtures.model()

    await expect(model.save(undefined)).rejects.toThrow(
      'not part of the collection'
    )
  })

  test('calling model.delete proxies the call to collection.delete', async () => {
    const transport = fixtures.transport()
    const transportConfg = 'config'
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    const transportDeleteSpy = jest.spyOn(transport, 'delete')

    await collection.save(model)

    await model.delete(transportConfg)

    expect(transportDeleteSpy).toHaveBeenCalledTimes(1)
    expect(transportDeleteSpy).toHaveBeenCalledWith(model, transportConfg)
    expect(collection.models).toHaveLength(0)
  })

  test('when there is a delete error, it can be retrieved later from the model', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()

    const errorResponse = 'internal_server_error'
    jest
      .spyOn(transport, 'delete')
      .mockImplementation(() => Promise.reject(errorResponse))
    await collection.save(model)

    await model.delete(undefined)

    expect(model.deleteError).toBe(errorResponse)
    expect(model.hasErrors).toBe(true)
  })

  test('calling model.delete will throw if the model is not a part of the collection', async () => {
    const model = fixtures.model()

    await expect(model.delete(undefined)).rejects.toThrow(
      'not part of the collection'
    )
  })

  test('retrieve the collection from the model', () => {
    const collection = fixtures.collection()
    const model = fixtures.model()

    collection.add(model)

    expect(model.getCollection()).toBe(collection)
  })

  test('model "isNew" property can be changed', () => {
    const model = fixtures.model()

    model.setIsNew(false)

    expect(model.isNew).toBe(false)
  })

  test('model toJSON method equals model payload', () => {
    const model = fixtures.model()

    expect(model.toJSON()).toBe(model.payload)
  })
})
