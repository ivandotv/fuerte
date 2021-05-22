import { configure, runInAction } from 'mobx'
import { ReloadConfig } from '../../utils/types'
import { fixtureFactory } from '../../__fixtures__/fixtureFactory'

configure({ enforceActions: 'always' })

const fixtures = fixtureFactory()

describe('Model - delete', () => {
  test('returns transport reload response', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    const transportConfig = 'config'
    const config: ReloadConfig = {
      removeOnError: false
    }
    const response = { data: { foo: 'foo-r', bar: 'bar-r' } }
    jest
      .spyOn(transport, 'reload')
      .mockImplementation(() => Promise.resolve(response))

    await collection.save(model)

    const result = await model.reload(config, transportConfig)

    expect(result).toEqual({ response, error: undefined })
  })

  test('When successfully reloaded, "isDirty" property is false', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()

    await collection.save(model)

    runInAction(() => {
      model.foo = 'foo-new'
    })

    expect(model.isDirty).toBe(true)

    await model.reload()

    expect(model.isDirty).toBe(false)
  })

  test('When reload is in progress, "isReloading" property is true', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()

    await collection.save(model)

    expect(model.isReloading).toBe(false)

    const response = model.reload()

    expect(model.isReloading).toBe(true)

    await response

    expect(model.isReloading).toBe(false)
  })
  test('When reload is in progress, "isSyncing" is true', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    await collection.save(model)

    expect(model.isSyncing).toBe(false)

    const response = model.delete()

    expect(model.isSyncing).toBe(true)

    await response

    expect(model.isSyncing).toBe(false)
  })

  test('On dirty model, when reload fails, "isDirty" property is true', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    await collection.save(model)

    jest.spyOn(transport, 'reload').mockImplementation(() => Promise.reject())

    runInAction(() => {
      model.foo = 'new-foo'
    })

    await model.reload()

    expect(model.isDirty).toBe(true)
  })

  test('When reload fails, "transportErrors" holds the failed response', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    const response = 'response'

    await collection.save(model)

    jest.spyOn(transport, 'reload').mockRejectedValue(response)

    await model.reload()

    expect(model.reloadError).toEqual(response)
    expect(model.hasErrors).toEqual(true)
  })

  describe('Callbacks', () => {
    test('When reload process starts, reload callback is called', async () => {
      const collection = fixtures.collection()
      const model = fixtures.model()
      const config: ReloadConfig = {
        removeOnError: false
      }
      const transportConfig = 'config'
      const modelSpy = jest.spyOn(model, 'onReloadStart')
      const collectionSpy = jest.spyOn(collection, 'onReloadStart')

      await collection.save(model)

      await model.reload(config, transportConfig)

      expect(modelSpy).toBeCalledWith({
        config,
        transportConfig
      })
      expect(collectionSpy).toBeCalledWith({
        model,
        config,
        transportConfig
      })
    })

    test('When reloaded successfully, success callback is called', async () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()
      const config: ReloadConfig = {
        removeOnError: false
      }
      const transportConfig = 'config'
      const response = { data: { foo: 'foo-new', bar: 'bar-new' } }
      jest
        .spyOn(transport, 'reload')
        .mockImplementation(() => Promise.resolve(response))
      const modelSpy = jest.spyOn(model, 'onReloadSuccess')

      const collectionSpy = jest.spyOn(collection, 'onReloadSuccess')

      await collection.save(model)

      await model.reload(config, transportConfig)

      expect(modelSpy).toBeCalledWith({
        response,
        data: response.data,
        config,
        transportConfig
      })

      expect(collectionSpy).toBeCalledWith({
        model,
        response,
        data: response.data,
        config,
        transportConfig
      })
    })
    test('When there is an error, error callback is called', async () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()
      collection.add(model)
      const config: ReloadConfig = {
        removeOnError: false
      }
      const transportConfig = 'config'
      const response = 'response'
      jest
        .spyOn(transport, 'reload')
        .mockImplementation(() => Promise.reject(response))
      const modelSpy = jest.spyOn(model, 'onReloadError')
      const collectionSpy = jest.spyOn(collection, 'onReloadError')
      await collection.save(model)

      const { error } = await model.reload(config, transportConfig)

      expect(modelSpy).toBeCalledWith({
        error,
        config,
        transportConfig
      })

      expect(collectionSpy).toBeCalledWith({
        model,
        error,
        config,
        transportConfig
      })
    })
  })
})
