import { configure } from 'mobx'
import { SaveConfig } from '../../types'
import { fixtureFactory } from '../__fixtures__/fixtureFactory'

configure({ enforceActions: 'always' })

const fixtures = fixtureFactory()
let modelPool: any[]

beforeEach(() => {
  modelPool = []
  for (let index = 0; index < 10; index++) {
    const model = fixtures.model()
    modelPool.push(model)
  }

  jest.clearAllMocks()
})

describe('Collection - save #save #collection', () => {
  test('Save one model', async () => {
    const transport = fixtures.transport()
    const model = fixtures.model()
    const collection = fixtures.collection(fixtures.factory(), transport)

    await collection.save(model)

    expect(collection.models[0]).toBe(model)
    expect(model.getCollection()).toBe(collection)
  })

  test('When save is in progress, we can retrieve all the models that are in the process of saving', async () => {
    const transport = fixtures.transport()
    const model = fixtures.model()
    const modelTwo = fixtures.model()
    const collection = fixtures.collection(fixtures.factory(), transport)

    collection.save(model)
    collection.save(modelTwo)

    expect(collection.saving).toEqual([model, modelTwo])
  })

  test('When save is in progress, models that are currently being saved are also syncing', async () => {
    const transport = fixtures.transport()
    const model = fixtures.model()
    const modelTwo = fixtures.model()
    const collection = fixtures.collection(fixtures.factory(), transport)

    collection.save(model)
    collection.save(modelTwo)

    expect(collection.syncing).toEqual([model, modelTwo])
  })

  test('Return value is object with the response and the model that is being saved', async () => {
    const transport = fixtures.transport()
    const model = fixtures.model()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const transportResponse = { data: { id: '123' } }
    jest.spyOn(transport, 'save').mockResolvedValue(transportResponse)

    const result = await collection.save(model)

    expect(result.response).toEqual(transportResponse)
    expect(result.model).toEqual(model)
  })

  test('After a failed request, model holds the failed response,', async () => {
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

  test('Model failed response property is cleared on the next call to save', async () => {
    const transport = fixtures.transport()
    const response = 'failed_response'
    jest
      .spyOn(transport, 'save')
      .mockImplementationOnce(() => Promise.reject(response))
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()

    await collection.save(model).catch(() => {})
    await collection.save(model)

    expect(model.saveError).toBeUndefined()
  })

  test('If there are pending save requests, than the model is still in the process of saving', async () => {
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
    expect(collection.saving).toEqual([model])
    expect(model.isSaving).toBe(true)
    expect(model.isSyncing).toBe(true)

    await secondResult

    expect(collection.saving).toEqual([])
    expect(model.isSaving).toBe(false)
    expect(model.isSyncing).toBe(false)
  })

  test('When saving, we can query all the models that are in the process of saving', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()

    collection.save(model)

    expect(collection.saving).toHaveLength(1)
    expect(collection.saving[0]).toBe(model)
  })

  test('If the model is already in the collection, do not add it just save it', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)
    const onSaveSuccessSpy = jest.spyOn(collection, 'onSaveSuccess')
    const onModelSaveStartSpy = jest.spyOn(model, 'onSaveStart')
    const onModelSaveSuccessSpy = jest.spyOn(model, 'onSaveSuccess')

    await collection.save(model)

    expect(onModelSaveStartSpy).toHaveBeenCalledTimes(1)
    expect(onModelSaveSuccessSpy).toHaveBeenCalledTimes(1)
    expect(collection.models).toHaveLength(1)
    expect(onSaveSuccessSpy).toHaveBeenCalledTimes(1)
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

      expect(collectionSaveStartSpy).toHaveBeenCalledWith({
        model,
        transportConfig,
        config
      })
      expect(modelSaveStartSpy).toHaveBeenCalledWith({
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

      expect(onSaveSuccessSpy).toHaveBeenCalledWith({
        model,
        config,
        response,
        transportConfig
      })
      expect(modelSaveSuccessSpy).toHaveBeenCalledWith({
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

      const result = await collection.save(model, config, transportConfig)

      expect(collectionSaveErrorSpy).toHaveBeenCalledWith({
        model,
        error: result.error,
        config,
        transportConfig
      })
      expect(modelSaveErrorSpy).toHaveBeenCalledWith({
        error: result.error,
        transportConfig,
        config,
        dataToSave: model.payload
      })
    })
  })

  describe('Delayed insertion in the collection', () => {
    test('When saving, we can query all the models that are in the process of saving', async () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()

      collection.save(model, { addImmediately: false })

      expect(collection.saving).toHaveLength(1)
      expect(collection.saving[0]).toBe(model)
    })

    test('Add the model after the successful save', async () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()

      // @ts-expect-error - internal callback test
      const onAddedSpy = jest.spyOn(model, 'onAdded')
      const promise = collection.save(model, { addImmediately: false })

      expect(collection.models).toHaveLength(0)

      await promise

      expect(collection.models).toHaveLength(1)
      expect(collection.models[0]).toBe(model)
      expect(onAddedSpy).toHaveBeenCalledTimes(1)
      expect(onAddedSpy).toHaveBeenCalledWith(collection)
    })

    test('Add the model after the failed save', async () => {
      const transport = fixtures.transport()
      jest
        .spyOn(transport, 'save')
        .mockImplementation(() => Promise.reject(false))
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()

      // @ts-expect-error - internal callback test
      const onAddedSpy = jest.spyOn(model, 'onAdded')

      await collection.save(model, {
        addImmediately: false,
        addOnError: true
      })

      expect(collection.models).toHaveLength(1)
      expect(collection.models[0]).toBe(model)
      expect(onAddedSpy).toHaveBeenCalledTimes(1)
      expect(onAddedSpy).toHaveBeenCalledWith(collection)
    })

    test('Do not add the model after the failed save', async () => {
      const transport = fixtures.transport()
      jest
        .spyOn(transport, 'save')
        .mockImplementation(() => Promise.reject(false))
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()
      // @ts-expect-error - internal callback test
      const onAddedSpy = jest.spyOn(model, 'onAdded')

      await collection.save(model, {
        addImmediately: false,
        addOnError: false
      })

      expect(collection.models).toHaveLength(0)
      expect(onAddedSpy).not.toHaveBeenCalled()
    })
  })
})
