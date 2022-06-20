import { configure } from 'mobx'
import { fixtureFactory } from './__fixtures__/fixtureFactory'

configure({ enforceActions: 'always' })

const fixtures = fixtureFactory()

describe('Model - remove #remove #model', () => {
  describe('When the model is removed from the collection', () => {
    test('Model is not associated with the collection', () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model({ id: '1' })
      collection.add(model)

      collection.remove(model.identity)

      expect(collection.getById(model.identity)).toBeUndefined()
    })

    test('Destroy method is called by default', () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model({ id: '1' })
      const onDestroyedSpy = jest.spyOn(model, 'onDestroy')
      collection.add(model)
      collection.remove(model.identity, { destroy: true })

      expect(model.isDestroyed).toBe(true)
      expect(onDestroyedSpy).toHaveBeenCalledTimes(1)
    })

    test('"onRemoved" callback is called', () => {
      const collection = fixtures.collection()
      const model = fixtures.model({ id: '1' })

      // @ts-expect-error - internal callback test
      const onRemovedSpy = jest.spyOn(model, 'onRemoved')
      collection.add(model)
      collection.remove(model.identity)

      expect(onRemovedSpy).toHaveBeenCalledTimes(1)
      expect(onRemovedSpy).toHaveBeenCalledWith(collection)
    })
  })
})
