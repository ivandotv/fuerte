import { configure, runInAction } from 'mobx'
import { fixtureFactory } from '../../__fixtures__/fixtureFactory'
import { v4 as uuid } from 'uuid'
import { ASYNC_STATUS } from '../../utils/utils'
import { SaveConfig } from '../../utils/types'

configure({ enforceActions: 'always' })

const fixtures = fixtureFactory()

describe('Model - save', () => {
  test('returns transport save response', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)
    const transportConfig = 'config'
    const saveConfig: SaveConfig = {
      insertPosition: 'end',
      addImmediately: true,
      addOnError: true
    }
    const response = { data: { id: uuid() } }
    jest.spyOn(transport, 'save').mockResolvedValue(response)

    const result = await model.save(saveConfig, transportConfig)

    expect(result).toStrictEqual({ response, error: undefined })
  })
  test('When saving is in progress, "isSaving" property is true', async () => {
    const model = fixtures.model()
    const collection = fixtures.collection()
    collection.add(model)

    expect(model.isSaving).toBe(false)
    const response = model.save()
    expect(model.isSaving).toBe(true)
    await response
    expect(model.isSaving).toBe(false)
  })

  test('When saving is in progress, "isSyncing" is true', async () => {
    const model = fixtures.model()
    const collection = fixtures.collection()
    collection.add(model)

    expect(model.isSyncing).toBe(false)
    const response = model.save()
    expect(model.isSyncing).toBe(true)
    await response
    expect(model.isSyncing).toBe(false)
  })
  test('When model is saved, "isNew" is false', async () => {
    const model = fixtures.model()
    const collection = fixtures.collection()
    collection.add(model)

    expect(model.isNew).toBe(true)

    await model.save()

    expect(model.isNew).toBe(false)
  })
  test('When model save fails on a new model, "isNew" property stays true', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const model = fixtures.model()
    collection.add(model)
    jest.spyOn(transport, 'save').mockImplementation(() => Promise.reject())

    expect(model.isNew).toBe(true)

    await model.save()

    expect(model.isNew).toBe(true)
  })

  test('When saved successfully, "lastSaved" property holds latest saved data', async () => {
    const modelData = { foo: 'fooInit', bar: 'barInit' }
    const model = fixtures.model(modelData)
    const collection = fixtures.collection()
    collection.add(model)

    runInAction(() => {
      model.foo = modelData.foo
      model.bar = modelData.bar
    })

    await model.save()

    expect(model.lastSavedData).toEqual(expect.objectContaining(modelData))
  })

  test('When created from DTO and saved, "lastSaved" property holds latest saved data', async () => {
    const modelData = { foo: 'fooInit', bar: 'barInit' }
    const collection = fixtures.collection()

    const { model } = await collection.save({
      foo: modelData.foo,
      bar: modelData.bar
    })

    expect(model!.lastSavedData).toEqual(expect.objectContaining(modelData))
  })

  test('When model is saved, it is not dirty anymore', async () => {
    const collection = fixtures.collection()
    const model = fixtures.model()
    collection.add(model)
    runInAction(() => {
      model.foo = 'new_value'
    })

    expect(model.isDirty).toBe(true)

    await model.save()

    expect(model.isDirty).toBe(false)
    expect(model.isSaving).toBe(false)
  })
  test('When model is saved, it is not new anymore', async () => {
    const collection = fixtures.collection()
    const model = fixtures.model()
    collection.add(model)

    expect(model.isNew).toBe(true)

    await model.save()

    expect(model.isNew).toBe(false)
  })
  test('When save is in progress, "isSyncing" property is true.', async () => {
    const collection = fixtures.collection()
    const model = fixtures.model()
    collection.add(model)

    expect(model.isNew).toBe(true)

    await model.save()

    expect(model.isNew).toBe(false)
  })

  test('When save fails, "transportErrors" holds the failed response', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const response = 'response'
    jest.spyOn(transport, 'save').mockRejectedValue(response)
    const model = fixtures.model()
    collection.add(model)

    await model.save()

    expect(model.saveError).toEqual(response)
    expect(model.hasErrors).toEqual(true)
  })

  //todo - da li clear error treba da ide u model save start?
  test('When save process starts, previous save error is cleared.', async () => {
    const transport = fixtures.transport()
    const collection = fixtures.collection(fixtures.factory(), transport)
    const response = 'response'
    jest.spyOn(transport, 'save').mockRejectedValueOnce(response)
    const model = fixtures.model()
    collection.add(model)

    await model.save().catch(() => {})

    expect(model.saveError).toEqual(response)
    expect(model.hasErrors).toEqual(true)

    model.save()

    expect(model.saveError).toBeUndefined()
  })

  test('Throw if model is not part of the collection', async () => {
    const model = fixtures.model()

    await expect(model.save()).rejects.toStrictEqual(
      expect.objectContaining({
        message: expect.stringMatching(/not in the collection/)
      })
    )
  })
  describe('Callbacks', () => {
    test('On save start, start callbacks are called', async () => {
      const transport = fixtures.transport()
      const model = fixtures.model()
      const persistenceConfig = 'config'
      const config: SaveConfig = {
        insertPosition: 'end',
        addOnError: true,
        addImmediately: true
      }
      const collection = fixtures.collection(fixtures.factory(), transport)
      collection.add(model)

      const collectionSaveStartSpy = jest.spyOn(collection, 'onSaveStart')
      const modelSaveStartSpy = jest.spyOn(model, 'onSaveStart')

      await model.save(config, persistenceConfig)

      expect(collectionSaveStartSpy).toBeCalledWith({
        model,
        persistenceConfig,
        config
      })

      expect(modelSaveStartSpy).toBeCalledWith({
        persistenceConfig,
        config
      })
    })

    test('On save success, success callbacks are called', async () => {
      const transport = fixtures.transport()
      const model = fixtures.model()
      const response = { data: { id: '123' } }
      const persistenceConfig = 'config'
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

      collection.add(model)

      await model.save(config, persistenceConfig)

      expect(onSaveSuccessSpy).toBeCalledWith({
        model,
        config,
        response,
        data: response.data,
        persistenceConfig
      })
      expect(modelSaveSuccessSpy).toBeCalledWith({
        response,
        data: response.data,
        config,
        persistenceConfig
      })
    })

    test('On save error, error callbacks are called', async () => {
      const response = 'response'
      const transport = fixtures.transport()
      jest.spyOn(transport, 'save').mockRejectedValue(response)
      const model = fixtures.model()
      const persistenceConfig = 'config'
      const config: SaveConfig = {
        insertPosition: 'end',
        addOnError: true,
        addImmediately: true
      }
      const collection = fixtures.collection(fixtures.factory(), transport)
      const collectionSaveErrorSpy = jest.spyOn(collection, 'onSaveError')
      const modelSaveErrorSpy = jest.spyOn(model, 'onSaveError')
      collection.add(model)
      const dataToSave = model.payload

      const result = await collection
        .save(model, config, persistenceConfig)
        .catch((error) => {
          expect.assertions(2)
          expect(modelSaveErrorSpy).toBeCalledWith({
            error,
            persistenceConfig,
            config,
            dataToSave
          })

          expect(collectionSaveErrorSpy).toBeCalledWith({
            model,
            error,
            config,
            persistenceConfig
          })
        })
    })
  })
})
