import { configure } from 'mobx'
import { DeleteConfig } from '../../utils/types'
import { fixtureFactory } from '../../__fixtures__/fixtureFactory'

configure({ enforceActions: 'always' })

const fixtures = fixtureFactory()

describe('Model - delete #delete #model', () => {
  test('On successful deletion, delete response is returned', async () => {
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

  test('When deletion is in progress, model is in deleting state', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)

    model.delete()

    expect(model.isDeleting).toBe(true)
  })

  test('When deletion is complete, model is not in the deleting state', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)

    await model.delete()

    expect(model.isDeleting).toBe(false)
  })

  test('When successfully deleted, model is in the deleted state', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)

    await model.delete()

    expect(model.isDeleted).toBe(true)
  })

  test('When deletion is in progress, model is in syncing state', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)
    const response = model.delete()

    expect(model.isSyncing).toBe(true)

    await response

    expect(model.isSyncing).toBe(false)
  })

  test('When deletion fails, model is not in the deleted state', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)

    jest.spyOn(transport, 'delete').mockImplementation(() => Promise.reject({}))

    model.delete()

    expect(model.isDeleted).toBe(false)
  })

  test('When deletion fails, model holds the failed response', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)
    const response = 'response'

    jest.spyOn(transport, 'delete').mockRejectedValue(response)

    const { error } = await model.delete()

    expect(model.deleteError).toEqual(error)
    expect(model.hasErrors).toEqual(true)
  })

  describe('Callbacks', () => {
    test('When the delete process starts, delete callback is called', async () => {
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

    test('When teh model is deleted successfully, success callback is called', async () => {
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

    test('When the model is deleted and removed from the collection, removed callback is called', () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()
      const modelOnRemovedSpy = jest.spyOn(model, 'onRemoved')
      collection.add(model)

      collection.delete(model)

      expect(modelOnRemovedSpy).toBeCalled()
    })

    test('When there is a delete error, error callback is called', async () => {
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

      const { error } = await model.delete(config, transportConfig)

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
