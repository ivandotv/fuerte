import { configure, makeObservable, observable, runInAction } from 'mobx'
import { fixtureFactory } from '../../__fixtures__/fixtureFactory'
import { TestModel } from '../../__fixtures__/TestModel'

configure({ enforceActions: 'always' })

TestModel.identityKey = 'id'
TestModel.setIdentityFromResponse = true

const fixtures = fixtureFactory()

describe('Model', () => {
  describe('Identifier', () => {
    test('Identifier is set via transport response', async () => {
      const model = fixtures.model()
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const newId = 'new id'
      jest.spyOn(transport, 'save').mockResolvedValue({ data: { id: newId } })

      // expect(model.identity).toBeUndefined()
      expect(model.isNew).toBe(true)

      await collection.save(model)

      expect(model.isNew).toBe(false)
      // expect(model.identity).toBe(newId)
    })

    test('Use custom identifier key', async () => {
      const identityKey = 'isbn'
      class Test extends TestModel {
        static identityKey = identityKey

        static setIdentityFromResponse = true

        constructor(public isbn?: string) {
          super()
          makeObservable(this, { isbn: observable })
        }
      }

      // Test.config.identityKey = identityKey
      // Test.config.setIdentityFromResponse = true

      const newId = '123'
      const transport = fixtures.transport()
      // @ts-expect-error - custom identifier key
      jest.spyOn(transport, 'save').mockResolvedValue({ data: { isbn: newId } })

      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = new Test()

      await collection.save(model)

      expect(model.identity).toBe(newId)
      expect(model.isNew).toBe(false)
    })
    test('When model props are changed, model is dirty', () => {
      const model = fixtures.model()
      runInAction(() => {
        model.foo = 'new_value'
      })

      expect(model.isDirty).toBe(true)
    })

    test('When model props change, payload is updated', () => {
      const newFooValue = 'new foo'
      const newBarValue = 'new bar'
      const model = fixtures.model()

      runInAction(() => {
        model.foo = newFooValue
      })

      expect(model.payload).toStrictEqual({
        foo: newFooValue,
        bar: model.bar,
        id: ''
      })

      runInAction(() => {
        model.bar = newBarValue
      })

      expect(model.payload).toStrictEqual({
        foo: newFooValue,
        bar: newBarValue,
        id: ''
      })
    })
  })

  describe('When model is created', () => {
    test('It is new', () => {
      const model = fixtures.model()
      expect(model.isNew).toBe(true)
    })

    test('It is not syncing', () => {
      const model = fixtures.model()
      expect(model.isSyncing).toBe(false)
    })
    test('It has no transport errors', () => {
      const model = fixtures.model()
      expect(model.hasErrors).toBe(false)
    })
    test('It is not deleted', () => {
      const model = fixtures.model()
      expect(model.isDeleted).toBe(false)
    })
    test('It is dirty', () => {
      const model = fixtures.model()
      expect(model.isDirty).toBe(true)
    })
  })

  test('Destroy the model', () => {
    const model = fixtures.model({ foo: 'f', bar: 'b', id: '1' })
    const collection = fixtures.collection()
    const onDestroySpy = jest.spyOn(model, 'onDestroy')
    const onRemovedSpy = jest.spyOn(model, 'onRemoved')

    collection.add(model)
    model.destroy()

    expect(onDestroySpy).toHaveBeenCalledTimes(1)
    expect(onRemovedSpy).toHaveBeenCalledTimes(1)
    expect(model.isDestroyed).toBe(true)
    expect(collection.models).toHaveLength(0)
  })
})
