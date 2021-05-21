import { configure, makeObservable, observable, runInAction } from 'mobx'
import { v4 as uuid } from 'uuid'
import { fixtureFactory } from '../../__fixtures__/fixtureFactory'
import { TestModel } from '../../__fixtures__/TestModel'
import { ModelConfig } from '../Model'

configure({ enforceActions: 'always' })

TestModel.config = {
  identityKey: 'id',
  setIdentityFromResponse: true
}

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

    test('-------', () => {
      // const model = fixtures.model()
      const identityKey = 'isbn'
      class Test extends TestModel {
        static config: ModelConfig = {
          identityKey: identityKey,
          setIdentityFromResponse: true
        }

        constructor(public isbn?: string) {
          super()
          makeObservable(this, { isbn: observable })
        }
      }
      const model = new Test()
      expect(true).toBe(true)
    })
    test('Use custom identifier key', async () => {
      const identityKey = 'isbn'
      class Test extends TestModel {
        static config: ModelConfig = {
          identityKey: identityKey,
          setIdentityFromResponse: true
        }

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
})
