import { configure } from 'mobx'
import { fixtureFactory } from '../../__fixtures__/fixtureFactory'

configure({ enforceActions: 'always' })

const fixtures = fixtureFactory()

describe('Model - add to collection', () => {
  describe('When model is added to the collection ', () => {
    test('getCollection() points to current collection', () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()

      collection.add(model)

      expect(model.getCollection()).toBe(collection)
    })
    test('"onAdded" hook is called', () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()
      // @ts-expect-error - testing protected method
      const onAddedSpy = jest.spyOn(model, 'onAdded')

      collection.add(model)

      expect(onAddedSpy).toBeCalled()
    })
    test('When model is in another collection, it is removed from the previous collection', () => {
      const transport = fixtures.transport()
      const firstCollection = fixtures.collection(fixtures.factory(), transport)
      const secondCollection = fixtures.collection(
        fixtures.factory(),
        transport
      )
      const model = fixtures.model()
      firstCollection.add(model)
      // @ts-expect-error - testing protected method
      const onAddedSpy = jest.spyOn(model, 'onAdded')
      const onRemovedSpy = jest.spyOn(model, 'onRemoved')

      secondCollection.add(model)

      expect(onRemovedSpy).toBeCalledWith(firstCollection)
      expect(onAddedSpy).toBeCalled()
      expect(model.getCollection()).toBe(secondCollection)
    })
  })
})
