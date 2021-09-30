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

      expect(onAddedSpy).toHaveBeenCalled()
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

      expect(onRemovedSpy).toHaveBeenCalledTimes(1)
      expect(onAddedSpy).toHaveBeenCalled()
      expect(model.getCollection()).toBe(secondCollection)
    })

    describe('Using model "addTo" method', () => {
      test('Retrieve the collection from the model', () => {
        const transport = fixtures.transport()
        const collection = fixtures.collection(fixtures.factory(), transport)
        const model = fixtures.model()

        model.addTo(collection)

        expect(model.getCollection()).toBe(collection)
      })

      test('"onAdded" callback is executed', () => {
        const transport = fixtures.transport()
        const collection = fixtures.collection(fixtures.factory(), transport)
        const model = fixtures.model()
        // @ts-expect-error - testing protected method
        const onAddedSpy = jest.spyOn(model, 'onAdded')

        model.addTo(collection)

        expect(onAddedSpy).toHaveBeenCalled()
      })

      test('Model is added to collection', () => {
        const transport = fixtures.transport()
        const collection = fixtures.collection(fixtures.factory(), transport)
        const model = fixtures.model()

        model.addTo(collection)

        expect(collection.getById(model.cid)).toBe(model)
      })

      test('Model is added at specific index', () => {
        const transport = fixtures.transport()
        const collection = fixtures.collection(fixtures.factory(), transport)
        const model = fixtures.model()
        const index = 1
        collection.add([fixtures.model(), fixtures.model(), fixtures.model()])

        model.addTo(collection, index)

        expect(collection.models[index]).toBe(model)
      })

      test('If index is not provided model goes at the end of the collection', () => {
        const transport = fixtures.transport()
        const collection = fixtures.collection(fixtures.factory(), transport)
        const model = fixtures.model()
        collection.add([fixtures.model(), fixtures.model(), fixtures.model()])

        model.addTo(collection)

        expect(collection.models[collection.models.length - 1]).toBe(model)
      })

      test('If the model is in another collection, it is removed from that collection', () => {
        const transport = fixtures.transport()
        const firstCollection = fixtures.collection(
          fixtures.factory(),
          transport
        )
        const secondCollection = fixtures.collection(
          fixtures.factory(),
          transport
        )
        const model = fixtures.model()
        firstCollection.add(model)
        // @ts-expect-error - testing protected method
        const onAddedSpy = jest.spyOn(model, 'onAdded')
        const onRemovedSpy = jest.spyOn(model, 'onRemoved')

        model.addTo(secondCollection)

        expect(onRemovedSpy).toHaveBeenCalledTimes(1)
        expect(onAddedSpy).toHaveBeenCalled()
        expect(model.getCollection()).toBe(secondCollection)
      })
    })
  })
})
