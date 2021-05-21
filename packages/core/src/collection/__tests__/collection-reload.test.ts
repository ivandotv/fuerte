import { configure } from 'mobx'
import { ReloadConfig } from '../../utils/types'
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

describe('Collection - reload models', () => {
  test('Reload model', async () => {
    const transport = fixtures.transport()
    const model = fixtures.model()
    const collection = fixtures.collection(fixtures.factory(), transport)
    await collection.save(model)

    const response = { data: { foo: 'reload', bar: 'reload' } }
    jest.spyOn(transport, 'reload').mockResolvedValueOnce(response)

    await collection.reload(model)

    expect(model.foo).toBe(response.data.foo)
    expect(model.bar).toBe(response.data.bar)

    expect(collection.models[0]).toBe(model)
    expect(collection.models.length).toBe(1)
  })

  test('Return value is object with response and model', async () => {
    const transport = fixtures.transport()
    const model = fixtures.model()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const response = { data: { foo: 'reload', bar: 'reload' } }
    jest.spyOn(transport, 'reload').mockResolvedValueOnce(response)
    await collection.save(model)

    const result = await collection.reload(model)

    expect(result.response).toEqual(response)
    expect(result.model).toEqual(model)
  })

  test('Throw if model is not present in the collection', async () => {
    const transport = fixtures.transport()
    const model = fixtures.model()
    const collection = fixtures.collection(fixtures.factory(), transport)

    expect.assertions(1)
    try {
      await collection.reload(model)
    } catch (error) {
      expect(error.message).toMatch('not in the collection')
    }
  })

  test('Throw if model is new', async () => {
    const transport = fixtures.transport()
    const model = fixtures.model()
    const collection = fixtures.collection(fixtures.factory(), transport)

    collection.add(model)

    expect.assertions(1)
    try {
      await collection.reload(model)
    } catch (error) {
      expect(error.message.toLowerCase()).toMatch(
        'new model cannot be reloaded'
      )
    }
  })

  test('If reload throws error,remove the model', async () => {
    const transport = fixtures.transport()
    const model = fixtures.model()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const response = 'rejected'
    await collection.save(model)

    jest.spyOn(transport, 'reload').mockRejectedValueOnce(response)

    const onRemovedSpy = jest.spyOn(model, 'onRemoved')

    expect(collection.models).toHaveLength(1)

    await collection.reload(model, { removeOnError: true })

    expect(collection.models).toHaveLength(0)
    expect(onRemovedSpy).toBeCalled()
  })

  test('If reload throws error, do not remove the model', async () => {
    const transport = fixtures.transport()
    const model = fixtures.model()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const response = 'rejected'

    await collection.save(model)

    jest.spyOn(transport, 'reload').mockRejectedValueOnce(response)

    const onRemovedSpy = jest.spyOn(model, 'onRemoved')

    expect(collection.models).toHaveLength(1)

    await collection.reload(model, { removeOnError: false })

    expect(collection.models).toHaveLength(1)
    expect(onRemovedSpy).not.toBeCalled()
  })

  test('When the model is in the process of reloading, "modelsReloading" property reflects that', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    await collection.save(model)

    const result = collection.reload(model)
    expect(collection.modelsReloading.length).toBe(1)
    expect(collection.modelsReloading[0]).toBe(model)

    await result

    expect(collection.modelsReloading.length).toBe(0)
  })

  describe('Callbacks', () => {
    test('On reload start, start callbacks are called', async () => {
      const transport = fixtures.transport()
      const model = fixtures.model()
      const persistenceConfig = 'config'
      const config: ReloadConfig = {
        removeOnError: false
      }
      const collection = fixtures.collection(fixtures.factory(), transport)
      await collection.save(model)

      const collectionReloadStartSpy = jest.spyOn(collection, 'onReloadStart')
      const modelReloadStartSpy = jest.spyOn(model, 'onReloadStart')

      await collection.reload(model, config, persistenceConfig)

      expect(collectionReloadStartSpy).toBeCalledWith({
        model,
        persistenceConfig,
        config
      })
      expect(modelReloadStartSpy).toBeCalledWith({
        persistenceConfig,
        config
      })
    })

    test('On reload success, success callbacks are called', async () => {
      const transport = fixtures.transport()
      const model = fixtures.model()
      const response = { data: { foo: 'foo-reload', bar: 'bar-reload' } }
      const persistenceConfig = 'config'
      const config: ReloadConfig = {
        removeOnError: false
      }
      const collection = fixtures.collection(fixtures.factory(), transport)
      const collectionOnReloadSuccess = jest.spyOn(
        collection,
        'onReloadSuccess'
      )
      const modelOnReloadSuccessSpy = jest.spyOn(model, 'onReloadSuccess')
      jest.spyOn(transport, 'reload').mockResolvedValue(response)

      await collection.save(model)

      await collection.reload(model, config, persistenceConfig)

      expect(collectionOnReloadSuccess).toBeCalledWith({
        model,
        config,
        response,
        data: response.data,
        persistenceConfig
      })
      expect(modelOnReloadSuccessSpy).toBeCalledWith({
        response,
        config,
        data: response.data,
        persistenceConfig
      })
    })

    test('On reload error, error callbacks are called', async () => {
      const transport = fixtures.transport()
      const model = fixtures.model()
      const response = 'response'
      const persistenceConfig = 'config'
      const config: ReloadConfig = {
        removeOnError: false
      }
      const collection = fixtures.collection(fixtures.factory(), transport)
      const collectionOnReloadError = jest.spyOn(collection, 'onReloadError')
      const modelOnReloadError = jest.spyOn(model, 'onReloadError')
      jest.spyOn(transport, 'reload').mockRejectedValue(response)

      await collection.save(model)

      const { error } = await collection.reload(
        model,
        config,
        persistenceConfig
      )
      expect(collectionOnReloadError).toBeCalledWith({
        model,
        error,
        config,
        persistenceConfig
      })
      expect(modelOnReloadError).toBeCalledWith({
        error,
        persistenceConfig,
        config
      })
    })
  })

  test('After failed request, model holds failed response', async () => {
    const transport = fixtures.transport()
    const response = 'failed_response'
    jest
      .spyOn(transport, 'reload')
      .mockImplementation(() => Promise.reject(response))
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    await collection.save(model)

    const { error } = await collection.reload(model)

    expect(model.reloadError).toBe(error)
  })

  test('Model failed response prop is cleared on next call to reload', async () => {
    const transport = fixtures.transport()
    const response = 'failed_response'
    jest
      .spyOn(transport, 'reload')
      .mockImplementationOnce(() => Promise.reject(response))
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    await collection.save(model)

    const { error } = await collection.reload(model)

    expect(model.reloadError).toEqual(error)

    await collection.reload(model)

    expect(model.reloadError).toBe(undefined)
  })

  test('If there are pending reload requests, model is still in the process of reloading', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    await collection.save(model)

    const firstResult = collection.reload(model)

    jest.spyOn(transport, 'reload').mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            resolve({ data: { foo: '', bar: '' } })
          }, 10)
        )
    )

    const secondResult = collection.reload(model)
    await firstResult

    //it should still be in the reloading process
    expect(collection.modelsReloading).toEqual([model])
    expect(model.isReloading).toBe(true)
    expect(model.isSyncing).toBe(true)

    await secondResult
    expect(collection.modelsReloading).toEqual([])
    expect(model.isReloading).toBe(false)
    expect(model.isSyncing).toBe(false)
  })
})
