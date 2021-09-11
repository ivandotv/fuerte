import { configure } from 'mobx'
import { fixtureFactory } from '../../__fixtures__/fixtureFactory'

configure({ enforceActions: 'always' })

const fixtures = fixtureFactory()

describe('Model - remove #remove', () => {
  describe('When model is removed from the collection ', () => {
    test('Model is not associated with the collection', () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()
      collection.add(model)

      collection.remove(model)

      expect(model.getCollection()).toBeUndefined()
    })

    test('"onRemoved" hook is called', () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()
      const onRemovedSpy = jest.spyOn(model, 'onRemoved')
      collection.add(model)

      collection.remove(model)

      expect(onRemovedSpy).toHaveBeenCalledTimes(1)
    })
  })
})
