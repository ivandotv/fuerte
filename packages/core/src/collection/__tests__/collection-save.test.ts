import { configure } from 'mobx'
import { SaveConfig } from '../../utils/types'
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

describe('Collection - save models', () => {
  test('Save model', async () => {
    const transport = fixtures.transport()
    const model = fixtures.model()
    const collection = fixtures.collection(fixtures.factory(), transport)

    await collection.save(model)

    expect(collection.models[0]).toBe(model)
  })

  test('When save is in progress, can retrieve all models that are reloading', async () => {
    const transport = fixtures.transport()
    const model = fixtures.model()
    const modelTwo = fixtures.model()

    const collection = fixtures.collection(fixtures.factory(), transport)

    const p1 = collection.save(model)
    const p2 = collection.save(modelTwo)

    expect(collection.modelsSaving).toEqual([model, modelTwo])
    expect(collection.modelsSyncing).toEqual([model, modelTwo])

    await Promise.all([p1, p2])

    expect(collection.models[0]).toBe(model)

    expect(collection.modelsSaving).toHaveLength(0)
    expect(collection.modelsSyncing).toHaveLength(0)
  })

  test('Create and save models', async () => {
    const transport = fixtures.transport()
    const data = { foo: 'foo-prop', bar: 'bar-prop' }
    const collection = fixtures.collection(fixtures.factory(), transport)

    await collection.save(data)

    expect(collection.models[0].foo).toBe(data.foo)
    expect(collection.models[0].bar).toBe(data.bar)
  })

  test('Return value is object with response and model', async () => {
    const transport = fixtures.transport()
    const model = fixtures.model()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const transportResponse = { data: { id: '123' } }
    jest.spyOn(transport, 'save').mockResolvedValue(transportResponse)

    const result = await collection.save(model)

    expect(result.response).toEqual(transportResponse)
    expect(result.model).toEqual(model)
  })

  test(' After failed request, model holds the failed response,', async () => {
    const transport = fixtures.transport()
    const response = 'failed_response'
    jest
      .spyOn(transport, 'save')
      .mockImplementation(() => Promise.reject(response))
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()

    expect.assertions(1)

    await collection.save(model)
    expect(model.saveError).toBe(response)
  })

  test('Model failed response prop is cleared on next call to save', async () => {
    const transport = fixtures.transport()
    const response = 'failed_response'
    jest
      .spyOn(transport, 'save')
      .mockImplementationOnce(() => Promise.reject(response))
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()

    await collection.save(model).catch(() => {
      expect(model.saveError).toEqual(response)
    })

    await collection.save(model)

    expect(model.saveError).toBe(undefined)
  })

  test('If there are pending save requests, model is still in the process of saving', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()

    const firstResult = collection.save(model)

    jest.spyOn(transport, 'save').mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            resolve({ data: { id: '123' } })
          }, 10)
        )
    )

    const secondResult = collection.save(model)
    await firstResult

    //it should still be in the saving process
    expect(collection.modelsSaving).toEqual([model])
    expect(model.isSaving).toBe(true)
    expect(model.isSyncing).toBe(true)

    await secondResult
    expect(collection.modelsSaving).toEqual([])
    expect(model.isSaving).toBe(false)
    expect(model.isSyncing).toBe(false)
  })

  test('Save model via model DTO  ', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)

    const modelData = {
      foo: 'data-foo',
      bar: 'data-bar'
    }
    await collection.save(modelData)
    expect(collection.models.length).toBe(1)
    expect(collection.models[0]).toEqual(expect.objectContaining(modelData))
  })

  test('When the model is in the process of saving, "modelsSaving" property reflects that', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()

    const result = collection.save(model)
    expect(collection.modelsSaving.length).toBe(1)
    expect(collection.modelsSaving[0]).toBe(model)

    await result

    expect(collection.modelsSaving.length).toBe(0)
  })

  test('When model is added to the collection before save process starts, "onAdded" model hook is called', () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    // @ts-expect-error - onAdded is a protected method
    const modelOnAddedSpy = jest.spyOn(model, 'onAdded')

    collection.save(model)
    expect(modelOnAddedSpy).toBeCalled()
  })

  test('If the model is already in the collection, just save it', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)
    const onSaveSuccessSpy = jest.spyOn(collection, 'onSaveSuccess')
    // @ts-expect-error - protected method
    const onModelAddedSpy = jest.spyOn(model, 'onAdded')
    const onModelSaveStartSpy = jest.spyOn(model, 'onSaveStart')
    const onModelSaveSuccessSpy = jest.spyOn(model, 'onSaveSuccess')

    await collection.save(model)

    expect(onModelAddedSpy).not.toBeCalled()
    expect(onModelSaveStartSpy).toBeCalledTimes(1)
    expect(onModelSaveSuccessSpy).toBeCalledTimes(1)
    expect(collection.models.length).toBe(1)
    expect(onSaveSuccessSpy).toBeCalledTimes(1)
  })

  describe('Callbacks', () => {
    test('On save start, start callbacks are called', async () => {
      const transport = fixtures.transport()
      const model = fixtures.model()
      const transportConfig = 'config'
      const config: SaveConfig = {
        insertPosition: 'end',
        addOnError: true,
        addImmediately: true
      }
      const collection = fixtures.collection(fixtures.factory(), transport)

      const collectionSaveStartSpy = jest.spyOn(collection, 'onSaveStart')
      const modelSaveStartSpy = jest.spyOn(model, 'onSaveStart')

      await collection.save(model, config, transportConfig)
      expect(collectionSaveStartSpy).toBeCalledWith({
        model,
        transportConfig,
        config
      })
      expect(modelSaveStartSpy).toBeCalledWith({
        transportConfig,
        config
      })
    })

    test('On save success, success callbacks are called', async () => {
      const transport = fixtures.transport()
      const model = fixtures.model()
      const response = { data: { id: '123' } }
      const transportConfig = 'config'
      const config: SaveConfig = {
        insertPosition: 'end',
        addOnError: true,
        addImmediately: true
      }
      const collection = fixtures.collection(fixtures.factory(), transport)
      const onSaveSuccessSpy = jest.spyOn(collection, 'onSaveSuccess')
      const modelSaveSuccessSpy = jest.spyOn(model, 'onSaveSuccess')
      jest
        .spyOn(transport, 'save')
        .mockImplementation(() => Promise.resolve(response))

      await collection.save(model, config, transportConfig)

      expect(onSaveSuccessSpy).toBeCalledWith({
        model,
        config,
        response,
        transportConfig
      })

      expect(modelSaveSuccessSpy).toBeCalledWith({
        response,
        config,
        transportConfig
      })
    })

    test('On save error, error callbacks are called', async () => {
      const transport = fixtures.transport()
      const model = fixtures.model()
      const response = 'response'
      const config: SaveConfig = {
        insertPosition: 'end',
        addOnError: true,
        addImmediately: true
      }
      const transportConfig = 'config'
      const collection = fixtures.collection(fixtures.factory(), transport)
      const collectionSaveErrorSpy = jest.spyOn(collection, 'onSaveError')
      const modelSaveErrorSpy = jest.spyOn(model, 'onSaveError')
      jest.spyOn(transport, 'save').mockRejectedValue(response)

      expect.assertions(2)

      const result = await collection.save(model, config, transportConfig)

      expect(collectionSaveErrorSpy).toBeCalledWith({
        model,
        error: result.error,
        config,
        transportConfig
      })
      expect(modelSaveErrorSpy).toBeCalledWith({
        error: result.error,
        transportConfig,
        config,
        dataToSave: model.payload
      })
    })
  })

  describe('Delayed insertion in the collection', () => {
    test('When the model is in the process of saving, "modelsSaving" property reflects that', async () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()

      const result = collection.save(model, { addImmediately: false })
      expect(collection.modelsSaving.length).toBe(1)
      expect(collection.modelsSaving[0]).toBe(model)

      await result

      expect(collection.modelsSaving.length).toBe(0)
    })
    test('When model is successfuly saved, "onAdded" model hook is called', async () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()
      // @ts-expect-error - onAdded is a protected method
      const modelOnAddedSpy = jest.spyOn(model, 'onAdded')

      const result = collection.save(model, { addImmediately: false })
      expect(modelOnAddedSpy).not.toBeCalled()
      await result
      expect(modelOnAddedSpy).toBeCalled()
    })
    test('Add model only after successful save', async () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()

      const promise = collection.save(model, { addImmediately: false })

      expect(collection.models.length).toBe(0)
      await promise
      expect(collection.models.length).toBe(1)
      expect(collection.models[0]).toBe(model)
    })

    test('Add model after failed save by default', async () => {
      const transport = fixtures.transport()
      jest
        .spyOn(transport, 'save')
        .mockImplementation(() => Promise.reject(false))
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()

      await collection.save(model, {
        addImmediately: false,
        addOnError: true
      })
      expect(collection.models).toHaveLength(1)
      expect(collection.models[0]).toBe(model)
    })
    test('Do not add model after failed save', async () => {
      const transport = fixtures.transport()
      jest
        .spyOn(transport, 'save')
        .mockImplementation(() => Promise.reject(false))
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()

      await collection.save(model, {
        addImmediately: false,
        addOnError: false
      })
      expect(collection.models).toHaveLength(0)
      expect(model.getCollection()).toBe(undefined)
    })
  })
})
