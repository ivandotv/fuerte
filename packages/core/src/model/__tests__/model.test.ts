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
})
