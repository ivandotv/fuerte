import { configure, runInAction } from 'mobx'
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

test('When model is saved, it is not new anymore', async () => {
  const original = TestModel.setIdentityFromResponse
  TestModel.setIdentityFromResponse = true

  const model = fixtures.model()

  const collection = fixtures.collection()
  collection.add(model)

  expect(model.isNew).toBe(true)

  await collection.save(model)

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

  await collection.save(model)

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

  await collection.save(model)

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

  await collection.save(model)

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

  await collection.save(model)

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

  await collection.save(model).catch(() => {})

  expect(model.saveError).toEqual(response)
  expect(model.hasErrors).toEqual(true)

  await collection.save(model)

  expect(model.saveError).toBeUndefined()
})
