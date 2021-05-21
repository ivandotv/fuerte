import { configure } from 'mobx'
import { fixtureFactory } from '../../__fixtures__/fixtureFactory'

configure({ enforceActions: 'always' })

const fixtures = fixtureFactory()

describe('Collection', () => {
  describe('Get by identity', () => {
    test('Get one model by identity', () => {
      const collection = fixtures.collection()
      const id = 'new-id'
      const model = fixtures.model({ foo: 'foo', bar: 'bar', id })

      collection.add(model)

      const result = collection.getByIdentity(id)

      expect(result).toBe(model)
    })

    test('Get multiple models by identity', () => {
      const collection = fixtures.collection()
      const id = 'new-id'
      const idTwo = 'new-id-2'
      const model = fixtures.model({ foo: 'foo', bar: 'bar', id })
      const modelTwo = fixtures.model({ foo: 'foo', bar: 'bar', id: idTwo })

      collection.add([model, modelTwo])

      const result = collection.getByIdentity([id, idTwo])

      expect(result).toStrictEqual([model, modelTwo])
    })

    test('When look for one model, if not present, return undefined', () => {
      const collection = fixtures.collection()
      const id = 'new-id'

      const result = collection.getByIdentity(id)

      expect(result).toBe(undefined)
    })

    test('If there are no models , return empty array', () => {
      const collection = fixtures.collection()
      const id = 'new-id'
      const idTwo = 'new-id-2'

      const result = collection.getByIdentity([id, idTwo])

      expect(result).toStrictEqual([])
    })
  })
})
