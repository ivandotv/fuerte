import { configure } from 'mobx'
import { fixtureFactory } from '../../__tests__/__fixtures__/fixtureFactory'

configure({ enforceActions: 'always' })

const fixtures = fixtureFactory()

describe('Model - add #add #model', () => {
  describe('When the model is added to the collection', () => {
    test('Retrieve the collection from the model', () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()

      collection.add(model)

      expect(model.collection).toBe(collection)
    })

    test('"onAdded" callback is executed', () => {
      const transport = fixtures.transport()
      const collection = fixtures.collection(fixtures.factory(), transport)
      const model = fixtures.model()
      const onAddedSpy = jest.spyOn(model, 'onAdded')

      collection.add(model)

      expect(onAddedSpy).toHaveBeenCalled()
    })

    test('If the model is added to another collection which is not lite, it will throw error', () => {
      const transport = fixtures.transport()
      const firstCollection = fixtures.collection(fixtures.factory(), transport)
      const secondCollection = fixtures.collection(
        fixtures.factory(),
        transport
      )
      const model = fixtures.model()
      firstCollection.add(model)

      expect(() => secondCollection.add(model)).toThrow()
    })

    test('Model can be added to multiple "lite" collections', () => {
      const transport = fixtures.transport()
      const firstCollection = fixtures.collection(fixtures.factory(), transport)
      const secondCollection = fixtures.liteCollection()
      const thirdCollection = fixtures.liteCollection()

      const model = fixtures.model()

      const onAddedSpy = jest.spyOn(model, 'onAdded')
      const onRemovedSpy = jest.spyOn(model, 'onRemoved')

      firstCollection.add(model)
      secondCollection.add(model)
      thirdCollection.add(model)

      expect(onRemovedSpy).toHaveBeenCalledTimes(0)
      expect(onAddedSpy).toHaveBeenCalledTimes(3)
      expect(model.collection).toBe(firstCollection)
    })
  })
})
