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

describe('Collection - delete #delete #collection', () => {
  test('Delete one model', async () => {
    const transport = fixtures.transport()
    const model = fixtures.model()
    const collection = fixtures.collection(fixtures.factory(), transport)
    collection.add(model)

    await collection.delete(model)

    expect(collection.models).toHaveLength(0)
  })

  test('Delete the model, but leave it in collection', async () => {
    const transport = fixtures.transport()
    const model = fixtures.model()
    const collection = fixtures.collection(fixtures.factory(), transport)
    collection.add(model)

    await collection.delete(model, { remove: false })

    expect(collection.models).toStrictEqual([model])
    expect(model.isDeleted).toBe(true)
    expect(collection.deleted).toStrictEqual([model])
  })

  test('When delete is in progress, we can retrieve all the models that are deleting', async () => {
    const transport = fixtures.transport()
    const model = fixtures.model()
    const modelTwo = fixtures.model()
    const collection = fixtures.collection(fixtures.factory(), transport)
    collection.add(model)
    collection.add(modelTwo)

    collection.delete(model)
    collection.delete(modelTwo)

    expect(collection.deleting).toEqual([model, modelTwo])
  })

  test('When delete is in progress, models are also marked as syncing', async () => {
    const transport = fixtures.transport()
    const model = fixtures.model()
    const modelTwo = fixtures.model()
    const collection = fixtures.collection(fixtures.factory(), transport)
    collection.add(model)
    collection.add(modelTwo)

    collection.delete(model)
    collection.delete(modelTwo)

    expect(collection.syncing).toEqual([model, modelTwo])
  })

  test('Delete process returns object with response and model that was deleted', async () => {
    const transport = fixtures.transport()
    const response = { data: 'deleted' }
    jest.spyOn(transport, 'delete').mockResolvedValue(response)
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)

    const result = await collection.delete(model)

    expect(result).toEqual({ response, model })
  })

  test('Throw if the model is already deleted', async () => {
    const transport = fixtures.transport()
    const response = { data: 'deleted' }
    jest.spyOn(transport, 'delete').mockResolvedValue(response)
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)

    await collection.delete(model)
    collection.add(model)

    await expect(() => collection.delete(model)).rejects.toThrow(
      /model is deleted/i
    )
  })

  test('Throw if model is in the process of deleting', async () => {
    const transport = fixtures.transport()
    const response = { data: 'deleted' }
    jest.spyOn(transport, 'delete').mockResolvedValue(response)
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)

    collection.delete(model, { removeImmediately: false })

    await expect(collection.delete(model)).rejects.toThrow(
      /model is in the process of deleting/i
    )
  })

  test('If the model is not in the collection, throw errror', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()

    await expect(collection.delete(model)).rejects.toThrow(
      /not in the collection/i
    )
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
      expect(onDeleteStartSpy).toHaveBeenCalledWith({
        model,
        config,
        transportConfig
      })
      expect(modelDeleteStartSpy).toHaveBeenCalledWith({
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
      expect(onDeleteSuccessSpy).toHaveBeenCalledWith({
        model,
        response,
        config,
        transportConfig
      })
      expect(modelOnDeleteSuccessSpy).toHaveBeenCalledWith({
        response,
        config,
        transportConfig
      })
    })

    test('On delete error, error callbacks are called', async () => {
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

      expect(onDeleteErrorSpy).toHaveBeenCalledWith({
        model,
        error,
        transportConfig,
        config
      })
      expect(modelOnDeleteErrorSpy).toHaveBeenCalledWith({
        error,
        config,
        data: response.data,
        transportConfig
      })
    })
  })

  describe('Delayed insertion in the collection', () => {
    test('When model is successfuly deleted, removed callback is called', async () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()
      const modelOnRemovedSpy = jest.spyOn(model, 'onRemoved')
      collection.add(model)

      const result = collection.delete(model, { removeImmediately: false })
      expect(modelOnRemovedSpy).not.toHaveBeenCalled()
      await result
      expect(modelOnRemovedSpy).toHaveBeenCalled()
    })

    test('When deleting, we can query the models that are in the process of deleting', async () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()
      collection.add(model)

      const result = collection.delete(model)
      expect(collection.deleting).toHaveLength(1)
      expect(collection.deleting[0]).toBe(model)

      await result

      expect(collection.deleting).toHaveLength(0)
    })

    test('After successful deletion, model is removed from the collection', async () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()
      collection.add(model)

      const result = collection.delete(model, { removeImmediately: false })

      expect(collection.models).toHaveLength(1)
      await result
      expect(collection.models).toHaveLength(0)
    })

    test('After failed deletion, model is removed from the collection', async () => {
      const transport = fixtures.transport()
      jest.spyOn(transport, 'delete').mockImplementation(() => Promise.reject())
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()
      collection.add(model)

      await collection.delete(model, {
        removeImmediately: false,
        removeOnError: true
      })

      expect(collection.models).toHaveLength(0)
    })

    test('After successfull deletion, model is removed', async () => {
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

      expect(collection.models).toHaveLength(1)
      expect(collection.models[0]).toBe(model)
      expect(model.getCollection()).toBe(collection)
    })

    test('After failed deletion, model is not removed', async () => {
      const transport = fixtures.transport()
      jest.spyOn(transport, 'delete').mockImplementation(() => Promise.reject())
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()
      collection.add(model)

      await collection.delete(model, {
        removeImmediately: false,
        removeOnError: false
      })

      expect(collection.models).toHaveLength(1)
      expect(collection.models[0]).toBe(model)
      expect(model.getCollection()).toBe(collection)
    })
  })
})
