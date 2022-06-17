import { configure } from 'mobx'
import { fixtureFactory } from './__fixtures__/fixtureFactory'
import { TestModel } from './__fixtures__/TestModel'

configure({ enforceActions: 'always', reactionRequiresObservable: true })

const fixtures = fixtureFactory()

describe('Model - identity #identity #model', () => {
  test('Set model identity key', () => {
    const identityKey = 'isbn'
    class Test extends TestModel {
      static identityKey = identityKey
    }

    const model = new Test()

    expect(model.identityKey).toBe(identityKey)
  })

  test('Set identity value for the model', () => {
    const model = fixtures.model()
    const modelTwo = fixtures.model()
    const newValue = '123'

    model.setIdentity(newValue)

    expect(model.identity).toBe(newValue)
    expect(modelTwo.identity).not.toBe(newValue)
  })

  test('If not set in the configuration, do not try to extract identity value from the response', async () => {
    const newId = '123'
    class Test extends TestModel {
      static identityKey = 'id'

      static setIdentityFromResponse = false
    }
    const model = new Test()
    const transport = fixtures.transport()
    jest.spyOn(transport, 'save').mockResolvedValue({ data: { id: newId } })
    const collection = fixtures.collection(undefined, transport)
    jest.spyOn(transport, 'save').mockResolvedValue({ data: { id: newId } })
    const oldIdentityValue = model.identity

    await collection.save(model)

    expect(model.identity).toBe(oldIdentityValue)
    expect(model.identity).not.toBe(newId)
  })
})
