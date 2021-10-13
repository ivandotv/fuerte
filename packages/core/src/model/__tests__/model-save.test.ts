import { configure, runInAction } from 'mobx'
import { nanoid } from 'nanoid'
import { SaveConfig } from '../../utils/types'
import { fixtureFactory } from '../../__fixtures__/fixtureFactory'
import { TestModel } from '../../__fixtures__/TestModel'

configure({ enforceActions: 'never' })

const fixtures = fixtureFactory()

describe('Model - save #save #model', () => {
  test('When the model properties change, model is dirty', () => {
    const model = fixtures.model()
    runInAction(() => {
      model.foo = 'new_value'
    })

    expect(model.isDirty).toBe(true)
  })

  test('When the model properties change, model payload property is updated', () => {
    const newFooValue = 'new foo'
    const newBarValue = 'new bar'
    const model = fixtures.model()

    model.foo = newFooValue
    model.bar = newBarValue

    expect(model.payload).toStrictEqual({
      foo: newFooValue,
      bar: newBarValue,
      id: ''
    })
  })
})

test('Saving the model, returns transport save response', async () => {
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
  const response = { data: { id: nanoid() } }
  jest.spyOn(transport, 'save').mockResolvedValue(response)

  const result = await model.save(saveConfig, transportConfig)

  expect(result).toStrictEqual({ response, error: undefined, model })
})

test('When saving is in progress, model is in the saving state', async () => {
  const model = fixtures.model()
  const collection = fixtures.collection()
  collection.add(model)

  expect(model.isSaving).toBe(false)
  const response = model.save()
  expect(model.isSaving).toBe(true)
  await response
  expect(model.isSaving).toBe(false)
})

test('When saving is in progress, models is in syncing state', async () => {
  const model = fixtures.model()
  const collection = fixtures.collection()
  collection.add(model)

  expect(model.isSyncing).toBe(false)
  const response = model.save()
  expect(model.isSyncing).toBe(true)
  await response
  expect(model.isSyncing).toBe(false)
})

test('When model is saved, it is not new anymore', async () => {
  const original = TestModel.setIdentityFromResponse
  TestModel.setIdentityFromResponse = true

  const model = fixtures.model()

  const collection = fixtures.collection()
  collection.add(model)

  expect(model.isNew).toBe(true)

  await model.save()

  // I know, static props are bad for unit testing
  TestModel.setIdentityFromResponse = original

  expect(model.isNew).toBe(false)
})

test('When saving the model fails on a new model, model is still new', async () => {
  const transport = fixtures.transport()
  const collection = fixtures.collection(fixtures.factory(), transport)
  const model = fixtures.model()
  collection.add(model)
  jest.spyOn(transport, 'save').mockImplementation(() => Promise.reject())

  expect(model.isNew).toBe(true)

  await model.save()

  expect(model.isNew).toBe(true)
})

test('When saved successfully, model property holds the last saved data', async () => {
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

test('When model is saved, it is not dirty anymore', async () => {
  const collection = fixtures.collection()
  const model = fixtures.model({ id: 'id' })
  collection.add(model)
  runInAction(() => {
    model.foo = 'new_value'
  })

  expect(model.isDirty).toBe(true)

  await model.save()

  expect(model.isDirty).toBe(false)
  expect(model.isSaving).toBe(false)
})

test('When saving the model fails, model property holds the transport error', async () => {
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

test('When trying to save, throw if model is not part of the collection', async () => {
  const model = fixtures.model()

  await expect(model.save()).rejects.toStrictEqual(
    expect.objectContaining({
      message: expect.stringMatching(/collection not present/i)
    })
  )
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
    collection.add(model)
    const collectionSaveStartSpy = jest.spyOn(collection, 'onSaveStart')
    const modelSaveStartSpy = jest.spyOn(model, 'onSaveStart')

    await model.save(config, transportConfig)

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

    collection.add(model)

    await model.save(config, transportConfig)

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
    const response = 'response'
    const transport = fixtures.transport()
    jest.spyOn(transport, 'save').mockRejectedValue(response)
    const model = fixtures.model()
    const transportConfig = 'config'
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

    const { error } = await collection.save(model, config, transportConfig)
    expect(modelSaveErrorSpy).toHaveBeenCalledWith({
      error,
      transportConfig,
      config,
      dataToSave
    })

    expect(collectionSaveErrorSpy).toHaveBeenCalledWith({
      model,
      error,
      config,
      transportConfig
    })
  })
})
