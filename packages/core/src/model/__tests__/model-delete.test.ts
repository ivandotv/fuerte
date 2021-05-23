import { configure } from 'mobx'
import { DeleteConfig } from '../../utils/types'
import { ASYNC_STATUS } from '../../utils/utils'
import { fixtureFactory } from '../../__fixtures__/fixtureFactory'

configure({ enforceActions: 'always' })

const fixtures = fixtureFactory()

describe('Model - delete', () => {
  test('returns transport delete response', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)
    const config: DeleteConfig = {
      remove: true,
      removeImmediately: false,
      removeOnError: false
    }
    const transportConfig = 'config'
    const response = { status: 'response', data: {} }
    jest
      .spyOn(transport, 'delete')
      .mockImplementation(() => Promise.resolve(response))

    const result = await model.delete(config, transportConfig)

    expect(result).toEqual({ response, error: undefined })
  })

  test('When deletion is in progress, "isDeleting" property is true', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)

    expect(model.isDeleting).toBe(false)

    const response = model.delete()

    expect(model.isDeleting).toBe(true)

    await response

    expect(model.isDeleting).toBe(false)
  })

  test('When successfully deleted, "isDeleted" property is true', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)

    await model.delete()
    expect(model.isDeleted).toBe(true)
  })

  test('When deletion is in progress, "isSyncing" is true', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)

    expect(model.isSyncing).toBe(false)
    const response = model.delete()
    expect(model.isSyncing).toBe(true)
    await response
    expect(model.isSyncing).toBe(false)
  })

  test('When deletion fails on a new model, "isDeleted" property is false', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)

    jest.spyOn(transport, 'delete').mockImplementation(() => Promise.reject({}))

    model.delete()

    expect(model.isDeleted).toBe(false)
  })

  test('When deletion fails, "transportErrors" holds the failed response', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)
    const response = 'response'

    jest.spyOn(transport, 'delete').mockRejectedValue(response)

    expect.assertions(2)

    const { error } = await model.delete()

    expect(model.deleteError).toEqual(error)
    expect(model.hasErrors).toEqual(true)
  })

  describe('Callbacks', () => {
    test('When delete process starts, delete callback is called', async () => {
      const collection = fixtures.collection()
      const model = fixtures.model()
      const config: DeleteConfig = {
        remove: true,
        removeImmediately: false,
        removeOnError: false
      }
      const transportConfig = 'config'
      const deleteStartSpy = jest.spyOn(model, 'onDeleteStart')
      // @ts-expect-error - protected method
      const collectionStartSpy = jest.spyOn(collection, 'onDeleteStart')

      collection.add(model)

      await model.delete(config, transportConfig)

      expect(deleteStartSpy).toBeCalledWith({
        config,
        transportConfig
      })
      expect(collectionStartSpy).toBeCalledWith({
        model,
        config,
        transportConfig
      })
    })

    test('When deleted successfully, success callback is called', async () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()
      const config: DeleteConfig = {
        remove: true,
        removeImmediately: false,
        removeOnError: false
      }
      const transportConfig = 'config'
      const response = { status: 'response', data: { status: 'ok' } }
      jest
        .spyOn(transport, 'delete')
        .mockImplementation(() => Promise.resolve(response))
      const onDeleteSuccessSpy = jest.spyOn(model, 'onDeleteSuccess')

      const collectionSuccessSpy = jest.spyOn(collection, 'onDeleteSuccess')

      collection.add(model)

      await model.delete(config, transportConfig)

      expect(onDeleteSuccessSpy).toBeCalledWith({
        response,
        data: response.data,
        config,
        transportConfig
      })

      expect(collectionSuccessSpy).toBeCalledWith({
        model,
        response,
        config,
        transportConfig
      })
    })

    test('When there is an error, error callback is called', async () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()

      const config: DeleteConfig = {
        remove: true,
        removeImmediately: false,
        removeOnError: false
      }
      const transportConfig = 'config'
      const response = 'response'
      jest
        .spyOn(transport, 'delete')
        .mockImplementation(() => Promise.reject(response))
      const deleteErrorSpy = jest.spyOn(model, 'onDeleteError')
      const collectionErrorSpy = jest.spyOn(collection, 'onDeleteError')

      collection.add(model)

      model.delete(config, transportConfig).catch((error) => {
        expect(deleteErrorSpy).toBeCalledWith({
          error,
          config,
          transportConfig
        })

        expect(collectionErrorSpy).toBeCalledWith({
          model,
          error,
          config,
          transportConfig
        })
      })
    })
  })
})
