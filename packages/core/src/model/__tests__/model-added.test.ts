import { configure } from 'mobx'
import { fixtureFactory } from '../../__fixtures__/fixtureFactory'

configure({ enforceActions: 'always' })

const fixtures = fixtureFactory()

describe('Model - add #add #model', () => {
  describe('When the model is added to the collection', () => {
    test('Retrieve the collection from the model', () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()

      collection.add(model)

      expect(model.getCollection()).toBe(collection)
    })

    test('"onAdded" callback is executed', () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()
      // @ts-expect-error - testing protected method
      const onAddedSpy = jest.spyOn(model, 'onAdded')

      collection.add(model)

      expect(onAddedSpy).toBeCalled()
    })

    test('If the model is in another collection, it is removed from that collection', () => {
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

      expect(onRemovedSpy).toBeCalledTimes(1)
      expect(onAddedSpy).toBeCalled()
      expect(model.getCollection()).toBe(secondCollection)
    })
  })
})
