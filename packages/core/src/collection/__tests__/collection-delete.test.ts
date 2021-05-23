import { configure } from 'mobx'
import { DeleteConfig } from '../../utils/types'
import { fixtureFactory } from '../../__fixtures__/fixtureFactory'

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

describe('Collection - delete models', () => {
  test('Delete model', async () => {
    const transport = fixtures.transport()
    const model = fixtures.model()
    const collection = fixtures.collection(fixtures.factory(), transport)
    collection.add(model)

    await collection.delete(model)

    expect(collection.models).toHaveLength(0)
  })

  test('Delete model, but leave it in collection', async () => {
    const transport = fixtures.transport()
    const model = fixtures.model()
    const collection = fixtures.collection(fixtures.factory(), transport)
    collection.add(model)

    await collection.delete(model, { remove: false })

    expect(collection.models).toStrictEqual([model])
    expect(model.isDeleted).toBe(true)
    expect(collection.deletedModels).toStrictEqual([model])
  })

  test('When delete is in progress, can retrieve all models that are deleting', async () => {
    const transport = fixtures.transport()
    const model = fixtures.model()
    const modelTwo = fixtures.model()
    const collection = fixtures.collection(fixtures.factory(), transport)
    collection.add(model)
    collection.add(modelTwo)

    const p1 = collection.delete(model)
    const p2 = collection.delete(modelTwo)

    expect(collection.modelsDeleting).toEqual([model, modelTwo])
    expect(collection.modelsSyncing).toEqual([model, modelTwo])

    await Promise.all([p1, p2])

    expect(collection.modelsDeleting).toHaveLength(0)
    expect(collection.modelsSyncing).toHaveLength(0)
  })

  test('Delete returns object with response and model that was deleted', async () => {
    const transport = fixtures.transport()
    const response = { data: 'deleted' }
    jest.spyOn(transport, 'delete').mockResolvedValue(response)
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)

    const result = await collection.delete(model)

    expect(result).toEqual({ response, model })
  })

  test('When the model is in the process of deleting, "modelsDeleting" property reflects that', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)

    const result = collection.delete(model)
    expect(collection.modelsDeleting.length).toBe(1)
    expect(collection.modelsDeleting[0]).toBe(model)

    await result

    expect(collection.modelsDeleting.length).toBe(0)
  })

  test('Throw if model is already deleted ', async () => {
    const transport = fixtures.transport()
    const response = { data: 'deleted' }
    jest.spyOn(transport, 'delete').mockResolvedValue(response)
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)

    await collection.delete(model)
    expect.assertions(1)
    try {
      collection.add(model)
      await collection.delete(model)
    } catch (e) {
      expect(e.message.toLowerCase()).toMatch(/model is deleted/)
    }
  })
  test('Throw if model is in the process of deleting ', async () => {
    const transport = fixtures.transport()
    const response = { data: 'deleted' }
    jest.spyOn(transport, 'delete').mockResolvedValue(response)
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)

    collection.delete(model, { removeImmediately: false })
    expect.assertions(1)
    try {
      await collection.delete(model)
    } catch (e) {
      expect(e.message.toLowerCase()).toMatch(
        /model is in the process of deleting/
      )
    }
  })
  test('When model is removed from the collection before delete process starts, "onRemoved" model hook is called', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    const modelOnRemovedSpy = jest.spyOn(model, 'onRemoved')
    collection.add(model)

    collection.delete(model)
    expect(modelOnRemovedSpy).toBeCalled()
  })

  test('If the model is not in the collection throw errror', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()

    expect.assertions(1)
    try {
      await collection.delete(model)
    } catch (err) {
      expect(err.message).toMatch(/not in the collection/)
    }
  })

  describe('Callbacks', () => {
    test('On delete start, start callbacks are called', async () => {
      const transport = fixtures.transport()
      const model = fixtures.model()
      const response = { data: 'deleted' }
      const transportConfig = 'config'

      const config: DeleteConfig = {
        remove: true,
        removeImmediately: false,
        removeOnError: false
      }
      const collection = fixtures.collection(fixtures.factory(), transport)

      collection.add(model)
      jest
        .spyOn(transport, 'delete')
        .mockImplementation(() => Promise.resolve(response))

      // @ts-expect-error - protected method
      const onDeleteStartSpy = jest.spyOn(collection, 'onDeleteStart')
      const modelDeleteStartSpy = jest.spyOn(model, 'onDeleteStart')

      await collection.delete(model, config, transportConfig)
      expect(onDeleteStartSpy).toBeCalledWith({
        model,
        config,
        transportConfig
      })
      expect(modelDeleteStartSpy).toBeCalledWith({
        config,
        transportConfig
      })
    })
    test('On delete success, success callbacks are called', async () => {
      const transport = fixtures.transport()
      const model = fixtures.model()
      const response = { data: 'deleted' }

      const config: DeleteConfig = {
        remove: true,
        removeImmediately: false,
        removeOnError: false
      }
      const transportConfig = 'config'
      const collection = fixtures.collection(fixtures.factory(), transport)
      collection.add(model)
      const onDeleteSuccessSpy = jest.spyOn(collection, 'onDeleteSuccess')
      const modelOnDeleteSuccessSpy = jest.spyOn(model, 'onDeleteSuccess')
      jest
        .spyOn(transport, 'delete')
        .mockImplementation(() => Promise.resolve(response))

      await collection.delete(model, config, transportConfig)
      expect(onDeleteSuccessSpy).toBeCalledWith({
        model,
        response,
        config,
        transportConfig
      })
      expect(modelOnDeleteSuccessSpy).toBeCalledWith({
        response,
        config,
        data: response.data,
        transportConfig
      })
    })

    test('On delete error, all error callbacks are called', async () => {
      const transport = fixtures.transport()
      const model = fixtures.model()
      const response = { data: 'deleted' }
      const transportConfig = 'config'
      const config: DeleteConfig = {
        remove: true,
        removeImmediately: false,
        removeOnError: false
      }
      const collection = fixtures.collection(fixtures.factory(), transport)
      const onDeleteErrorSpy = jest.spyOn(collection, 'onDeleteError')
      const modelOnDeleteErrorSpy = jest.spyOn(model, 'onDeleteError')
      collection.add(model)
      jest
        .spyOn(transport, 'delete')
        .mockImplementation(() => Promise.reject(response))

      const { error } = await collection.delete(model, config, transportConfig)

      expect(onDeleteErrorSpy).toBeCalledWith({
        model,
        error,
        transportConfig,
        config
      })
      expect(modelOnDeleteErrorSpy).toBeCalledWith({
        error,
        config,
        data: response.data,
        transportConfig
      })
    })
  })

  describe('Delayed insertion in the collection', () => {
    test('When model is successfuly deleted, "onRemoved" model hook is called', async () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()
      const modelOnRemovedSpy = jest.spyOn(model, 'onRemoved')
      collection.add(model)

      const result = collection.delete(model, { removeImmediately: false })
      expect(modelOnRemovedSpy).not.toBeCalled()
      await result
      expect(modelOnRemovedSpy).toBeCalled()
    })
    test('When the model is in the process of deleting, "modelsDeleting" property reflects that', async () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()
      collection.add(model)

      const result = collection.delete(model)
      expect(collection.modelsDeleting.length).toBe(1)
      expect(collection.modelsDeleting[0]).toBe(model)

      await result

      expect(collection.modelsDeleting.length).toBe(0)
    })
    test('After successful deletion, remove model from the collection', async () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()
      collection.add(model)

      const result = collection.delete(model, { removeImmediately: false })

      expect(collection.models.length).toBe(1)
      await result
      expect(collection.models.length).toBe(0)
    })

    test('After failed deletion, remove the model', async () => {
      const transport = fixtures.transport()
      jest.spyOn(transport, 'delete').mockImplementation(() => Promise.reject())
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()
      collection.add(model)

      await collection.delete(model, {
        removeImmediately: false,
        removeOnError: true
      })

      expect(collection.models.length).toBe(0)
    })

    test('Do not remove model after successfull deletion', async () => {
      const transport = fixtures.transport()
      jest
        .spyOn(transport, 'delete')
        .mockImplementation(() => Promise.resolve({ data: {} }))
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()
      collection.add(model)

      await collection.delete(model, {
        remove: false
      })
      expect(collection.models.length).toBe(1)
      expect(collection.models[0]).toBe(model)
      expect(model.getCollection()).toBe(collection)
    })

    test('After failed deletion, do not remove the model', async () => {
      const transport = fixtures.transport()
      jest.spyOn(transport, 'delete').mockImplementation(() => Promise.reject())
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()
      collection.add(model)

      collection
        .delete(model, {
          removeImmediately: false,
          removeOnError: false
        })
        .catch(() => {
          expect(collection.models).toHaveLength(1)
          expect(collection.models[0]).toBe(model)
          expect(model.getCollection()).toBe(collection)
        })
    })
  })
})
