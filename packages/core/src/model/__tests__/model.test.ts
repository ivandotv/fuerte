import { configure } from 'mobx'
import { fixtureFactory } from '../../__fixtures__/fixtureFactory'
import { TestModel } from '../../__fixtures__/TestModel'

configure({ enforceActions: 'never' })

const fixtures = fixtureFactory()

beforeAll(() => {
  TestModel.identityKey = 'id'
  TestModel.setIdentityFromResponse = true
})

describe('Model #model', () => {
  describe('When the model is created', () => {
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

    test('It is not dirty', () => {
      const model = fixtures.model()
      expect(model.isDirty).toBe(false)
    })
  })

  describe('When the model destroy method is called', () => {
    test('All destroy hooks are called', () => {
      const model = fixtures.model({ foo: 'f', bar: 'b', id: '1' })
      const collection = fixtures.collection()
      collection.add(model)
      const onDestroySpy = jest.spyOn(model, 'onDestroy')
      const onRemovedSpy = jest.spyOn(model, 'onRemoved')

      model.destroy()

      expect(onDestroySpy).toHaveBeenCalledTimes(1)
      expect(onRemovedSpy).toHaveBeenCalledTimes(1)
    })

    test('Model is removed from the collection', () => {
      const model = fixtures.model({ foo: 'f', bar: 'b', id: '1' })
      const collection = fixtures.collection()
      collection.add(model)
      model.destroy()

      expect(collection.models).toHaveLength(0)
    })

    test('Model is destroyed', () => {
      const model = fixtures.model({ foo: 'f', bar: 'b', id: '1' })

      model.destroy()

      expect(model.isDestroyed).toBe(true)
    })
  })
})
